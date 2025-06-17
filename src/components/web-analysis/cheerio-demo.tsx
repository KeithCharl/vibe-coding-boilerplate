"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Sparkles, 
  Clock, 
  FileText, 
  Image, 
  Link, 
  User, 
  Calendar,
  Languages,
  Hash,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  Download,
  BookOpen,
  Search,
  Star,
  Copy
} from "lucide-react";
import { analyzeUrl } from "@/server/actions/web-analysis";
import { addWebContentToKnowledge } from "@/server/actions/content";
import { toast } from "sonner";

interface CheerioDemo {
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

export function CheerioDemo({ tenantId }: CheerioDemo) {
  const [url, setUrl] = useState("https://example.com");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingToKB, setIsSavingToKB] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [extractSchema, setExtractSchema] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      setIsAnalyzing(true);
      setResult(null);
      
      toast.info("🔍 Starting enhanced Cheerio analysis...", { 
        description: "Extracting structured data with advanced techniques" 
      });

      const analysisResult = await analyzeUrl(tenantId, url.trim(), {
        waitForDynamic: false, // Use pure Cheerio first
        generateSummary: true,
      });

      if (analysisResult.success) {
        setResult(analysisResult.analysis);
        toast.success("✨ Enhanced analysis complete!", {
          description: `Extracted ${analysisResult.analysis.content?.length || 0} characters with advanced metadata`
        });
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
    if (!result) {
      toast.error("No analysis result to save");
      return;
    }

    try {
      setIsSavingToKB(true);
      
      toast.info("💾 Saving to knowledge base...", {
        description: "Processing content for AI-powered search"
      });

      const saveResult = await addWebContentToKnowledge(tenantId, result.url, {
        waitForDynamic: false,
        generateSummary: true,
      });

      if (saveResult.success) {
        toast.success("🎉 Saved to knowledge base!", {
          description: `Added ${saveResult.chunksCount} chunks for AI-powered search and chat`
        });
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

  const formatMetadataValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.slice(0, 3).join(", ") + (value.length > 3 ? `... (+${value.length - 3} more)` : "");
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value?.toString() || "N/A";
  };

  const getIconForMetadata = (key: string) => {
    switch (key) {
      case 'readingTime': return <Clock className="h-4 w-4" />;
      case 'wordCount': return <FileText className="h-4 w-4" />;
      case 'author': return <User className="h-4 w-4" />;
      case 'publishedDate': return <Calendar className="h-4 w-4" />;
      case 'language': return <Languages className="h-4 w-4" />;
      case 'links': return <Link className="h-4 w-4" />;
      case 'images': return <Image className="h-4 w-4" />;
      case 'headings': return <Hash className="h-4 w-4" />;
      case 'canonical': return <ExternalLink className="h-4 w-4" />;
      case 'description': return <FileText className="h-4 w-4" />;
      case 'schemaData': return <Star className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getContentPreview = (content: string, limit: number = 500) => {
    if (content.length <= limit) return content;
    return content.substring(0, limit) + "...";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enhanced Cheerio Web Scraper Demo
          </CardTitle>
          <CardDescription>
            Test the new Cheerio-based web scraping with advanced structured data extraction, 
            content preview, and save to knowledge base functionality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="demo-url">Website URL to Analyze</Label>
              <Input
                id="demo-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isAnalyzing}
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="schema" 
                  checked={extractSchema}
                  onCheckedChange={(checked) => setExtractSchema(checked as boolean)}
                  disabled={isAnalyzing}
                />
                <Label htmlFor="schema" className="text-sm">
                  Extract JSON-LD structured data
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="formatting" 
                  checked={preserveFormatting}
                  onCheckedChange={(checked) => setPreserveFormatting(checked as boolean)}
                  disabled={isAnalyzing}
                />
                <Label htmlFor="formatting" className="text-sm">
                  Preserve text formatting (headings, lists)
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze Website
                  </>
                )}
              </Button>
              
              {result && (
                <Button 
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
          </div>

          {isAnalyzing && (
            <div className="text-center py-6 space-y-2">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span>Using Cheerio's advanced extraction methods...</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Extracting structured data, metadata, and content with enhanced parsing
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Content Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Content Preview
                <Badge variant="secondary" className="ml-auto">
                  {result.content?.length || 0} chars
                </Badge>
              </CardTitle>
              <CardDescription>
                Preview of extracted content with clean text processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{result.title}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.title, "Title")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{result.url}</p>
                
                {result.summary && (
                  <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-1">AI Summary</h4>
                    <p className="text-sm text-blue-800">{result.summary}</p>
                  </div>
                )}
                
                <Separator className="my-3" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Extracted Content</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullContent(!showFullContent)}
                      >
                        {showFullContent ? "Show Less" : "Show Full"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.content, "Content")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className={showFullContent ? "h-96" : "h-48"}>
                    <div className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">
                      {showFullContent ? result.content : getContentPreview(result.content)}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Enhanced Metadata
                  <Badge variant="secondary" className="ml-auto">
                    {Object.keys(result.metadata || {}).length} fields
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Advanced metadata extraction using Cheerio's structured data capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {result.metadata && Object.entries(result.metadata).map(([key, value]) => {
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;
                      
                      return (
                        <div key={key} className="flex items-start gap-2 p-2 border rounded hover:bg-muted/50 transition-colors">
                          {getIconForMetadata(key)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-xs text-muted-foreground break-words">
                              {formatMetadataValue(value)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {Array.isArray(value) && (
                              <Badge variant="outline" className="text-xs">
                                {value.length}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(formatMetadataValue(value), key)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Extraction Summary
                </CardTitle>
                <CardDescription>
                  Key metrics from the enhanced scraping process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded hover:bg-muted/50 transition-colors">
                    <div className="text-2xl font-bold text-primary">
                      {result.metadata?.readingTime || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Min Read</div>
                  </div>
                  <div className="text-center p-3 border rounded hover:bg-muted/50 transition-colors">
                    <div className="text-2xl font-bold text-primary">
                      {result.metadata?.wordCount || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Words</div>
                  </div>
                  <div className="text-center p-3 border rounded hover:bg-muted/50 transition-colors">
                    <div className="text-2xl font-bold text-primary">
                      {result.metadata?.links?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Links</div>
                  </div>
                  <div className="text-center p-3 border rounded hover:bg-muted/50 transition-colors">
                    <div className="text-2xl font-bold text-primary">
                      {result.metadata?.images?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Images</div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(result.url, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Original Page
                  </Button>
                  
                  <Button
                    onClick={handleSaveToKnowledgeBase}
                    disabled={isSavingToKB}
                    className="w-full"
                  >
                    {isSavingToKB ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving to Knowledge Base...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save to Knowledge Base
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schema Data */}
          {result.metadata?.schemaData && result.metadata.schemaData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Structured Data (JSON-LD)
                  <Badge variant="secondary" className="ml-auto">
                    {result.metadata.schemaData.length} schemas
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Automatically extracted structured data from the page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(result.metadata.schemaData, null, 2), "Schema Data")}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy JSON
                  </Button>
                </div>
                <ScrollArea className="h-60">
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.metadata.schemaData, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Links and Images Preview */}
          {(result.metadata?.links?.length > 0 || result.metadata?.images?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {result.metadata?.links?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link className="h-5 w-5" />
                      Extracted Links
                      <Badge variant="secondary" className="ml-auto">
                        {result.metadata.links.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {result.metadata.links.slice(0, 10).map((link: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate flex-1">{link}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(link, '_blank')}
                              className="h-6 w-6 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {result.metadata.links.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">
                            And {result.metadata.links.length - 10} more links...
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {result.metadata?.images?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Extracted Images
                      <Badge variant="secondary" className="ml-auto">
                        {result.metadata.images.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {result.metadata.images.slice(0, 10).map((image: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded text-sm">
                            <Image className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate flex-1">{image}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(image, '_blank')}
                              className="h-6 w-6 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {result.metadata.images.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">
                            And {result.metadata.images.length - 10} more images...
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 