"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";

interface Document {
  id: string;
  name: string;
  chunks?: Array<{ id: string; content: string; chunkIndex: number }>;
  fileType?: string;
  createdAt?: Date;
}

interface KnowledgeBaseClientProps {
  tenantId: string;
  initialDocuments: Document[];
}

export function KnowledgeBaseClient({ tenantId, initialDocuments }: KnowledgeBaseClientProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUploadComplete = () => {
    // Use Next.js router refresh to get updated data
    startTransition(() => {
      router.refresh();
    });
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

      {initialDocuments.length === 0 ? (
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
          {initialDocuments.map((doc) => (
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
                  <Button size="sm" variant="outline" className="flex-1">
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 