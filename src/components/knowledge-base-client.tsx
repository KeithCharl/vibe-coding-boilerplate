"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Upload, FileText, Eye, Edit, ExternalLink, Save, X, Trash2, UploadIcon, History, RotateCcw } from "lucide-react";
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
  fileUrl?: string;
  version?: number;
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

interface KnowledgeBaseClientProps {
  tenantId: string;
  initialDocuments: Document[];
}

export function KnowledgeBaseClient({ tenantId, initialDocuments }: KnowledgeBaseClientProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Update documents state when initialDocuments changes
  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const refreshDocuments = async () => {
    try {
      const updatedDocuments = await getDocuments(tenantId);
      console.log("📚 Got updated documents:", updatedDocuments.length);
      setDocuments(updatedDocuments);
      console.log("✅ Documents refreshed successfully");
    } catch (error) {
      console.error("❌ Failed to refresh documents:", error);
    }
  };

  const handleUploadComplete = () => {
    console.log("🔄 Upload complete callback triggered");
    // Refresh documents after upload
    startTransition(() => {
      console.log("🔄 Starting transition to refresh documents");
      router.refresh();
    });
    
    // Separately fetch updated documents
    refreshDocuments();
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.fileUrl) {
      // Open the original file in a new tab
      window.open(doc.fileUrl, '_blank');
    } else {
      // If no file URL, we could show a modal with the text content
      console.log("No file URL available for document:", doc.name);
    }
  };

  const handleEditDocument = (doc: Document) => {
    console.log("📝 Starting rename for document:", doc.name);
    setEditingDocument(doc);
    setEditedName(doc.name);
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    console.log("💾 Saving renamed document:", editingDocument.name, "→", editedName.trim());
    setIsSaving(true);
    try {
      await renameDocument(tenantId, editingDocument.id, editedName.trim());

      toast.success("Document renamed successfully!");
      setEditingDocument(null);
      
      // Refresh documents
      await refreshDocuments();
      
    } catch (error: any) {
      console.error("Error renaming document:", error);
      toast.error(error.message || "Failed to rename document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    console.log("❌ Cancelled rename operation");
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
    console.log("🔄 Starting replace for document:", doc.name);
    setReplaceDoc(doc);
    // Trigger file input
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replaceDoc) {
      console.log("❌ No file or replaceDoc in handleFileReplace");
      return;
    }

    console.log("🔄 Processing file replacement:", file.name);
    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", replaceDoc.name);

      console.log("📤 Calling replaceDocument server action...");
      const result = await replaceDocument(tenantId, replaceDoc.id, formData);
      console.log("✅ Replace result:", result);
      
      toast.success(`Document replaced successfully! New version created.`);
      setReplaceDoc(null);
      
      // Refresh documents
      await refreshDocuments();
      
    } catch (error: any) {
      console.error("Error replacing document:", error);
      toast.error(error.message || "Failed to replace document");
    } finally {
      setIsReplacing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleViewVersionHistory = async (doc: Document) => {
    console.log("📚 Getting version history for:", doc.name);
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

    console.log(`🔄 Reverting ${versionHistoryDoc.name} to version ${version}`);
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

  return (
    <div className="p-6 space-y-6">
      {/* Hidden file input for replace functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={handleFileReplace}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage documents and content for your AI assistant
          </p>
        </div>
        <UploadDocumentDialog 
          tenantId={tenantId} 
          onUploadComplete={handleUploadComplete} 
        />
      </div>

      {isPending && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Updating documents...</p>
        </div>
      )}

      {isReplacing && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Replacing document...</p>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-6">
            Upload your first document to get started with AI-powered search
          </p>
          <UploadDocumentDialog 
            tenantId={tenantId} 
            onUploadComplete={handleUploadComplete}
            trigger={
              <Button size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  {doc.name}
                </CardTitle>
                <CardDescription>
                  {doc.chunks?.length || 0} chunks • {doc.fileType || 'Unknown type'}
                  {doc.version && ` • v${doc.version}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Uploaded {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown date'}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleEditDocument(doc)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Rename
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleReplaceDocument(doc)}
                    disabled={isReplacing}
                  >
                    <UploadIcon className="h-3 w-3 mr-1" />
                    Replace
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleViewVersionHistory(doc)}
                  >
                    <History className="h-3 w-3 mr-1" />
                    Versions
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirmDoc(doc)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Edit Document Dialog - Name Only */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Change the display name for your document.
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
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveDocument} disabled={isSaving || !editedName.trim()}>
              <Save className="h-4 w-4 mr-2" />
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
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading version history...</p>
              </div>
            ) : documentVersions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No version history found</p>
              </div>
            ) : (
              documentVersions.map((version) => (
                <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {version.version}</span>
                      {version.isActive && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {version.fileType} • {version.fileSize ? `${(version.fileSize / 1024).toFixed(1)}KB` : 'Unknown size'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {version.createdAt ? new Date(version.createdAt).toLocaleString() : 'Unknown date'}
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
              <X className="h-4 w-4 mr-2" />
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
              Are you sure you want to delete "{deleteConfirmDoc?.name}"? This action cannot be undone.
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