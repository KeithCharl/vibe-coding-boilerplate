"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Info, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  requestKnowledgeBaseReference,
  getAvailableTenants,
  getAvailableConnectionTemplates 
} from "@/server/actions/kb-references";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default function RequestReferencePage({ params }: PageProps) {
  const { tenantId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("target");

  const [isLoading, setIsLoading] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState({
    targetTenantId: targetId || "",
    name: "",
    description: "",
    weight: [1.0],
    maxResults: [5],
    minSimilarity: [0.7],
    includeTags: "",
    excludeTags: "",
    includeDocumentTypes: [] as string[],
    excludeDocumentTypes: [] as string[],
  });

  const documentTypes = ["pdf", "txt", "md", "web"];

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const tenants = await getAvailableTenants(tenantId);
        setAvailableTenants(tenants);
        
        // For now, skip templates to avoid permission issues
        // TODO: Fix template permissions and re-enable
        // const templatesList = await getAvailableConnectionTemplates(tenantId);
        // setTemplates(templatesList);
        setTemplates([]);
      } catch (error) {
        toast.error("Failed to load data");
        console.error(error);
      }
    };
    loadData();
  }, [tenantId]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          weight: [template.defaultWeight || 1.0],
          includeTags: template.includeTags?.join(", ") || "",
          excludeTags: template.excludeTags?.join(", ") || "",
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetTenantId || !formData.name) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsLoading(true);
    try {
      await requestKnowledgeBaseReference(
        tenantId,
        formData.targetTenantId,
        {
          name: formData.name,
          description: formData.description || undefined,
          templateId: selectedTemplate || undefined,
          customConfig: {
            weight: formData.weight[0],
            maxResults: formData.maxResults[0],
            minSimilarity: formData.minSimilarity[0],
            includeTags: formData.includeTags ? formData.includeTags.split(",").map(t => t.trim()) : undefined,
            excludeTags: formData.excludeTags ? formData.excludeTags.split(",").map(t => t.trim()) : undefined,
            includeDocumentTypes: formData.includeDocumentTypes.length > 0 ? formData.includeDocumentTypes : undefined,
            excludeDocumentTypes: formData.excludeDocumentTypes.length > 0 ? formData.excludeDocumentTypes : undefined,
          }
        }
      );

      toast.success("Reference request submitted successfully!");
      router.push(`/t/${tenantId}/kb/references`);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTenant = availableTenants.find(t => t.id === formData.targetTenantId);

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
          <h1 className="text-3xl font-bold">Request Knowledge Base Reference</h1>
          <p className="text-muted-foreground">
            Request access to another knowledge base to enhance your responses.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Choose the knowledge base and provide basic details for your request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Knowledge Base *</Label>
              <Select 
                value={formData.targetTenantId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, targetTenantId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  {availableTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                      {tenant.description && (
                        <span className="text-muted-foreground"> - {tenant.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTenant && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">{selectedTenant.name}</h4>
                  {selectedTenant.description && (
                    <p className="text-sm text-muted-foreground">{selectedTenant.description}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Reference Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Project Management Knowledge"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Explain why you need access to this knowledge base..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {templates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configuration Template</CardTitle>
              <CardDescription>
                Use a pre-configured template or customize settings manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom Configuration</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.isSystemTemplate && <Badge variant="secondary" className="ml-2">System</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Search Configuration</CardTitle>
            <CardDescription>
              Configure how results from this knowledge base will be weighted and filtered.
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/t/${tenantId}/kb/references`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>Submitting...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 