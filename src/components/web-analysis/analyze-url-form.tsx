"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Loader2, 
  CheckCircle, 
  Eye, 
  Save, 
  BookOpen,
  Sparkles,
  Copy,
  ExternalLink 
} from "lucide-react";
import { analyzeUrl } from "@/server/actions/web-analysis";
import { addWebContentToKnowledge } from "@/server/actions/content";
import { toast } from "sonner";

interface AnalyzeUrlFormProps {
  tenantId: string;
}

interface AnalysisResult {
  id: string;
  url: string;
  title: string;
  content: string;
  summary?: string;
  metadata: any;
}

export function AnalyzeUrlForm({ tenantId }: AnalyzeUrlFormProps) {
  const [url, setUrl] = useState("");
  const [waitForDynamic, setWaitForDynamic] = useState(false);
  const [generateSummary, setGenerateSummary] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingToKB, setIsSavingToKB] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a URL to analyze");
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      
      toast.info("Starting web analysis...", { 
        description: "This may take a few moments depending on the website" 
      });

      const result = await analyzeUrl(tenantId, url.trim(), {
        waitForDynamic,
        generateSummary,
      });

      if (result.success) {
        setAnalysisResult(result.analysis);
        setShowPreview(true);
        
        if (result.isNew) {
          toast.success("Website analyzed successfully!", {
            description: `Extracted ${result.analysis.content?.length || 0} characters of content`
          });
        } else {
          toast.success("Using existing analysis", {
            description: "This URL was recently analyzed"
          });
        }
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed", {
        description: error.message || "Failed to analyze the website"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToKnowledgeBase = async () => {
    if (!analysisResult) {
      toast.error("No analysis result to save");
      return;
    }

    try {
      setIsSavingToKB(true);
      
      toast.info("💾 Saving to knowledge base...", {
        description: "Processing content for AI-powered search"
      });

      const saveResult = await addWebContentToKnowledge(tenantId, analysisResult.url, {
        waitForDynamic,
        generateSummary: true,
      });

      if (saveResult.success) {
        toast.success("🎉 Saved to knowledge base!", {
          description: `Added ${saveResult.chunksCount} chunks for AI-powered search and chat`
        });
        
        // Clear form after successful save
        setUrl("");
        setAnalysisResult(null);
        setShowPreview(false);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save to knowledge base", {
        description: error.message || "An error occurred while saving"
      });
    } finally {
      setIsSavingToKB(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getContentPreview = (content: string, limit: number = 300) => {
    if (content.length <= limit) return content;
    return content.substring(0, limit) + "...";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Analysis
          </CardTitle>
          <CardDescription>
            Analyze websites using enhanced Cheerio scraping with structured data extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isAnalyzing}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dynamic" 
                  checked={waitForDynamic}
                  onCheckedChange={(checked) => setWaitForDynamic(checked as boolean)}
                  disabled={isAnalyzing}
                />
                <Label htmlFor="dynamic" className="text-sm">
                  Wait for dynamic content (JavaScript-heavy sites)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="summary" 
                  checked={generateSummary}
                  onCheckedChange={(checked) => setGenerateSummary(checked as boolean)}
                  disabled={isAnalyzing}
                />
                <Label htmlFor="summary" className="text-sm">
                  Generate AI summary of content
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isAnalyzing} className="flex-1">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Website
                  </>
                )}
              </Button>
              
              {analysisResult && (
                <Button 
                  type="button"
                  onClick={handleSaveToKnowledgeBase}
                  disabled={isSavingToKB}
                  variant="secondary"
                  className="flex-1"
                >
                  {isSavingToKB ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Save to KB
                    </>
                  )}
                </Button>
              )}
            </div>

            {isAnalyzing && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing website content...</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This may take 10-30 seconds depending on the website size
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Analysis Preview */}
      {analysisResult && showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Analysis Preview
              <Badge variant="secondary" className="ml-auto">
                {analysisResult.content?.length || 0} chars
              </Badge>
            </CardTitle>
            <CardDescription>
              Preview the extracted content before saving to your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{analysisResult.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(analysisResult.title, "Title")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{analysisResult.url}</p>
              
              {analysisResult.summary && (
                <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">AI Summary</h4>
                  <p className="text-sm text-blue-800">{analysisResult.summary}</p>
                </div>
              )}

              <Separator className="my-3" />

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-primary">
                    {analysisResult.metadata?.readingTime || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Min Read</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-primary">
                    {analysisResult.metadata?.wordCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Words</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-primary">
                    {analysisResult.metadata?.links?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Links</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-primary">
                    {analysisResult.metadata?.images?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Images</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Content Preview</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(analysisResult.content, "Content")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="h-32">
                  <div className="text-sm bg-white p-3 rounded border whitespace-pre-wrap">
                    {getContentPreview(analysisResult.content)}
                  </div>
                </ScrollArea>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(analysisResult.url, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Original
                </Button>
                <Button
                  onClick={handleSaveToKnowledgeBase}
                  disabled={isSavingToKB}
                  className="flex-1"
                >
                  {isSavingToKB ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save to Knowledge Base
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 