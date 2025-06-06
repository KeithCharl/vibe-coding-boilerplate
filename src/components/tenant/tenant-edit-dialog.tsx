"use client";

import { useState } from "react";
import { updateTenant } from "@/server/actions/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";

interface TenantEditDialogProps {
  tenant: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: "viewer" | "contributor" | "admin";
  };
  onSuccess?: () => void;
}

export function TenantEditDialog({ tenant, onSuccess }: TenantEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.tenantName,
    slug: tenant.tenantSlug,
    description: "",
  });

  // Only show edit button for admins
  if (tenant.role !== "admin") {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim() || !formData.slug.trim()) {
        toast.error("Name and slug are required");
        return;
      }

      await updateTenant(tenant.tenantId, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
      });

      toast.success("Tenant updated successfully!");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      toast.error(error.message || "Failed to update tenant. Please try again.");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <DialogDescription>
            Update the basic details of your tenant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  }))}
                  required
                />
                <Button type="button" variant="outline" size="sm" onClick={handleSlugGenerate}>
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 