"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Save, 
  Play,
  CheckCircle,
  XCircle,
  Settings,
  TestTube,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  getKnowledgeBaseReference,
  updateKnowledgeBaseReference,
  testKnowledgeBaseReference 
} from "@/server/actions/kb-references";

interface PageProps {
  params: Promise<{
    tenantId: string;
    referenceId: string;
  }>;
}

export default function ReferenceConfigPage({ params }: PageProps) {
  const { tenantId, referenceId } = use(params);
  const [reference, setReference] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    isActive: true,
    weight: [1.0],
    maxResults: [5],
    minSimilarity: [0.7],
    includeTags: "",
    excludeTags: "",
    includeDocumentTypes: [] as string[],
    excludeDocumentTypes: [] as string[],
  });

  const documentTypes = ["pdf", "txt", "md", "web"];

  useEffect(() => {
    loadReference();
  }, [tenantId, referenceId]);

  const loadReference = async () => {
    try {
      const data = await getKnowledgeBaseReference(tenantId, referenceId);
      setReference(data);
      
      // Update form data
      setFormData({
        isActive: data.isActive ?? false,
        weight: [data.weight || 1.0],
        maxResults: [data.maxResults || 5],
        minSimilarity: [data.minSimilarity || 0.7],
        includeTags: data.includeTags?.join(", ") || "",
        excludeTags: data.excludeTags?.join(", ") || "",
        includeDocumentTypes: [],
        excludeDocumentTypes: [],
      });
    } catch (error) {
      toast.error("Failed to load reference");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateKnowledgeBaseReference(tenantId, referenceId, {
        isActive: formData.isActive,
        weight: formData.weight[0],
        maxResults: formData.maxResults[0],
        minSimilarity: formData.minSimilarity[0],
        includeTags: formData.includeTags ? formData.includeTags.split(",").map(t => t.trim()) : [],
        excludeTags: formData.excludeTags ? formData.excludeTags.split(",").map(t => t.trim()) : [],
      });
      
      toast.success("Reference updated successfully!");
      loadReference(); // Reload to get updated data
    } catch (error: any) {
      toast.error(error.message || "Failed to update reference");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testQuery.trim()) {
      toast.error("Please enter a test query");
      return;
    }

    setIsTesting(true);
    try {
      const results = await testKnowledgeBaseReference(tenantId, referenceId, testQuery);
      setTestResults(results);
      toast.success(`Found ${results.length} test results`);
    } catch (error: any) {
      toast.error(error.message || "Test failed");
      setTestResults([]);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/t/${tenantId}/kb/references`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to References
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reference Configuration</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/t/${tenantId}/kb/references`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to References
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reference Not Found</h1>
            <p className="text-muted-foreground">
              The requested reference could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/t/${tenantId}/kb/references`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to References
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{reference.name}</h1>
            <Badge variant={reference.status === "active" ? "default" : reference.status === "pending" ? "secondary" : "destructive"}>
              {reference.status === "active" ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : reference.status === "pending" ? (
                <AlertCircle className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {reference.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Reference to <strong>{reference.targetTenant?.name}</strong>
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="w-4 h-4 mr-2" />
            Test & Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Settings</CardTitle>
              <CardDescription>
                Configure how results from this knowledge base are weighted and filtered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Result Weight: {formData.weight[0]}</Label>
                <Slider
                  value={formData.weight}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, weight: value }))}
                  max={2}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Higher weights prioritize results from this knowledge base.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Results: {formData.maxResults[0]}</Label>
                  <Slider
                    value={formData.maxResults}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, maxResults: value }))}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Similarity: {formData.minSimilarity[0]}</Label>
                  <Slider
                    value={formData.minSimilarity}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, minSimilarity: value }))}
                    max={1}
                    min={0.1}
                    step={0.05}
                    className="w-full"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="includeTags">Include Tags (comma-separated)</Label>
                  <Input
                    id="includeTags"
                    value={formData.includeTags}
                    onChange={(e) => setFormData(prev => ({ ...prev, includeTags: e.target.value }))}
                    placeholder="project, banking, upgrade"
                  />
                  <p className="text-sm text-muted-foreground">
                    Only include documents with these tags.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludeTags">Exclude Tags (comma-separated)</Label>
                  <Input
                    id="excludeTags"
                    value={formData.excludeTags}
                    onChange={(e) => setFormData(prev => ({ ...prev, excludeTags: e.target.value }))}
                    placeholder="draft, internal, deprecated"
                  />
                  <p className="text-sm text-muted-foreground">
                    Exclude documents with these tags.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Include Document Types</Label>
                  <div className="flex gap-2 flex-wrap">
                    {documentTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={formData.includeDocumentTypes.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            includeDocumentTypes: prev.includeDocumentTypes.includes(type)
                              ? prev.includeDocumentTypes.filter(t => t !== type)
                              : [...prev.includeDocumentTypes, type]
                          }));
                        }}
                      >
                        {type.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Exclude Document Types</Label>
                  <div className="flex gap-2 flex-wrap">
                    {documentTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={formData.excludeDocumentTypes.includes(type) ? "destructive" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            excludeDocumentTypes: prev.excludeDocumentTypes.includes(type)
                              ? prev.excludeDocumentTypes.filter(t => t !== type)
                              : [...prev.excludeDocumentTypes, type]
                          }));
                        }}
                      >
                        {type.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Reference</CardTitle>
              <CardDescription>
                Test your reference configuration with sample queries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a test query..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleTest()}
                  className="flex-1"
                />
                <Button onClick={handleTest} disabled={isTesting}>
                  <Play className="w-4 h-4 mr-2" />
                  {isTesting ? "Testing..." : "Test"}
                </Button>
              </div>

              {testResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Test Results ({testResults.length})</h4>
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-sm">{result.title || "Untitled"}</h5>
                          <Badge variant="outline" className="text-xs">
                            Score: {result.similarity?.toFixed(3)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.content}
                        </p>
                        {result.source && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {result.source}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {testQuery && testResults.length === 0 && !isTesting && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for your test query.</p>
                  <p className="text-sm">Try adjusting your filters or similarity threshold.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 