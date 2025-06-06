"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/server/actions/auth";
import { toast } from "sonner";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateTenantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    systemPrompt: "You are a helpful AI assistant with access to the knowledge base. Use the provided context to answer questions accurately and helpfully.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim() || !formData.slug.trim()) {
        toast.error("Name and slug are required");
        return;
      }

      // Generate slug from name if not provided
      let slug = formData.slug;
      if (!slug) {
        slug = formData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      const tenant = await createTenant({
        name: formData.name,
        slug,
        description: formData.description,
        systemPrompt: formData.systemPrompt,
      });

      toast.success("Tenant created successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast.error("Failed to create tenant. Please try again.");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Create New Tenant
            </h1>
            <p className="text-muted-foreground">
              Set up your AI-powered knowledge base
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Configuration</CardTitle>
            <CardDescription>
              Configure your knowledge base settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
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

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Instructions for the AI assistant on how to behave and respond
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Tenant"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 