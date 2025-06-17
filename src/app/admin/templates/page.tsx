"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Crown, 
  Copy,
  Shield,
  Save,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { 
  getConnectionTemplates,
  createConnectionTemplate,
  updateConnectionTemplate,
  deleteConnectionTemplate
} from "@/server/actions/kb-references";
import Link from "next/link";

interface ConnectionTemplate {
  id: string;
  name: string;
  description?: string;
  isSystemTemplate: boolean;
  defaultWeight: number;
  includeTags?: string[];
  excludeTags?: string[];
  includeDocumentTypes?: string[];
  excludeDocumentTypes?: string[];
  createdAt: Date;
  usageCount: number;
}

export default function TemplatesAdminPage() {
  const [templates, setTemplates] = useState<ConnectionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ConnectionTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isSystemTemplate: false,
    defaultWeight: [1.0],
    includeTags: "",
    excludeTags: "",
    includeDocumentTypes: [] as string[],
    excludeDocumentTypes: [] as string[],
  });

  const documentTypes = ["pdf", "txt", "md", "web"];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getConnectionTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      isSystemTemplate: false,
      defaultWeight: [1.0],
      includeTags: "",
      excludeTags: "",
      includeDocumentTypes: [],
      excludeDocumentTypes: [],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: ConnectionTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      isSystemTemplate: template.isSystemTemplate,
      defaultWeight: [template.defaultWeight],
      includeTags: template.includeTags?.join(", ") || "",
      excludeTags: template.excludeTags?.join(", ") || "",
      includeDocumentTypes: template.includeDocumentTypes || [],
      excludeDocumentTypes: template.excludeDocumentTypes || [],
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setIsSaving(true);
    try {
      const templateData = {
        name: formData.name,
        description: formData.description || undefined,
        isSystemTemplate: formData.isSystemTemplate,
        defaultWeight: formData.defaultWeight[0],
        includeTags: formData.includeTags ? formData.includeTags.split(",").map(t => t.trim()) : undefined,
        excludeTags: formData.excludeTags ? formData.excludeTags.split(",").map(t => t.trim()) : undefined,
        includeDocumentTypes: formData.includeDocumentTypes.length > 0 ? formData.includeDocumentTypes : undefined,
        excludeDocumentTypes: formData.excludeDocumentTypes.length > 0 ? formData.excludeDocumentTypes : undefined,
      };

      if (editingTemplate) {
        await updateConnectionTemplate(editingTemplate.id, templateData);
        toast.success("Template updated successfully!");
      } else {
        await createConnectionTemplate(templateData);
        toast.success("Template created successfully!");
      }

      await loadTemplates();
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteConnectionTemplate(templateId);
      toast.success("Template deleted successfully!");
      await loadTemplates();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  const handleDuplicate = (template: ConnectionTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      isSystemTemplate: false, // Copies are never system templates
      defaultWeight: [template.defaultWeight],
      includeTags: template.includeTags?.join(", ") || "",
      excludeTags: template.excludeTags?.join(", ") || "",
      includeDocumentTypes: template.includeDocumentTypes || [],
      excludeDocumentTypes: template.excludeDocumentTypes || [],
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Connection Templates</h1>
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Connection Templates</h1>
            <p className="text-muted-foreground">
              Manage reusable configuration templates for knowledge base references.
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create New Template"}
              </DialogTitle>
              <DialogDescription>
                Create a reusable configuration template for knowledge base references.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Cross-Reference"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when to use this template..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Default Weight: {formData.defaultWeight[0]}</Label>
                <Slider
                  value={formData.defaultWeight}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, defaultWeight: value }))}
                  max={2}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Default result weight for references using this template.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isSystemTemplate">System Template</Label>
                <Switch
                  id="isSystemTemplate"
                  checked={formData.isSystemTemplate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSystemTemplate: checked }))}
                />
              </div>

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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="includeTags">Include Tags (comma-separated)</Label>
                  <Input
                    id="includeTags"
                    value={formData.includeTags}
                    onChange={(e) => setFormData(prev => ({ ...prev, includeTags: e.target.value }))}
                    placeholder="project, banking, upgrade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludeTags">Exclude Tags (comma-separated)</Label>
                  <Input
                    id="excludeTags"
                    value={formData.excludeTags}
                    onChange={(e) => setFormData(prev => ({ ...prev, excludeTags: e.target.value }))}
                    placeholder="draft, internal, deprecated"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : (editingTemplate ? "Update Template" : "Create Template")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates Overview</CardTitle>
          <CardDescription>
            {templates.length} template{templates.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create your first connection template to get started.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.isSystemTemplate ? (
                        <Badge variant="default" className="gap-1">
                          <Crown className="w-3 h-3" />
                          System
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>{template.defaultWeight}</TableCell>
                    <TableCell>{template.usageCount} uses</TableCell>
                    <TableCell>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{template.name}"? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 