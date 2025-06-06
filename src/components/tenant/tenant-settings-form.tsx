"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTenant } from "@/server/actions/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TenantSettingsFormProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    systemPrompt: string | null;
    tokenCap: number | null;
  };
}

export function TenantSettingsForm({ tenant }: TenantSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.name,
    slug: tenant.slug,
    description: tenant.description || "",
    systemPrompt: tenant.systemPrompt || "You are a helpful AI assistant with access to the knowledge base. Use the provided context to answer questions accurately and helpfully.",
    tokenCap: tenant.tokenCap || 2000000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim() || !formData.slug.trim()) {
        toast.error("Name and slug are required");
        return;
      }

      await updateTenant(tenant.id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        systemPrompt: formData.systemPrompt,
        tokenCap: formData.tokenCap,
      });

      toast.success("Tenant settings updated successfully!");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      toast.error(error.message || "Failed to update tenant settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlugGenerate = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleReset = () => {
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description || "",
      systemPrompt: tenant.systemPrompt || "You are a helpful AI assistant with access to the knowledge base. Use the provided context to answer questions accurately and helpfully.",
      tokenCap: tenant.tokenCap || 2000000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Configuration</CardTitle>
        <CardDescription>
          Update your tenant's basic information and AI settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name</Label>
              <Input
                id="name"
                placeholder="My Knowledge Base"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for your knowledge base
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  placeholder="my-knowledge-base"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  }))}
                  required
                />
                <Button type="button" variant="outline" onClick={handleSlugGenerate}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your knowledge base..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">AI Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure how the AI assistant behaves
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Instructions for the AI assistant on how to behave and respond
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenCap">Token Cap</Label>
              <Input
                id="tokenCap"
                type="number"
                min="10000"
                max="10000000"
                step="10000"
                value={formData.tokenCap}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenCap: parseInt(e.target.value) || 2000000 }))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum tokens that can be used per month (10K - 10M)
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 