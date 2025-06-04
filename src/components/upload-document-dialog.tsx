"use client";

import { useState } from "react";
import { uploadDocument } from "@/server/actions/content";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UploadDocumentDialogProps {
  tenantId: string;
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
}

export function UploadDocumentDialog({ 
  tenantId, 
  onUploadComplete,
  trigger 
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      // Check file type
      const allowedTypes = [
        'text/plain', 
        'text/markdown', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf|doc|docx)$/i)) {
        toast.error("Unsupported file type. Please upload TXT, MD, PDF, DOC, or DOCX files.");
        return;
      }

      setSelectedFile(file);
      if (!documentName) {
        // Set document name from filename without extension
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setDocumentName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!documentName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    console.log("🔄 Starting upload process...");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", documentName.trim());

      console.log("📤 Calling uploadDocument server action...");
      const result = await uploadDocument(tenantId, formData);
      console.log("📥 Upload result:", result);
      
      if (result.success) {
        console.log("✅ Upload successful, closing dialog...");
        toast.success("Document uploaded successfully!");
        setOpen(false);
        setSelectedFile(null);
        setDocumentName("");
        console.log("📞 Calling onUploadComplete...");
        onUploadComplete?.();
        console.log("🎯 Upload flow completed");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      const errorMessage = error.message || "Failed to upload document. Please try again.";
      toast.error(errorMessage);
    } finally {
      console.log("🏁 Setting isUploading to false");
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setSelectedFile(null);
    setDocumentName("");
  };

  const removeFile = () => {
    setSelectedFile(null);
    setDocumentName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to add to your knowledge base. Supported formats: TXT, MD, PDF, DOC, DOCX (max 10MB).
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="file"
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:text-xs file:bg-muted file:text-muted-foreground"
                required
              />
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                <FileText className="h-4 w-4" />
                <span className="flex-1">{selectedFile.name}</span>
                <span className="text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Document Name</Label>
            <Input
              id="name"
              placeholder="Enter document name..."
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUploading || !selectedFile || !documentName.trim()}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 