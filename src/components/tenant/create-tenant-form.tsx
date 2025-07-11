"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { createTenant } from "@/server/actions/auth";
import { toast } from "sonner";

export function CreateTenantForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenantName: "",
    tenantSlug: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantName.trim() || !formData.tenantSlug.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const tenant = await createTenant({
        name: formData.tenantName.trim(),
        slug: formData.tenantSlug.trim().toLowerCase(),
        description: formData.description.trim(),
      });

      toast.success("Workspace created successfully!");
      router.push(`/t/${tenant.id}`);
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSlugChange = (value: string) => {
    const slug = generateSlug(value);
    setFormData(prev => ({ ...prev, tenantSlug: slug }));
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, tenantName: value }));
    // Auto-generate slug if it's empty or matches the previous auto-generated version
    if (!formData.tenantSlug || formData.tenantSlug === generateSlug(formData.tenantName)) {
      handleSlugChange(value);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border-2" style={{ borderColor: '#00B3B0' }}>
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-4">
          <div 
            className="h-12 w-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#002C54' }}
          >
            <Building2 className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl" style={{ color: '#002C54' }}>
          Create Your Workspace
        </CardTitle>
        <CardDescription className="text-lg">
                        Set up your bSmart workspace to get started with intelligent automation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tenantName" className="text-sm font-medium" style={{ color: '#002C54' }}>
              Workspace Name *
            </Label>
            <Input
              id="tenantName"
              type="text"
              placeholder="e.g., Acme Corp"
              value={formData.tenantName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="border-2 focus:border-bancon-teal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantSlug" className="text-sm font-medium" style={{ color: '#002C54' }}>
              Workspace URL *
            </Label>
            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">bsmart.com/t/</span>
              <Input
                id="tenantSlug"
                type="text"
                placeholder="acme-corp"
                value={formData.tenantSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="border-2 focus:border-bancon-teal"
                pattern="[a-z0-9-]+"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium" style={{ color: '#002C54' }}>
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your workspace purpose and goals..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="border-2 focus:border-bancon-teal min-h-[100px]"
            />
          </div>

          <Button
            type="submit"
            variant="ghost"
            className="w-full btn-bancon-primary btn-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Workspace...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-5 w-5" />
                Create Workspace
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 