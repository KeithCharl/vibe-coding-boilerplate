"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Copy, Filter, Eye, Lock, Globe } from 'lucide-react';
import { PromptDialog } from './prompt-dialog';
import { DeletePromptDialog } from './delete-prompt-dialog';
import { CopyPromptDialog } from './copy-prompt-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Prompt } from '@/server/actions/prompts';

interface PromptsPageClientProps {
  tenantId: string;
  initialPrompts: Prompt[];
  initialCategories: string[];
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEditAll: boolean;
    canDeleteAll: boolean;
    role: string | null;
  };
}

export function PromptsPageClient({ 
  tenantId, 
  initialPrompts, 
  initialCategories, 
  permissions 
}: PromptsPageClientProps) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);

  const filteredPrompts = useMemo(() => {
    return prompts.filter(prompt => {
      const matchesSearch = searchTerm === '' || 
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [prompts, searchTerm, selectedCategory]);

  const handlePromptCreated = (newPrompt: Prompt) => {
    setPrompts(prev => [newPrompt, ...prev]);
    if (newPrompt.category && !categories.includes(newPrompt.category)) {
      setCategories(prev => [...prev, newPrompt.category!]);
    }
    setIsCreateDialogOpen(false);
    toast.success('Prompt created successfully');
  };

  const handlePromptUpdated = (updatedPrompt: Prompt) => {
    setPrompts(prev => prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p));
    if (updatedPrompt.category && !categories.includes(updatedPrompt.category)) {
      setCategories(prev => [...prev, updatedPrompt.category!]);
    }
    setIsEditDialogOpen(false);
    setSelectedPrompt(null);
    toast.success('Prompt updated successfully');
  };

  const handlePromptDeleted = (promptId: string) => {
    setPrompts(prev => prev.filter(p => p.id !== promptId));
    setIsDeleteDialogOpen(false);
    setSelectedPrompt(null);
    toast.success('Prompt deleted successfully');
  };

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
    setIsCopyDialogOpen(false);
    setSelectedPrompt(null);
    toast.success('Prompt content copied to clipboard');
  };

  const canEditPrompt = (prompt: Prompt) => {
    return permissions.canEditAll || permissions.role === 'admin';
  };

  const canDeletePrompt = (prompt: Prompt) => {
    return permissions.canDeleteAll || permissions.role === 'admin';
  };

  if (!permissions.canView) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You don't have permission to view prompts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {permissions.canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Prompt
          </Button>
        )}
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'No prompts match your search criteria.' 
              : 'No prompts available yet.'
            }
          </p>
          {permissions.canCreate && searchTerm === '' && selectedCategory === 'all' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Prompt
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{prompt.name}</CardTitle>
                    {prompt.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {prompt.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {prompt.isPublic ? (
                      <Globe className="h-4 w-4 text-green-600" title="Public prompt" />
                    ) : (
                      <Lock className="h-4 w-4 text-orange-600" title="Private prompt" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  {prompt.category && (
                    <Badge variant="secondary" className="text-xs">
                      {prompt.category}
                    </Badge>
                  )}
                  {prompt.usageCount !== null && prompt.usageCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Used {prompt.usageCount} times
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {prompt.content}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPrompt(prompt);
                      setIsCopyDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use
                  </Button>
                  
                  {canEditPrompt(prompt) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {canDeletePrompt(prompt) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PromptDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPromptCreated={handlePromptCreated}
        tenantId={tenantId}
        categories={categories}
        mode="create"
      />

      {selectedPrompt && (
        <>
          <PromptDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedPrompt(null);
            }}
            onPromptUpdated={handlePromptUpdated}
            tenantId={tenantId}
            categories={categories}
            mode="edit"
            prompt={selectedPrompt}
          />

          <DeletePromptDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setSelectedPrompt(null);
            }}
            onPromptDeleted={handlePromptDeleted}
            tenantId={tenantId}
            prompt={selectedPrompt}
          />

          <CopyPromptDialog
            isOpen={isCopyDialogOpen}
            onClose={() => {
              setIsCopyDialogOpen(false);
              setSelectedPrompt(null);
            }}
            onCopy={handleCopyPrompt}
            prompt={selectedPrompt}
          />
        </>
      )}
    </div>
  );
} 