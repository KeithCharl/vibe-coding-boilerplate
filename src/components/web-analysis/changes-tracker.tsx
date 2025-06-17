"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus,
  Edit,
  Eye,
  Calendar,
  BarChart3,
  ExternalLink,
  Diff
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getRecentChanges, getDocumentChanges } from "@/server/actions/enhanced-web-scraping";

interface Change {
  id: string;
  changeType: string;
  changePercentage: number | null;
  changeSummary: string | null;
  detectedAt: Date | null;
  documentUrl: string | null;
  documentTitle: string | null;
  oldContent?: string | null;
  newContent?: string | null;
}

interface ChangesTrackerProps {
  tenantId: string;
  changes: Change[];
}

export function ChangesTracker({ tenantId, changes: initialChanges }: ChangesTrackerProps) {
  const [changes, setChanges] = useState<Change[]>(initialChanges);
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewDetails = async (change: Change) => {
    setSelectedChange(change);
    setIsDialogOpen(true);
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'deleted':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'title_changed':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'content_changed':
        return <Diff className="h-4 w-4 text-purple-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeBadge = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <Badge className="bg-green-500">Created</Badge>;
      case 'updated':
        return <Badge className="bg-blue-500">Updated</Badge>;
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>;
      case 'title_changed':
        return <Badge className="bg-orange-500">Title Changed</Badge>;
      case 'content_changed':
        return <Badge className="bg-purple-500">Content Changed</Badge>;
      default:
        return <Badge variant="outline">Modified</Badge>;
    }
  };

  const getChangePercentageBadge = (percentage: number | null) => {
    if (!percentage || percentage === 0) return null;

    if (percentage > 50) {
      return <Badge variant="destructive">Major ({percentage.toFixed(1)}%)</Badge>;
    } else if (percentage > 20) {
      return <Badge className="bg-orange-500">Moderate ({percentage.toFixed(1)}%)</Badge>;
    } else if (percentage > 5) {
      return <Badge className="bg-yellow-500">Minor ({percentage.toFixed(1)}%)</Badge>;
    } else {
      return <Badge variant="outline">Minimal ({percentage.toFixed(1)}%)</Badge>;
    }
  };

  const renderContentDiff = (oldContent: string | null, newContent: string | null) => {
    if (!oldContent || !newContent) {
      return (
        <div className="space-y-4">
          {oldContent && (
            <div>
              <h4 className="font-semibold mb-2 text-red-600">Removed Content</h4>
              <ScrollArea className="h-64 w-full border rounded p-3 bg-red-50">
                <div className="text-sm whitespace-pre-wrap">{oldContent}</div>
              </ScrollArea>
            </div>
          )}
          {newContent && (
            <div>
              <h4 className="font-semibold mb-2 text-green-600">Added Content</h4>
              <ScrollArea className="h-64 w-full border rounded p-3 bg-green-50">
                <div className="text-sm whitespace-pre-wrap">{newContent}</div>
              </ScrollArea>
            </div>
          )}
        </div>
      );
    }

    // Simple diff visualization - in production, use a proper diff library
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2 text-red-600">Previous Version</h4>
          <ScrollArea className="h-64 w-full border rounded p-3">
            <div className="text-sm whitespace-pre-wrap font-mono">
              {oldLines.map((line, index) => (
                <div key={index} className="hover:bg-red-50 px-1">
                  <span className="text-gray-400 mr-2">{index + 1}</span>
                  {line}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-green-600">Current Version</h4>
          <ScrollArea className="h-64 w-full border rounded p-3">
            <div className="text-sm whitespace-pre-wrap font-mono">
              {newLines.map((line, index) => (
                <div key={index} className="hover:bg-green-50 px-1">
                  <span className="text-gray-400 mr-2">{index + 1}</span>
                  {line}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const getChangesStats = () => {
    const stats = {
      total: changes.length,
      created: changes.filter(c => c.changeType === 'created').length,
      updated: changes.filter(c => c.changeType === 'updated').length,
      deleted: changes.filter(c => c.changeType === 'deleted').length,
      major: changes.filter(c => c.changePercentage && c.changePercentage > 50).length,
      moderate: changes.filter(c => c.changePercentage && c.changePercentage > 20 && c.changePercentage <= 50).length,
      minor: changes.filter(c => c.changePercentage && c.changePercentage > 5 && c.changePercentage <= 20).length,
    };

    return stats;
  };

  const stats = getChangesStats();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Content Changes</h3>
        <p className="text-sm text-muted-foreground">
          Track all content changes across your scraped websites
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Changes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.created}</div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.updated}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.major}</div>
                <div className="text-xs text-muted-foreground">Major Changes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Changes List */}
      <div className="space-y-4">
        {changes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No changes detected</h3>
              <p className="text-muted-foreground">
                Content changes will appear here when your scraping jobs detect updates
              </p>
            </CardContent>
          </Card>
        ) : (
          changes.map((change) => (
            <Card key={change.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getChangeIcon(change.changeType)}
                    <div>
                      <CardTitle className="text-base">
                        {change.documentTitle || 'Untitled Document'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        {change.documentUrl && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {new URL(change.documentUrl).hostname}
                          </span>
                        )}
                        {change.detectedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(change.detectedAt), { addSuffix: true })}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getChangeBadge(change.changeType)}
                    {getChangePercentageBadge(change.changePercentage)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(change)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {change.changeSummary && (
                  <p className="text-sm text-muted-foreground">
                    {change.changeSummary}
                  </p>
                )}
                {change.documentUrl && (
                  <div className="mt-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => window.open(change.documentUrl!, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Original Page
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Change Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Change Details</DialogTitle>
            <DialogDescription>
              Detailed view of content changes for {selectedChange?.documentTitle}
            </DialogDescription>
          </DialogHeader>
          
          {selectedChange && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="diff">Content Diff</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Change Type</Label>
                    <div className="mt-1">{getChangeBadge(selectedChange.changeType)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Change Percentage</Label>
                    <div className="mt-1">
                      {getChangePercentageBadge(selectedChange.changePercentage) || (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Detected</Label>
                    <div className="text-sm mt-1">
                      {selectedChange.detectedAt ? 
                        formatDistanceToNow(new Date(selectedChange.detectedAt), { addSuffix: true }) : 
                        'Unknown'
                      }
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Document URL</Label>
                    <div className="text-sm mt-1">
                      {selectedChange.documentUrl ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => window.open(selectedChange.documentUrl!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {selectedChange.documentUrl}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedChange.changeSummary && (
                  <div>
                    <Label className="text-sm font-semibold">Change Summary</Label>
                    <div className="text-sm mt-1 p-3 bg-muted rounded">
                      {selectedChange.changeSummary}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="diff" className="space-y-4">
                {renderContentDiff(selectedChange.oldContent, selectedChange.newContent)}
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-semibold">Change ID</Label>
                    <div className="text-muted-foreground font-mono">{selectedChange.id}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Document Title</Label>
                    <div className="text-muted-foreground">{selectedChange.documentTitle || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Change Type</Label>
                    <div className="text-muted-foreground">{selectedChange.changeType}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Detection Time</Label>
                    <div className="text-muted-foreground">
                      {selectedChange.detectedAt ? 
                        new Date(selectedChange.detectedAt).toLocaleString() : 
                        'N/A'
                      }
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
} 