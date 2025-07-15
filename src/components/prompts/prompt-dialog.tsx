"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { X, Sparkles, RefreshCw, Copy, Check, Loader2 } from 'lucide-react';
import { createPrompt, updatePrompt, generatePromptWithAI, refinePromptWithAI, type Prompt, type CreatePromptData, type UpdatePromptData } from '@/server/actions/prompts';
import { toast } from 'sonner';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptCreated?: (prompt: Prompt) => void;
  onPromptUpdated?: (prompt: Prompt) => void;
  tenantId: string;
  categories: string[];
  mode: 'create' | 'edit';
  prompt?: Prompt;
}

export function PromptDialog({ 
  isOpen, 
  onClose, 
  onPromptCreated, 
  onPromptUpdated, 
  tenantId, 
  categories, 
  mode, 
  prompt 
}: PromptDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(mode === 'edit' ? 'manual' : 'manual');
  
  // AI Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiPurpose, setAiPurpose] = useState('');
  const [aiFormat, setAiFormat] = useState('');
  const [aiTone, setAiTone] = useState('');
  const [aiConstraints, setAiConstraints] = useState('');
  const [aiCategory, setAiCategory] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<{
    name: string;
    description: string;
    content: string;
    category: string;
    tags: string[];
  } | null>(null);
  const [refinementRequest, setRefinementRequest] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && prompt) {
      setName(prompt.name);
      setDescription(prompt.description || '');
      setContent(prompt.content);
      setCategory(prompt.category || '');
      setTags(prompt.tags || []);
      setIsPublic(prompt.isPublic || false);
      setActiveTab('manual');
    } else {
      // Reset form for create mode
      setName('');
      setDescription('');
      setContent('');
      setCategory('');
      setNewCategory('');
      setTags([]);
      setNewTag('');
      setIsPublic(false);
      setActiveTab('manual');
      // Reset AI form
      setAiDescription('');
      setAiPurpose('');
      setAiFormat('');
      setAiTone('');
      setAiConstraints('');
      setAiCategory('');
      setGeneratedPrompt(null);
      setRefinementRequest('');
    }
  }, [mode, prompt, isOpen]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(`${field} copied to clipboard`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) {
      toast.error('Please provide a description for the prompt');
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generatePromptWithAI(tenantId, aiDescription, {
        purpose: aiPurpose,
        format: aiFormat,
        tone: aiTone,
        constraints: aiConstraints,
        category: aiCategory,
      });

      if (result.success) {
        setGeneratedPrompt(result.prompt);
        toast.success("AI generated prompt successfully!");
      }
    } catch (error: any) {
      console.error("Failed to generate prompt:", error);
      toast.error(error.message || "Failed to generate prompt with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!generatedPrompt || !refinementRequest.trim()) {
      toast.error("Please provide refinement instructions");
      return;
    }

    try {
      setIsRefining(true);
      const result = await refinePromptWithAI(tenantId, generatedPrompt, refinementRequest);

      if (result.success) {
        setGeneratedPrompt(result.prompt);
        setRefinementRequest("");
        toast.success("Prompt refined successfully!");
        toast.info(result.changes);
      }
    } catch (error: any) {
      console.error("Failed to refine prompt:", error);
      toast.error(error.message || "Failed to refine prompt");
    } finally {
      setIsRefining(false);
    }
  };

  const useGeneratedPrompt = () => {
    if (!generatedPrompt) return;

    setName(generatedPrompt.name);
    setDescription(generatedPrompt.description);
    setContent(generatedPrompt.content);
    setCategory(generatedPrompt.category);
    setTags(generatedPrompt.tags);
    setActiveTab('manual');
    toast.success("Generated prompt loaded into form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !content.trim()) {
      toast.error('Name and content are required');
      return;
    }

    setIsLoading(true);

    try {
      const finalCategory = newCategory.trim() || category || 'general';
      
      if (mode === 'create') {
        const promptData: CreatePromptData = {
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
          category: finalCategory,
          tags: tags.length > 0 ? tags : undefined,
          isPublic,
        };

        const newPrompt = await createPrompt(tenantId, promptData);
        onPromptCreated?.(newPrompt);
        toast.success("Prompt created successfully!");
      } else if (mode === 'edit' && prompt) {
        const promptData: UpdatePromptData = {
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
          category: finalCategory,
          tags: tags.length > 0 ? tags : undefined,
          isPublic,
        };

        const updatedPrompt = await updatePrompt(tenantId, prompt.id, promptData);
        onPromptUpdated?.(updatedPrompt);
        toast.success("Prompt updated successfully!");
      }
      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFromGenerated = async () => {
    if (!generatedPrompt) return;

    try {
      setIsLoading(true);
      const promptData: CreatePromptData = {
        name: generatedPrompt.name,
        description: generatedPrompt.description,
        content: generatedPrompt.content,
        category: generatedPrompt.category,
        tags: generatedPrompt.tags,
        isPublic,
      };

      const newPrompt = await createPrompt(tenantId, promptData);
      onPromptCreated?.(newPrompt);
      toast.success("Prompt created successfully!");
      onClose();
    } catch (error: any) {
      console.error("Failed to create prompt:", error);
      toast.error(error.message || "Failed to create prompt");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Creation</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2" disabled={mode === 'edit'}>
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter prompt name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the prompt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the prompt content..."
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newCategory">Or create new category</Label>
                  <Input
                    id="newCategory"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleAddTag)}
                    placeholder="Add a tag"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="isPublic">Make this prompt public</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === 'create' ? 'Create Prompt' : 'Update Prompt'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  AI Prompt Generator
                </CardTitle>
                <CardDescription>
                  Describe what kind of prompt you need, and AI will help create it for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiDescription">Prompt Description *</Label>
                  <Textarea
                    id="aiDescription"
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Describe the prompt you want to create. For example: 'I need a prompt for writing professional email responses to customer complaints'"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aiPurpose">Purpose (Optional)</Label>
                    <Input
                      id="aiPurpose"
                      value={aiPurpose}
                      onChange={(e) => setAiPurpose(e.target.value)}
                      placeholder="e.g., Content creation, Analysis, Summarization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiFormat">Output Format (Optional)</Label>
                    <Input
                      id="aiFormat"
                      value={aiFormat}
                      onChange={(e) => setAiFormat(e.target.value)}
                      placeholder="e.g., Bullet points, Paragraph, JSON"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiTone">Tone (Optional)</Label>
                    <Input
                      id="aiTone"
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      placeholder="e.g., Professional, Casual, Technical"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiCategory">Category (Optional)</Label>
                    <Input
                      id="aiCategory"
                      value={aiCategory}
                      onChange={(e) => setAiCategory(e.target.value)}
                      placeholder="e.g., Marketing, Technical, Creative"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiConstraints">Constraints (Optional)</Label>
                  <Input
                    id="aiConstraints"
                    value={aiConstraints}
                    onChange={(e) => setAiConstraints(e.target.value)}
                    placeholder="e.g., Keep under 200 words, Include examples"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleAIGenerate} disabled={isGenerating} variant="ghost" className="flex items-center gap-2 btn-bancon-secondary">
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Prompt
                  </Button>
                </div>
              </CardContent>
            </Card>

            {generatedPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Prompt</CardTitle>
                  <CardDescription>
                    Review the AI-generated prompt and refine if needed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Name</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedPrompt.name, "Name")}
                        >
                          {copiedField === "Name" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm font-medium">{generatedPrompt.name}</p>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Description</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedPrompt.description, "Description")}
                        >
                          {copiedField === "Description" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{generatedPrompt.description}</p>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Content</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedPrompt.content, "Content")}
                        >
                          {copiedField === "Content" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                        {generatedPrompt.content}
                      </pre>
                    </div>

                    <Separator />

                    <div className="flex gap-4">
                      <div>
                        <Badge variant="outline">Category</Badge>
                        <p className="text-sm text-muted-foreground mt-1">{generatedPrompt.category}</p>
                      </div>
                      <div>
                        <Badge variant="outline">Tags</Badge>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generatedPrompt.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Refine Prompt</h4>
                    <Textarea
                      placeholder="Describe how you'd like to improve this prompt (e.g., 'Make it more specific', 'Add examples', 'Change the tone')"
                      value={refinementRequest}
                      onChange={(e) => setRefinementRequest(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRefinePrompt}
                        disabled={isRefining || !refinementRequest.trim()}
                        variant="outline"
                        size="sm"
                      >
                        {isRefining ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refine
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Save Prompt</h4>
                    <p className="text-xs text-muted-foreground">
                      Choose how to proceed with this AI-generated prompt
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPublicGenerated"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                      />
                      <Label htmlFor="isPublicGenerated">Make this prompt public</Label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleCreateFromGenerated}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        💾 Save Prompt Directly
                      </Button>
                      
                      <Button
                        onClick={useGeneratedPrompt}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        ✏️ Edit in Manual Form
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 