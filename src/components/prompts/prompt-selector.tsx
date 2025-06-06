"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Filter, Globe, Lock } from 'lucide-react';
import { getPrompts, getPromptCategories, incrementPromptUsage, type Prompt } from '@/server/actions/prompts';
import { toast } from 'sonner';

interface PromptSelectorProps {
  tenantId: string;
  onPromptSelect: (content: string, prompt: Prompt) => void;
  trigger?: React.ReactNode;
  placeholder?: string;
}

export function PromptSelector({ 
  tenantId, 
  onPromptSelect, 
  trigger,
  placeholder = "Select a prompt..." 
}: PromptSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && prompts.length === 0) {
      loadPrompts();
    }
  }, [isOpen, tenantId]);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const [promptsData, categoriesData] = await Promise.all([
        getPrompts(tenantId),
        getPromptCategories(tenantId),
      ]);
      setPrompts(promptsData);
      setCategories(categoriesData.filter((cat): cat is string => cat !== null));
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = searchTerm === '' || 
      prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handlePromptSelect = async (prompt: Prompt) => {
    try {
      // Track usage
      await incrementPromptUsage(tenantId, prompt.id);
      
      onPromptSelect(prompt.content, prompt);
      setIsOpen(false);
      toast.success(`Applied prompt: ${prompt.name}`);
    } catch (error) {
      console.error('Error selecting prompt:', error);
      // Still allow the prompt to be used even if tracking fails
      onPromptSelect(prompt.content, prompt);
      setIsOpen(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="w-full justify-start">
      <FileText className="h-4 w-4 mr-2" />
      {placeholder}
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-semibold mb-3">Select a Prompt</h4>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
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
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm || selectedCategory !== 'all' 
                ? 'No prompts match your criteria.' 
                : 'No prompts available.'
              }
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredPrompts.map((prompt) => (
                <Card 
                  key={prompt.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePromptSelect(prompt)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm truncate">{prompt.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        {prompt.isPublic ? (
                          <Globe className="h-3 w-3 text-green-600" />
                        ) : (
                          <Lock className="h-3 w-3 text-orange-600" />
                        )}
                      </div>
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {prompt.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {prompt.content}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {prompt.category && (
                        <Badge variant="outline" className="text-xs h-5">
                          {prompt.category}
                        </Badge>
                      )}
                      {prompt.usageCount !== null && prompt.usageCount > 0 && (
                        <Badge variant="secondary" className="text-xs h-5">
                          {prompt.usageCount} uses
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 