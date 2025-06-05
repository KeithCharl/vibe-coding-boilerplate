"use client";

import { useState } from "react";
import { analyzeUrl } from "@/server/actions/web-analysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface AnalyzeUrlFormProps {
  tenantId: string;
}

export function AnalyzeUrlForm({ tenantId }: AnalyzeUrlFormProps) {
  const [url, setUrl] = useState("");
  const [waitForDynamic, setWaitForDynamic] = useState(false);
  const [generateSummary, setGenerateSummary] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a URL to analyze");
      return;
    }

    try {
      setIsAnalyzing(true);
      toast.info("Starting web analysis...", { 
        description: "This may take a few moments depending on the website" 
      });

      const result = await analyzeUrl(tenantId, url.trim(), {
        waitForDynamic,
        generateSummary,
      });

      if (result.success) {
        if (result.isNew) {
          toast.success("Website analyzed successfully!", {
            description: `Extracted ${result.analysis.content?.length || 0} characters of content`
          });
        } else {
          toast.success("Using existing analysis", {
            description: "This URL was recently analyzed"
          });
        }
        setUrl(""); // Clear form
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Analyze New Website
        </CardTitle>
        <CardDescription>
          Enter a URL to extract and analyze its content. The text will be processed 
          and made searchable in your knowledge base.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isAnalyzing}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={isAnalyzing || !url.trim()}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
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
  );
} 