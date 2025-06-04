"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Upload, FileText, Eye, Edit, ExternalLink, Save, X, Trash2, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { getDocuments, updateDocument, deleteDocument } from "@/server/actions/content";
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
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Update documents state when initialDocuments changes
  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const handleUploadComplete = () => {
    console.log("🔄 Upload complete callback triggered");
    // Refresh documents after upload
    startTransition(() => {
      console.log("🔄 Starting transition to refresh documents");
      router.refresh();
    });
    
    // Separately fetch updated documents
    (async () => {
      try {
        const updatedDocuments = await getDocuments(tenantId);
        console.log("📚 Got updated documents:", updatedDocuments.length);
        setDocuments(updatedDocuments);
        console.log("✅ Documents refreshed successfully");
      } catch (error) {
        console.error("❌ Failed to refresh documents:", error);
      }
    })();
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
    setEditingDocument(doc);
    setEditedName(doc.name);
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    setIsSaving(true);
    try {
      await updateDocument(tenantId, editingDocument.id, {
        name: editedName.trim(),
      });

      toast.success("Document name updated successfully!");
      setEditingDocument(null);
      
      // Refresh documents
      const updatedDocuments = await getDocuments(tenantId);
      setDocuments(updatedDocuments);
      
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
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!doc) return;

    setIsDeleting(true);
    try {
      await deleteDocument(tenantId, doc.id);
      toast.success("Document deleted successfully!");
      setDeleteConfirmDoc(null);
      const updatedDocuments = await getDocuments(tenantId);
      setDocuments(updatedDocuments);
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error(error.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
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
                  <UploadDocumentDialog 
                    tenantId={tenantId} 
                    onUploadComplete={handleUploadComplete}
                    trigger={
                      <Button size="sm" variant="outline" className="flex-1">
                        <UploadIcon className="h-3 w-3 mr-1" />
                        Replace
                      </Button>
                    }
                  />
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