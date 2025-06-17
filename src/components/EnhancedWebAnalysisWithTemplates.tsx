'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { enhancedWebScraping } from '@/server/actions/enhanced-web-scraping';
import { WEBSITE_TEMPLATES, suggestTemplateForUrl } from '@/lib/website-templates';
import { Loader2, Globe, Eye, Download, Copy, Check, Bot, Target, Settings, AlertCircle, BookOpen, Building2, Newspaper, ShoppingCart, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  metadata: {
    domain: string;
    links: string[];
    images: string[];
    headings: string[];
    description?: string;
    keywords?: string;
    author?: string;
    publishedDate?: string;
    wordCount: number;
    language?: string;
    depth: number;
    parentUrl?: string;
    contentType?: string;
    authMethod?: string;
  };
  contentHash: string;
  timestamp: Date;
}

interface CrawlResult {
  baseUrl: string;
  pages: ScrapedPage[];
  summary: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    errors: Array<{ url: string; error: string; needsCredentials?: boolean; loginMethod?: string }>;
    startTime: Date;
    endTime: Date;
    duration: number;
    savedContent?: number;
    authenticationAttempts: {
      sso: number;
      credentials: number;
      failed: number;
    };
  };
}

export default function EnhancedWebAnalysisWithTemplates({ tenantId }: { tenantId: string }) {
  const [url, setUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<CrawlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  const [selectedPage, setSelectedPage] = useState<ScrapedPage | null>(null);
  const [customOptions, setCustomOptions] = useState({
    maxDepth: 3,
    maxPages: 50,
    includePatterns: '',
    excludePatterns: '',
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documentation': return <BookOpen className="h-4 w-4" />;
      case 'corporate': return <Building2 className="h-4 w-4" />;
      case 'news': case 'blog': return <Newspaper className="h-4 w-4" />;
      case 'ecommerce': return <ShoppingCart className="h-4 w-4" />;
      case 'social': return <Users className="h-4 w-4" />;
      case 'custom': return <Zap className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId !== 'auto' && templateId !== 'custom') {
      const template = WEBSITE_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setCustomOptions({
          maxDepth: template.crawlOptions.maxDepth,
          maxPages: template.crawlOptions.maxPages,
          includePatterns: template.urlPatterns.include.join(', '),
          excludePatterns: template.urlPatterns.exclude.join(', '),
        });
      }
    }
  };

  const handleSuggestTemplate = () => {
    if (!url) return;
    
    try {
      const suggested = suggestTemplateForUrl(url);
      setSelectedTemplate(suggested.id);
      toast.success(`Suggested template: ${suggested.name}`);
    } catch (error) {
      toast.error('Please enter a valid URL first');
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      let analysisOptions;
      
      if (selectedTemplate === 'auto') {
        // Auto-detect template
        analysisOptions = { useAutoTemplate: true };
      } else if (selectedTemplate === 'custom') {
        // Use custom options
        analysisOptions = {
          maxDepth: customOptions.maxDepth,
          maxPages: customOptions.maxPages,
          includePatterns: customOptions.includePatterns.split(',').map(p => p.trim()).filter(Boolean),
          excludePatterns: customOptions.excludePatterns.split(',').map(p => p.trim()).filter(Boolean),
        };
      } else {
        // Use specific template
        analysisOptions = { templateId: selectedTemplate };
      }

      const result = await enhancedWebScraping(tenantId, url, analysisOptions);
      setResults(result);
      
      if (result.pages.length > 0) {
        setSelectedPage(result.pages[0]);
        toast.success(`Successfully analyzed ${result.summary.successfulPages} pages`);
      } else {
        toast.warning('No pages were successfully scraped');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success('Copied to clipboard!');
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Enhanced Web Analysis with Templates
          </CardTitle>
          <CardDescription>
            Intelligent web scraping with predefined templates for different types of websites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSuggestTemplate}
                disabled={!url}
              >
                <Bot className="h-4 w-4 mr-2" />
                Suggest
              </Button>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <Label>Scraping Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Auto-Detect Template
                  </div>
                </SelectItem>
                {WEBSITE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Custom Configuration
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Template Description */}
            {selectedTemplate && selectedTemplate !== 'auto' && selectedTemplate !== 'custom' && (
              <div className="p-3 bg-muted rounded-lg">
                {(() => {
                  const template = WEBSITE_TEMPLATES.find(t => t.id === selectedTemplate);
                  return template ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(template.category)}
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="secondary">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium">Max Depth:</span> {template.crawlOptions.maxDepth}
                        </div>
                        <div>
                          <span className="font-medium">Max Pages:</span> {template.crawlOptions.maxPages}
                        </div>
                        <div>
                          <span className="font-medium">Delay:</span> {template.behaviors.delayBetweenRequests}ms
                        </div>
                        <div>
                          <span className="font-medium">Respect Robots:</span> {template.behaviors.respectRobots ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Custom Options */}
            {selectedTemplate === 'custom' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Custom Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxDepth">Max Depth</Label>
                      <Input
                        id="maxDepth"
                        type="number"
                        min="1"
                        max="10"
                        value={customOptions.maxDepth}
                        onChange={(e) => setCustomOptions(prev => ({ ...prev, maxDepth: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPages">Max Pages</Label>
                      <Input
                        id="maxPages"
                        type="number"
                        min="1"
                        max="1000"
                        value={customOptions.maxPages}
                        onChange={(e) => setCustomOptions(prev => ({ ...prev, maxPages: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="includePatterns">Include Patterns (comma-separated)</Label>
                    <Textarea
                      id="includePatterns"
                      placeholder="/docs/, /api/, /guide/"
                      value={customOptions.includePatterns}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, includePatterns: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="excludePatterns">Exclude Patterns (comma-separated)</Label>
                    <Textarea
                      id="excludePatterns"
                      placeholder="/admin/, /login/, /register/"
                      value={customOptions.excludePatterns}
                      onChange={(e) => setCustomOptions(prev => ({ ...prev, excludePatterns: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Analysis Button */}
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !url.trim()}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Website...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Start Enhanced Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Analysis Results
            </CardTitle>
            <CardDescription>
              Scraped {results.summary.successfulPages} of {results.summary.totalPages} pages in {formatDuration(results.summary.duration)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="pages">Pages ({results.pages.length})</TabsTrigger>
                <TabsTrigger value="errors">Errors ({results.summary.errors.length})</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-green-600">{results.summary.successfulPages}</div>
                      <p className="text-xs text-muted-foreground">Successful Pages</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-red-600">{results.summary.failedPages}</div>
                      <p className="text-xs text-muted-foreground">Failed Pages</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{results.summary.savedContent || 0}</div>
                      <p className="text-xs text-muted-foreground">Saved Content</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{formatDuration(results.summary.duration)}</div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{Math.round((results.summary.successfulPages / results.summary.totalPages) * 100)}%</span>
                  </div>
                  <Progress value={(results.summary.successfulPages / results.summary.totalPages) * 100} />
                </div>
              </TabsContent>

              <TabsContent value="pages" className="space-y-4">
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {results.pages.map((page, index) => (
                      <Card 
                        key={index} 
                        className={`cursor-pointer transition-colors ${selectedPage?.url === page.url ? 'border-primary' : ''}`}
                        onClick={() => setSelectedPage(page)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{page.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">{page.url}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">Depth {page.metadata.depth}</Badge>
                                <Badge variant="secondary">{page.metadata.wordCount} words</Badge>
                                {page.metadata.contentType && (
                                  <Badge>{page.metadata.contentType}</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(page.url, `url-${index}`);
                              }}
                            >
                              {copiedStates[`url-${index}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="errors" className="space-y-4">
                {results.summary.errors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No errors occurred during the analysis.</p>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {results.summary.errors.map((error, index) => (
                        <Card key={index} className="border-destructive/50">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="font-medium text-sm">{error.url}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{error.error}</p>
                              {error.needsCredentials && (
                                <Badge variant="outline" className="text-yellow-600">
                                  Requires {error.loginMethod || 'Authentication'}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                {selectedPage ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Content Preview</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedPage.content, 'content')}
                        >
                          {copiedStates['content'] ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copy Content
                        </Button>
                      </div>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{selectedPage.title}</CardTitle>
                        <CardDescription className="break-all">{selectedPage.url}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Word Count:</span> {selectedPage.metadata.wordCount}
                          </div>
                          <div>
                            <span className="font-medium">Links:</span> {selectedPage.metadata.links.length}
                          </div>
                          <div>
                            <span className="font-medium">Images:</span> {selectedPage.metadata.images.length}
                          </div>
                          <div>
                            <span className="font-medium">Headings:</span> {selectedPage.metadata.headings.length}
                          </div>
                        </div>
                        
                        <ScrollArea className="h-64 w-full border rounded p-3">
                          <pre className="text-sm whitespace-pre-wrap">{selectedPage.content}</pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Select a page from the Pages tab to view its content.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 