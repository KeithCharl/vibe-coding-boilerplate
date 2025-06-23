"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Eye, 
  Edit, 
  ExternalLink, 
  Save, 
  X, 
  Trash2, 
  UploadIcon, 
  History, 
  RotateCcw, 
  Globe,
  MoreHorizontal,
  Download,
  Calendar,
  FileIcon,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Brain,
  Settings,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { getDocuments, renameDocument, replaceDocument, deleteDocument, getDocumentVersions, revertDocumentVersion } from "@/server/actions/content";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

const categorizeDocuments = (documents: Document[], documentCategories: Map<string, string> = new Map()): DocumentCategory[] => {
  // Initialize categories with empty documents arrays
  const categories: DocumentCategory[] = PREDEFINED_CATEGORIES.map(cat => ({
    ...cat,
    documents: []
  }));

  // Add uncategorized category
  const uncategorized: DocumentCategory = {
    id: "uncategorized",
    name: "Other Documents",
    description: "Documents that don't fit into predefined categories",
    icon: <FileIcon className="h-5 w-5" />,
    color: "bg-gray-50 border-gray-200 text-gray-700",
    keywords: [],
    documents: []
  };

  // Categorize documents
  documents.forEach(doc => {
    // Check if document has a manual category assignment
    const manualCategory = documentCategories.get(doc.id) || doc.assignedCategory;
    
    if (manualCategory) {
      const category = categories.find(cat => cat.id === manualCategory);
      if (category) {
        category.documents.push(doc);
        return;
      }
    }

    // Fallback to automatic categorization
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

  // Only include categories that have documents and uncategorized if it has documents
  const result = categories.filter(cat => cat.documents.length > 0);
  if (uncategorized.documents.length > 0) {
    result.push(uncategorized);
  }

  // Sort categories by document count (descending)
  return result.sort((a, b) => b.documents.length - a.documents.length);
};

export function KnowledgeBaseClient({ tenantId, initialDocuments }: KnowledgeBaseClientProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [documentCategories, setDocumentCategories] = useState<Map<string, string>>(new Map());
  const [categories, setCategories] = useState<DocumentCategory[]>(() => categorizeDocuments(initialDocuments));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(cat => cat.id))); // Start with all categories expanded
  const [isPending, startTransition] = useTransition();
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<Document | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<Document | null>(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [movingDocument, setMovingDocument] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Update documents and categories when initialDocuments changes
  useEffect(() => {
    setDocuments(initialDocuments);
    const newCategories = categorizeDocuments(initialDocuments, documentCategories);
    setCategories(newCategories);
  }, [initialDocuments, documentCategories]);

  const refreshDocuments = async () => {
    try {
      const updatedDocuments = await getDocuments(tenantId);
      setDocuments(updatedDocuments);
      setCategories(categorizeDocuments(updatedDocuments, documentCategories));
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  };

  const handleUploadComplete = () => {
    startTransition(() => {
      router.refresh();
    });
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
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    setIsSaving(true);
    try {
      await renameDocument(tenantId, editingDocument.id, editedName.trim());
      toast.success("Document renamed successfully!");
      setEditingDocument(null);
      await refreshDocuments();
    } catch (error: any) {
      console.error("Error renaming document:", error);
      toast.error(error.message || "Failed to rename document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
    setEditedName("");
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!doc) return;

    setIsDeleting(true);
    try {
      await deleteDocument(tenantId, doc.id);
      toast.success("Document deleted successfully!");
      setDeleteConfirmDoc(null);
      await refreshDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error(error.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplaceDocument = (doc: Document) => {
    setReplaceDoc(doc);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replaceDoc) return;

    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", replaceDoc.name);

      await replaceDocument(tenantId, replaceDoc.id, formData);
      toast.success(`Document replaced successfully! New version created.`);
      setReplaceDoc(null);
      await refreshDocuments();
    } catch (error: any) {
      console.error("Error replacing document:", error);
      toast.error(error.message || "Failed to replace document");
    } finally {
      setIsReplacing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleViewVersionHistory = async (doc: Document) => {
    setVersionHistoryDoc(doc);
    setIsLoadingVersions(true);
    try {
      const versions = await getDocumentVersions(tenantId, doc.name);
      setDocumentVersions(versions);
    } catch (error: any) {
      console.error("Error getting document versions:", error);
      toast.error(error.message || "Failed to load version history");
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRevertToVersion = async (version: number) => {
    if (!versionHistoryDoc) return;

    setIsReverting(true);
    try {
      await revertDocumentVersion(tenantId, versionHistoryDoc.name, version);
      toast.success(`Document reverted to version ${version} successfully!`);
      setVersionHistoryDoc(null);
      await refreshDocuments();
    } catch (error: any) {
      console.error("Error reverting document:", error);
      toast.error(error.message || "Failed to revert document");
    } finally {
      setIsReverting(false);
    }
  };

  const handleMoveDocument = (doc: Document) => {
    setMovingDocument(doc);
    // Set current category as default
    const currentCategory = categories.find(cat => 
      cat.documents.some(d => d.id === doc.id)
    )?.id || "";
    setSelectedCategory(currentCategory);
  };

  const handleMoveDocumentToCategory = () => {
    if (!movingDocument || !selectedCategory) return;

    // Update the document categories mapping
    const newCategories = new Map(documentCategories);
    newCategories.set(movingDocument.id, selectedCategory);
    setDocumentCategories(newCategories);

    // Recategorize documents
    const newCategorizedDocuments = categorizeDocuments(documents, newCategories);
    setCategories(newCategorizedDocuments);

    // Expand the target category
    setExpandedCategories(prev => new Set([...prev, selectedCategory]));

    toast.success(`Document moved to ${PREDEFINED_CATEGORIES.find(cat => cat.id === selectedCategory)?.name || selectedCategory} successfully!`);
    setMovingDocument(null);
    setSelectedCategory("");
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

  const totalDocuments = documents.length;

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
                Organized knowledge repository with {totalDocuments} document{totalDocuments !== 1 ? 's' : ''} across {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
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

        {totalDocuments === 0 ? (
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="text-center py-16">
              <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Upload your first document to get started with AI-powered search and analysis
              </p>
              <UploadDocumentDialog 
                tenantId={tenantId} 
                onUploadComplete={handleUploadComplete}
                trigger={
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Your First Document
                  </Button>
                }
              />
            </CardContent>
          </Card>
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
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                  title="Document actions: View, Rename, Replace, Delete, Version History"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Document
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMoveDocument(doc)}>
                                  <Move className="h-4 w-4 mr-2" />
                                  Move to Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleReplaceDocument(doc)}>
                                  <UploadIcon className="h-4 w-4 mr-2" />
                                  Replace File
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewVersionHistory(doc)}>
                                  <History className="h-4 w-4 mr-2" />
                                  Version History
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteConfirmDoc(doc)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      
      {/* Move Document Dialog */}
      <Dialog open={!!movingDocument} onOpenChange={() => setMovingDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Document to Folder</DialogTitle>
            <DialogDescription>
              Choose which folder to move "{movingDocument?.name}" to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-select">Select Folder</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.icon}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
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
            {isLoadingVersions ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading version history...</p>
              </div>
            ) : documentVersions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No version history found</p>
              </div>
            ) : (
              documentVersions.map((version) => (
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
      <Dialog open={!!deleteConfirmDoc} onOpenChange={() => setDeleteConfirmDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmDoc?.name}"? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmDoc(null)} 
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmDoc && handleDeleteDocument(deleteConfirmDoc)} 
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 