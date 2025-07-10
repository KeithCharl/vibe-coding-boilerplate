"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  Plus, 
  Eye, 
  MoreVertical, 
  Trash2, 
  Upload, 
  Download, 
  Edit3, 
  FileIcon, 
  Users, 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Move,
  FolderPlus,
  Folder,
  Copy,
  Globe,
  History,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { 
  getKnowledgeBaseDocuments, 
  deleteDocument, 
  updateDocument, 
  replaceDocument,
  getDocumentVersions,
  revertToVersion,
  type DocumentData,
  createCustomCollection,
  deleteCustomCollection,
  moveDocumentToCollection,
  getCustomCollections,
  getDocumentCollectionAssignments
} from "@/server/actions/content";
import { UploadDocumentDialog } from "./upload-document-dialog";

interface Document {
  id: string;
  name: string;
  chunks?: Array<{ id: string; content: string; chunkIndex: number }>;
  fileType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fileUrl?: string;
  version?: number;
  assignedCategory?: string; // For manual folder assignment
}

interface DocumentVersion {
  id: string;
  name: string;
  version: number | null;
  isActive: boolean | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  documents: Document[];
  keywords: string[];
  isCustom?: boolean; // Add flag for custom collections
}

interface KnowledgeBaseClientProps {
  tenantId: string;
  initialDocuments: Document[];
}

const getFileTypeDisplay = (fileType: string | undefined) => {
  if (!fileType) return { label: "Unknown", color: "bg-gray-100 text-gray-700" };
  
  const types: Record<string, { label: string; color: string }> = {
    "web-page": { label: "Web Page", color: "bg-blue-100 text-blue-700" },
    "pdf": { label: "PDF", color: "bg-red-100 text-red-700" },
    "txt": { label: "Text", color: "bg-green-100 text-green-700" },
    "docx": { label: "Word", color: "bg-blue-100 text-blue-700" },
    "md": { label: "Markdown", color: "bg-purple-100 text-purple-700" },
  };
  
  return types[fileType] || { label: fileType.toUpperCase(), color: "bg-gray-100 text-gray-700" };
};

const formatDate = (date: Date | undefined) => {
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getDocumentStatus = (doc: Document) => {
  const now = new Date();
  const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
  const updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : null;
  const version = doc.version || 1;

  // Check if document is new (created within last 24 hours)
  const isNew = createdAt && (now.getTime() - createdAt.getTime()) < (24 * 60 * 60 * 1000);
  
  // Check if document has multiple versions (indicating actual content changes)
  const hasMultipleVersions = version > 1;
  
  // Only consider "recently updated" if version > 1 AND actually updated within 7 days
  // This ensures we only highlight when content has actually changed
  const isRecentlyUpdated = hasMultipleVersions && 
    updatedAt && 
    createdAt && 
    (now.getTime() - updatedAt.getTime()) < (7 * 24 * 60 * 60 * 1000) &&
    (updatedAt.getTime() - createdAt.getTime()) > (60 * 1000); // At least 1 minute difference

  return {
    isNew,
    isRecentlyUpdated,
    hasMultipleVersions,
    version
  };
};

const getDocumentHighlight = (doc: Document) => {
  const status = getDocumentStatus(doc);
  
  if (status.isNew) {
    return {
      highlight: "ring-2 ring-green-200 bg-green-50 border-green-300",
      badge: { text: "NEW", color: "bg-green-100 text-green-700", icon: "✨" }
    };
  }
  
  if (status.hasMultipleVersions && status.isRecentlyUpdated) {
    return {
      highlight: "ring-2 ring-blue-200 bg-blue-50 border-blue-300",
      badge: { text: "UPDATED", color: "bg-blue-100 text-blue-700", icon: "🔄" }
    };
  }
  
  if (status.hasMultipleVersions) {
    return {
      highlight: "ring-1 ring-purple-200 bg-purple-50 border-purple-200",
      badge: { text: `v${status.version}`, color: "bg-purple-100 text-purple-700", icon: "📝" }
    };
  }
  
  // Removed standalone "MODIFIED" status since it was triggering on non-content changes
  
  return {
    highlight: "",
    badge: null
  };
};

const PREDEFINED_CATEGORIES: Omit<DocumentCategory, 'documents'>[] = [
  {
    id: "dora-metrics",
    name: "DORA Metrics & KPIs",
    description: "Key performance indicators, metrics frameworks, and measurement strategies for software delivery performance",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    keywords: ["dora", "metrics", "four keys", "measurement", "kpi", "performance", "delivery", "throughput", "stability"]
  },
  {
    id: "capabilities",
    name: "DevOps Capabilities",
    description: "Technical and organizational capabilities that drive software delivery and operational performance",
    icon: <Settings className="h-5 w-5" />,
    color: "bg-green-50 border-green-200 text-green-700",
    keywords: ["capabilities", "continuous", "integration", "delivery", "deployment", "testing", "monitoring", "security", "automation"]
  },
  {
    id: "annual-reports",
    name: "Annual Reports",
    description: "State of DevOps annual reports with industry trends, benchmarks, and best practices",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    keywords: ["accelerate", "state of devops", "report", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "annual"]
  },
  {
    id: "research",
    name: "Research & Studies",
    description: "Academic research, data analysis, methodology papers, and scientific studies on software engineering",
    icon: <Brain className="h-5 w-5" />,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    keywords: ["research", "study", "methodology", "analysis", "survey", "questions", "errata", "structural equation", "academic"]
  },
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    description: "AI and machine learning applications in software development, generative AI tools and practices",
    icon: <Zap className="h-5 w-5" />,
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    keywords: ["artificial intelligence", "ai", "generative ai", "machine learning", "automation", "gen ai", "fostering trust"]
  },
  {
    id: "organizational",
    name: "Culture & Leadership",
    description: "Organizational culture, leadership practices, team dynamics, and workplace transformation",
    icon: <Users className="h-5 w-5" />,
    color: "bg-rose-50 border-rose-200 text-rose-700",
    keywords: ["culture", "leadership", "organizational", "team", "transformation", "job satisfaction", "learning", "experimentation"]
  }
];

const categorizeDocuments = (documents: Document[], documentCategories: Map<string, string> = new Map(), customCollections: DocumentCategory[] = []): DocumentCategory[] => {
  // Initialize categories with empty documents arrays
  const categories: DocumentCategory[] = PREDEFINED_CATEGORIES.map(cat => ({
    ...cat,
    documents: [] as Document[]
  }));

  // Add uncategorized category
  const uncategorized: DocumentCategory = {
    id: "uncategorized",
    name: "Other Documents",
    description: "Documents that don't fit into predefined categories",
    icon: <FileIcon className="h-5 w-5" />,
    color: "bg-gray-50 border-gray-200 text-gray-700",
    keywords: [],
    documents: [] as Document[]
  };

  // Initialize custom collections with empty documents
  const customCategoriesWithEmptyDocs = customCollections.map(cat => ({
    ...cat,
    documents: [] as Document[]
  }));

  // Categorize documents
  documents.forEach(doc => {
    // Check if document has a manual category assignment
    const manualCategory = documentCategories.get(doc.id) || doc.assignedCategory;
    
    if (manualCategory) {
      // Check predefined categories first
      const predefinedCategory = categories.find(cat => cat.id === manualCategory);
      if (predefinedCategory) {
        predefinedCategory.documents.push(doc);
        return;
      }
      
      // Check custom collections
      const customCategory = customCategoriesWithEmptyDocs.find(cat => cat.id === manualCategory);
      if (customCategory) {
        customCategory.documents.push(doc);
        return;
      }
    }

    // Fallback to automatic categorization (only for predefined categories)
    const docName = doc.name.toLowerCase();
    const docType = doc.fileType?.toLowerCase() || "";
    const docText = `${docName} ${docType}`;
    
    let categorized = false;
    
    for (const category of categories) {
      const hasKeyword = category.keywords.some(keyword => 
        docText.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        category.documents.push(doc);
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      uncategorized.documents.push(doc);
    }
  });

  // Combine all categories
  const allCategories = [...categories, ...customCategoriesWithEmptyDocs];
  
  // Only include categories that have documents and uncategorized if it has documents
  const result = allCategories.filter(cat => cat.documents.length > 0);
  if (uncategorized.documents.length > 0) {
    result.push(uncategorized);
  }

  // Sort categories: custom collections first, then by document count
  return result.sort((a, b) => {
    if (a.isCustom && !b.isCustom) return -1;
    if (!a.isCustom && b.isCustom) return 1;
    return b.documents.length - a.documents.length;
  });
};

export function KnowledgeBaseClient({ tenantId, initialDocuments }: KnowledgeBaseClientProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [categories, setCategories] = useState<DocumentCategory[]>(() => categorizeDocuments(initialDocuments, new Map(), []));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(cat => cat.id))); // Start with all categories expanded
  const [isPending, setIsPending] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [movingDocument, setMovingDocument] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Custom collections state
  const [customCollections, setCustomCollections] = useState<DocumentCategory[]>([]);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  // Document categories mapping (for tracking which documents are in which collections)
  const [documentCategories, setDocumentCategories] = useState<Map<string, string>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const totalDocuments = documents.length;

  // Update documents and categories when initialDocuments changes
  useEffect(() => {
    setDocuments(initialDocuments);
    const newCategories = categorizeDocuments(initialDocuments, new Map(), []);
    setCategories(newCategories);
  }, [initialDocuments]);

  // Load custom collections and assignments on mount
  useEffect(() => {
    const loadCollectionsAndAssignments = async () => {
      console.log("🔄 Loading collections on mount for tenant:", tenantId);
      
      try {
        const [collections, assignments] = await Promise.all([
          getCustomCollections(tenantId),
          getDocumentCollectionAssignments(tenantId)
        ]);

        console.log("📦 Initial loaded collections:", collections);
        console.log("🔗 Initial loaded assignments:", assignments);

        const collectionCategories: DocumentCategory[] = collections.map(collection => ({
          id: collection.id,
          name: collection.name,
          description: collection.description || `Custom collection: ${collection.name}`,
          icon: <Folder className="h-5 w-5" />,
          color: collection.color || "bg-indigo-50 border-indigo-200 text-indigo-700",
          keywords: [],
          documents: [],
          isCustom: true
        }));

        console.log("🎯 Initial setting collection categories:", collectionCategories);
        setCustomCollections(collectionCategories);
        setDocumentCategories(assignments.assignmentMap);
        
        // Recategorize documents with the loaded data
        const newCategorizedDocuments = categorizeDocuments(documents, assignments.assignmentMap, collectionCategories);
        console.log("📂 Initial recategorized documents:", newCategorizedDocuments);
        setCategories(newCategorizedDocuments);
      } catch (error) {
        console.error("❌ Failed to load collections:", error);
      }
    };

    loadCollectionsAndAssignments();
  }, [tenantId]); // Only depend on tenantId to avoid infinite loops

  // Separate effect to recategorize documents when they change
  useEffect(() => {
    if (customCollections.length > 0 || documentCategories.size > 0) {
      const newCategorizedDocuments = categorizeDocuments(documents, documentCategories, customCollections);
      setCategories(newCategorizedDocuments);
    }
  }, [documents, customCollections, documentCategories]);

  const refreshDocuments = async () => {
    try {
      setIsPending(true);
      const updatedDocuments = await getKnowledgeBaseDocuments(tenantId);
      setDocuments(updatedDocuments);
      const newCategories = categorizeDocuments(updatedDocuments, documentCategories, customCollections);
      setCategories(newCategories);
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    } finally {
      setIsPending(false);
    }
  };

  const handleUploadComplete = () => {
    refreshDocuments();
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      console.log("No file URL available for document:", doc.name);
      toast.error("Document preview not available");
    }
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocument(doc);
    setEditedName(doc.name);
    setEditedContent(doc.chunks?.[0]?.content || "");
    setEditedSummary("");
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    setIsSaving(true);
    try {
      await updateDocument(tenantId, editingDocument.id, {
        name: editedName.trim(),
        content: editedContent,
        summary: editedSummary
      });
      toast.success("Document updated successfully!");
      setEditingDocument(null);
      refreshDocuments();
    } catch (error: any) {
      console.error("Error updating document:", error);
      toast.error(error.message || "Failed to update document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
    setEditedName("");
    setEditedContent("");
    setEditedSummary("");
  };

  const handleDeleteDocument = async (doc: Document) => {
    try {
      setIsPending(true);
      await deleteDocument(tenantId, doc.id);
      toast.success("Document deleted successfully!");
      refreshDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error(error.message || "Failed to delete document");
    } finally {
      setIsPending(false);
    }
  };

  const handleReplaceDocument = (doc: Document) => {
    setSelectedDocument(doc);
    fileInputRef.current?.click();
  };

  const handleFileReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocument) return;

    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      await replaceDocument(tenantId, selectedDocument.id, formData);
      toast.success("Document replaced successfully!");
      refreshDocuments();
    } catch (error: any) {
      console.error("Error replacing document:", error);
      toast.error(error.message || "Failed to replace document");
    } finally {
      setIsReplacing(false);
      setSelectedDocument(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleViewVersionHistory = async (doc: Document) => {
    try {
      const docVersions = await getDocumentVersions(tenantId, doc.name);
      setVersions(docVersions);
      setVersionHistoryDoc(doc);
    } catch (error: any) {
      console.error("Error fetching version history:", error);
      toast.error(error.message || "Failed to fetch version history");
    }
  };

  const handleRevertToVersion = async (version: number) => {
    if (!versionHistoryDoc) return;

    setIsReverting(true);
    try {
      await revertToVersion(tenantId, versionHistoryDoc.name, version);
      toast.success(`Document reverted to version ${version} successfully!`);
      setVersionHistoryDoc(null);
      setVersions([]);
      refreshDocuments();
    } catch (error: any) {
      console.error("Error reverting document:", error);
      toast.error(error.message || "Failed to revert document");
    } finally {
      setIsReverting(false);
    }
  };

  const handleMoveDocument = (doc: Document) => {
    setMovingDocument(doc);
    setSelectedCategory("");
  };

  const handleMoveDocumentToCategory = async () => {
    if (!movingDocument || !selectedCategory) return;

    try {
      setIsPending(true);
      await moveDocumentToCollection(tenantId, movingDocument.id, selectedCategory === "uncategorized" ? null : selectedCategory);
      
      // Update local state
      const newCategories = new Map(documentCategories);
      if (selectedCategory === "uncategorized") {
        newCategories.delete(movingDocument.id);
      } else {
        newCategories.set(movingDocument.id, selectedCategory);
      }
      setDocumentCategories(newCategories);
      
      // Recategorize documents
      const newCategorizedDocuments = categorizeDocuments(documents, newCategories, customCollections);
      setCategories(newCategorizedDocuments);
      
      toast.success("Document moved successfully!");
      setMovingDocument(null);
      setSelectedCategory("");
    } catch (error: any) {
      console.error("Error moving document:", error);
      toast.error(error.message || "Failed to move document");
    } finally {
      setIsPending(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // New handlers for custom collections
  const handleCreateCollection = async () => {
    console.log("🎯 handleCreateCollection function called");
    
    if (!newCollectionName.trim()) {
      toast.error("Collection name is required");
      return;
    }

    console.log("🔄 Creating collection:", newCollectionName.trim());

    try {
      const result = await createCustomCollection(tenantId, newCollectionName.trim(), newCollectionDescription.trim());
      console.log("✅ Collection created result:", result);
      
      if (result.success) {
        console.log("✅ Collection created successfully:", result.collection);
        
        // Close dialog first
        setShowCreateCollection(false);
        setNewCollectionName("");
        setNewCollectionDescription("");
        
        // Show success message
        toast.success(`Collection "${newCollectionName}" created successfully!`);
        
        // Force reload all data to ensure consistency
        console.log("🔄 Force reloading all collections...");
        
        try {
          const [collections, assignments] = await Promise.all([
            getCustomCollections(tenantId),
            getDocumentCollectionAssignments(tenantId)
          ]);

          console.log("📦 Reloaded collections:", collections);
          console.log("🔗 Reloaded assignments:", assignments);

          const collectionCategories: DocumentCategory[] = collections.map(collection => ({
            id: collection.id,
            name: collection.name,
            description: collection.description || `Custom collection: ${collection.name}`,
            icon: <Folder className="h-5 w-5" />,
            color: collection.color || "bg-indigo-50 border-indigo-200 text-indigo-700",
            keywords: [],
            documents: [],
            isCustom: true
          }));

          setCustomCollections(collectionCategories);
          setDocumentCategories(assignments.assignmentMap);
          
          // Recategorize documents with the updated data
          const newCategorizedDocuments = categorizeDocuments(documents, assignments.assignmentMap, collectionCategories);
          console.log("📂 Final recategorized documents:", newCategorizedDocuments);
          setCategories(newCategorizedDocuments);
          
          // Expand the new collection
          setExpandedCategories(prev => new Set([...prev, result.collection.id]));
          
        } catch (reloadError) {
          console.error("❌ Error reloading collections:", reloadError);
          toast.error("Collection created but failed to refresh view. Please reload the page.");
        }
      } else {
        console.error("❌ Collection creation returned success: false");
        toast.error("Failed to create collection");
      }
    } catch (error: any) {
      console.error("❌ Error creating custom collection:", error);
      toast.error(error.message || "Failed to create collection");
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    const collection = customCollections.find(c => c.id === collectionId);
    if (!collection) return;

    try {
      // Move documents back to uncategorized
      collection.documents.forEach(doc => {
        const newCategories = new Map(documentCategories);
        newCategories.delete(doc.id);
        setDocumentCategories(newCategories);
      });

      // Remove collection
      setCustomCollections(prev => prev.filter(c => c.id !== collectionId));
      setCategories(prev => prev.filter(c => c.id !== collectionId));
      setExpandedCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionId);
        return newSet;
      });

      // Recategorize documents
      const remainingCustomCollections = customCollections.filter(c => c.id !== collectionId);
      const newCategorizedDocuments = categorizeDocuments(documents, documentCategories, remainingCustomCollections);
      setCategories(newCategorizedDocuments);

      await deleteCustomCollection(tenantId, collectionId);
      toast.success(`Collection "${collection.name}" deleted successfully!`);
    } catch (error: any) {
      console.error("Error deleting custom collection:", error);
      toast.error(error.message || "Failed to delete collection");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Hidden file input for replace functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={handleFileReplace}
      />

      {/* Professional Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
              <p className="text-gray-600">
                Organized knowledge repository with {documents.length} document{documents.length !== 1 ? 's' : ''} across {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="font-medium">Document Status:</span>
                <div className="flex items-center gap-1">
                  <span>✨</span>
                  <span>New (24h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🔄</span>
                  <span>Recently Updated</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📝</span>
                  <span>Has Versions</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log("🔘 New Collection button clicked");
                  setShowCreateCollection(true);
                  console.log("🔘 Dialog should be opening...");
                }}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
              <UploadDocumentDialog 
                tenantId={tenantId} 
                onUploadComplete={handleUploadComplete}
                trigger={
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {isPending && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm font-medium">Updating document library...</p>
          </div>
        )}

        {isReplacing && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-700 text-sm font-medium">Replacing document...</p>
          </div>
        )}

        {/* Categories Display */}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-6">
                Start building your knowledge base by uploading your first document.
              </p>
              <UploadDocumentDialog 
                tenantId={tenantId} 
                onUploadComplete={handleUploadComplete}
                trigger={
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload First Document
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <Card key={category.id} className="bg-white shadow-sm border border-gray-200">
                <CardHeader 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${category.color}`}>
                        {category.icon}
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {category.name}
                          <Badge variant="secondary" className="text-xs">
                            {category.documents.length}
                          </Badge>
                          {category.documents.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Click to {expandedCategories.has(category.id) ? 'collapse' : 'expand'}
                            </Badge>
                          )}
                          {category.isCustom && (
                            <Badge className="text-xs bg-indigo-100 text-indigo-700">
                              Custom
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {category.isCustom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCollection(category.id);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {expandedCategories.has(category.id) && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {category.documents.map((doc) => {
                        const fileTypeDisplay = getFileTypeDisplay(doc.fileType);
                        const highlight = getDocumentHighlight(doc);
                        return (
                          <div key={doc.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${highlight.highlight || 'border-gray-100'}`}>
                            <div className="flex items-center gap-4 flex-1">
                              <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                {doc.fileType === "web-page" ? (
                                  <Globe className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <FileIcon className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                                  {doc.name}
                                  {highlight.badge && (
                                    <Badge className={`${highlight.badge.color} text-xs flex items-center gap-1`}>
                                      <span>{highlight.badge.icon}</span>
                                      {highlight.badge.text}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                  <Badge className={`${fileTypeDisplay.color} text-xs`}>
                                    {fileTypeDisplay.label}
                                  </Badge>
                                  <span>
                                    {doc.chunks?.length || 0} chunk{(doc.chunks?.length || 0) !== 1 ? 's' : ''}
                                  </span>
                                  <span>v{doc.version || 1}</span>
                                  <span>{formatDate(doc.createdAt)}</span>
                                </div>
                                {doc.fileType === "web-page" && doc.fileUrl && (
                                  <div className="text-xs text-blue-600 truncate mt-1">
                                    {doc.fileUrl}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Enhanced Document Actions Menu */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-gray-200 hover:bg-gray-50"
                                  >
                                    <Settings className="h-4 w-4 mr-1" />
                                    Actions
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                                    Document Management
                                  </div>
                                  <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Rename Document
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMoveDocument(doc)}>
                                    <Move className="h-4 w-4 mr-2" />
                                    Move to Collection
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                                    File Operations
                                  </div>
                                  <DropdownMenuItem onClick={() => handleReplaceDocument(doc)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Replace File
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewVersionHistory(doc)}>
                                    <History className="h-4 w-4 mr-2" />
                                    Version History
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Document
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Create Custom Collection Dialog */}
      <Dialog open={showCreateCollection} onOpenChange={setShowCreateCollection}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Create a custom collection to organize your documents logically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Collection Name</Label>
              <Input
                id="collection-name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Project Alpha, Research Papers, Training Materials"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description (Optional)</Label>
              <Textarea
                id="collection-description"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Brief description of what this collection contains..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateCollection(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                console.log("🧪 DIRECT TEST: Testing server action...");
                try {
                  const result = await createCustomCollection(tenantId, "Direct Test Collection", "Testing server action directly");
                  console.log("✅ DIRECT TEST SUCCESS:", result);
                  toast.success("Direct test worked!");
                } catch (error) {
                  console.error("❌ DIRECT TEST FAILED:", error);
                  toast.error("Direct test failed: " + error.message);
                }
              }}
              variant="outline"
              className="bg-green-100 hover:bg-green-200 text-green-800"
            >
              🧪 Test Server
            </Button>
            <Button 
              onClick={() => {
                console.log("🔘 Create Collection button clicked");
                console.log("🔘 Collection name:", newCollectionName);
                console.log("🔘 Collection description:", newCollectionDescription);
                handleCreateCollection();
              }} 
              disabled={!newCollectionName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Document Dialog */}
      <Dialog open={!!movingDocument} onOpenChange={() => setMovingDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Document to Collection</DialogTitle>
            <DialogDescription>
              Choose which collection to move "{movingDocument?.name}" to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-select">Select Collection</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a collection..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                    Predefined Collections
                  </div>
                  {PREDEFINED_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.icon}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                  {customCollections.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-t">
                        Custom Collections
                      </div>
                      {customCollections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          <div className="flex items-center gap-2">
                            {collection.icon}
                            {collection.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-t">
                    Other
                  </div>
                  <SelectItem value="uncategorized">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4" />
                      Other Documents
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setMovingDocument(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveDocumentToCategory} disabled={!selectedCategory}>
              <Move className="h-4 w-4 mr-2" />
              Move Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Update the display name for this document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Document Name</Label>
              <Input
                id="edit-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter document name..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument} disabled={isSaving || !editedName.trim()}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!versionHistoryDoc} onOpenChange={() => setVersionHistoryDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and manage versions of "{versionHistoryDoc?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {versions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No version history found</p>
              </div>
            ) : (
              versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">Version {version.version}</span>
                      {version.isActive && (
                        <Badge className="bg-green-100 text-green-800">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {version.fileType} • {version.fileSize ? `${(version.fileSize / 1024).toFixed(1)}KB` : 'Unknown size'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {version.createdAt ? formatDate(version.createdAt) : 'Unknown date'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {version.fileUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => version.fileUrl && window.open(version.fileUrl, '_blank')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                    {!version.isActive && version.version && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevertToVersion(version.version!)}
                        disabled={isReverting}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {isReverting ? "Reverting..." : "Revert"}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setVersionHistoryDoc(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!movingDocument} onOpenChange={() => setMovingDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Document to Collection</DialogTitle>
            <DialogDescription>
              Choose which collection to move "{movingDocument?.name}" to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-select">Select Collection</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a collection..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b">
                    Predefined Collections
                  </div>
                  {PREDEFINED_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.icon}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                  {customCollections.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-t">
                        Custom Collections
                      </div>
                      {customCollections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          <div className="flex items-center gap-2">
                            {collection.icon}
                            {collection.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-b border-t">
                    Other
                  </div>
                  <SelectItem value="uncategorized">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4" />
                      Other Documents
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setMovingDocument(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveDocumentToCategory} disabled={!selectedCategory}>
              <Move className="h-4 w-4 mr-2" />
              Move Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 