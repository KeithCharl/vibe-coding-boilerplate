'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { WEBSITE_TEMPLATES } from '@/lib/website-templates';
import { Loader2, Globe, Target, Bot, Settings, BookOpen, Building2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function WebTemplateSelector({ tenantId }: { tenantId: string }) {
  const [url, setUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documentation': return <BookOpen className="h-4 w-4" />;
      case 'corporate': return <Building2 className="h-4 w-4" />;
      case 'custom': return <Zap className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log(`Starting analysis with template: ${selectedTemplate}`);
      toast.success(`Analysis started with ${selectedTemplate === 'auto' ? 'auto-detected' : 'selected'} template`);
    } catch (err) {
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
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
        <div className="space-y-2">
          <Label htmlFor="url">Website URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label>Scraping Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  🤖 Auto-Detect Template
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
                  🔧 Custom Configuration
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

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
        </div>

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
  );
} 