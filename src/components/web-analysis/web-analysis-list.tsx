"use client";

import { useState } from "react";
import { WebAnalysisData, deleteWebAnalysis, reanalyzeUrl } from "@/server/actions/web-analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Globe, 
  Calendar, 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface WebAnalysisListProps {
  analyses: WebAnalysisData[];
  tenantId: string;
}

export function WebAnalysisList({ analyses, tenantId }: WebAnalysisListProps) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<WebAnalysisData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState<string | null>(null);

  const handleView = (analysis: WebAnalysisData) => {
    setSelectedAnalysis(analysis);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (analysisId: string) => {
    try {
      setIsDeleting(analysisId);
      await deleteWebAnalysis(tenantId, analysisId);
      toast.success("Analysis deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete analysis", {
        description: error.message
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReanalyze = async (analysisId: string) => {
    try {
      setIsReanalyzing(analysisId);
      toast.info("Starting re-analysis...");
      await reanalyzeUrl(tenantId, analysisId);
      toast.success("Re-analysis completed successfully");
    } catch (error: any) {
      toast.error("Re-analysis failed", {
        description: error.message
      });
    } finally {
      setIsReanalyzing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {analyses.map((analysis) => (
          <Card key={analysis.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 mb-1">
                    {getStatusIcon(analysis.status)}
                    <span className="truncate">
                      {analysis.title || getDomainFromUrl(analysis.url)}
                    </span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {getDomainFromUrl(analysis.url)}
                    </span>
                    {analysis.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(analysis.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(analysis)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(analysis.url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Original
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleReanalyze(analysis.id)}
                        disabled={isReanalyzing === analysis.id}
                      >
                        {isReanalyzing === analysis.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Re-analyze
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(analysis.id)}
                        disabled={isDeleting === analysis.id}
                        className="text-red-600"
                      >
                        {isDeleting === analysis.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysis.status === "failed" && analysis.errorMessage && (
                <div className="text-sm text-red-600 mb-2">
                  Error: {analysis.errorMessage}
                </div>
              )}
              {analysis.summary && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {analysis.summary}
                </p>
              )}
              {!analysis.summary && analysis.content && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {analysis.content}
                </p>
              )}
              {analysis.metadata && (
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Words: {analysis.metadata.wordCount || 0}</span>
                  <span>Links: {analysis.metadata.links?.length || 0}</span>
                  <span>Images: {analysis.metadata.images?.length || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          {selectedAnalysis && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedAnalysis.status)}
                  {selectedAnalysis.title || getDomainFromUrl(selectedAnalysis.url)}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{selectedAnalysis.url}</Badge>
                    {selectedAnalysis.createdAt && (
                      <span className="text-xs">
                        Analyzed {formatDistanceToNow(new Date(selectedAnalysis.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedAnalysis.summary && (
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {selectedAnalysis.summary}
                    </p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2">Content</h4>
                  <ScrollArea className="h-64 w-full border rounded p-3">
                    <div className="text-sm whitespace-pre-wrap">
                      {selectedAnalysis.content}
                    </div>
                  </ScrollArea>
                </div>
                
                {selectedAnalysis.metadata && (
                  <div>
                    <h4 className="font-semibold mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Domain: {selectedAnalysis.metadata.domain}</div>
                      <div>Word Count: {selectedAnalysis.metadata.wordCount}</div>
                      <div>Links Found: {selectedAnalysis.metadata.links?.length || 0}</div>
                      <div>Images Found: {selectedAnalysis.metadata.images?.length || 0}</div>
                      {selectedAnalysis.metadata.language && (
                        <div>Language: {selectedAnalysis.metadata.language}</div>
                      )}
                      {selectedAnalysis.metadata.author && (
                        <div>Author: {selectedAnalysis.metadata.author}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 