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
import { X } from 'lucide-react';
import { createPrompt, updatePrompt, type Prompt, type CreatePromptData, type UpdatePromptData } from '@/server/actions/prompts';
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

  useEffect(() => {
    if (mode === 'edit' && prompt) {
      setName(prompt.name);
      setDescription(prompt.description || '');
      setContent(prompt.content);
      setCategory(prompt.category || '');
      setTags(prompt.tags || []);
      setIsPublic(prompt.isPublic || false);
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
    }
  }, [mode, prompt, isOpen]);

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
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save prompt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
          </DialogTitle>
        </DialogHeader>

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
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => handleKeyPress(e, handleAddTag)}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
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
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="isPublic">
              Make this prompt public (visible to all users in the organization)
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create Prompt' : 'Update Prompt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 