"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/server/actions/auth";
import { toast } from "sonner";
import { Building2, ArrowLeft, Shield, Zap, Globe, CheckCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandIcon } from "@/components/ui/brand-icon";

export default function CreateTenantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    systemPrompt: "You are a professional AI assistant with comprehensive access to the organizational knowledge repository. Provide accurate, contextual responses based on verified information while maintaining enterprise standards for communication and data handling.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim() || !formData.slug.trim()) {
        toast.error("Workspace name and identifier are required");
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

      toast.success("Workspace initialized successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to initialize workspace. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Professional Header */}
          <div className="mb-8">
            <Button asChild variant="ghost" className="mb-6 text-muted-foreground hover:text-foreground">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            
            <div className="text-center space-y-4">
              <BrandIcon size="lg" variant="gradient" className="mx-auto" />
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
                  Initialize New Workspace
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Configure your organization's dedicated knowledge management environment 
                  with enterprise-grade AI capabilities
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Configuration Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-xl border-border/50">
                <CardHeader className="space-y-3">
                  <CardTitle className="text-2xl font-semibold text-foreground">
                    Workspace Configuration
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Define your workspace parameters and AI assistant behavior for optimal organizational alignment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                        Basic Information
                      </h3>
                      
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-medium text-foreground">
                          Workspace Name
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enterprise Knowledge Hub"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          A professional identifier for your organizational workspace
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="slug" className="text-sm font-medium text-foreground">
                          Workspace Identifier
                        </Label>
                        <div className="flex gap-3">
                          <Input
                            id="slug"
                            placeholder="enterprise-knowledge-hub"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            required
                            className="h-11"
                          />
                          <Button type="button" variant="ghost" onClick={handleSlugGenerate} className="px-6 btn-bancon-outline">
                            Generate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          URL-safe identifier using lowercase letters, numbers, and hyphens only
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="description" className="text-sm font-medium text-foreground">
                          Workspace Description <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Centralized repository for organizational knowledge, documentation, and AI-powered insights..."
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Brief description of the workspace purpose and scope
                        </p>
                      </div>
                    </div>

                    {/* AI Configuration */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                        AI Assistant Configuration
                      </h3>
                      
                      <div className="space-y-3">
                        <Label htmlFor="systemPrompt" className="text-sm font-medium text-foreground">
                          System Instructions
                        </Label>
                        <Textarea
                          id="systemPrompt"
                          value={formData.systemPrompt}
                          onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                          rows={5}
                          className="resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Professional guidelines defining the AI assistant's behavior, tone, and operational parameters
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6 border-t border-border">
                      <Button type="submit" disabled={isLoading} variant="ghost" className="flex-1 h-11 btn-bancon-primary">
                        {isLoading ? "Initializing Workspace..." : "Initialize Workspace"}
                      </Button>
                                              <Button type="button" variant="ghost" asChild className="h-11 px-8 btn-bancon-outline">
                        <Link href="/">Cancel</Link>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Enterprise Features Sidebar */}
            <div className="space-y-6">
              <Card className="business-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Enterprise Features
                  </CardTitle>
                  <CardDescription>
                    Your workspace includes these professional capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Enterprise Security</h4>
                      <p className="text-sm text-muted-foreground">
                        Multi-tenant isolation with role-based access control
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">AI-Powered Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Intelligent document processing and search capabilities
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Global Accessibility</h4>
                      <p className="text-sm text-muted-foreground">
                        Cloud-native architecture with worldwide availability
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="business-card bg-muted/30 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Setup Complete in Minutes</h4>
                      <p className="text-sm text-muted-foreground">
                        Your enterprise workspace will be ready for immediate use with pre-configured 
                        security policies and AI optimization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 