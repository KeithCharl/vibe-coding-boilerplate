"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Globe, Lock } from 'lucide-react';
import { incrementPromptUsage, type Prompt } from '@/server/actions/prompts';
import { toast } from 'sonner';

interface CopyPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (content: string) => void;
  prompt: Prompt;
}

export function CopyPromptDialog({ 
  isOpen, 
  onClose, 
  onCopy, 
  prompt 
}: CopyPromptDialogProps) {
  const [copied, setCopied] = useState(false);
  const [editableContent, setEditableContent] = useState(prompt.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
      setCopied(true);
      
      // Track usage
      await incrementPromptUsage(prompt.tenantId, prompt.id);
      
      setTimeout(() => {
        setCopied(false);
        onCopy(editableContent);
      }, 1000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    setEditableContent(prompt.content); // Reset content when closing
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{prompt.name}</DialogTitle>
              {prompt.description && (
                <p className="text-muted-foreground mt-1">{prompt.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {prompt.isPublic ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-orange-600" />
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            {prompt.category && (
              <Badge variant="secondary">{prompt.category}</Badge>
            )}
            {prompt.tags && prompt.tags.length > 0 && 
              prompt.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))
            }
            {prompt.usageCount !== null && prompt.usageCount > 0 && (
              <Badge variant="outline">
                Used {prompt.usageCount} times
              </Badge>
            )}
          </div>

          {/* Editable Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Prompt Content (you can edit before copying)
            </label>
            <Textarea
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              rows={10}
              className="resize-none"
              placeholder="Prompt content..."
            />
          </div>

          {/* Character count */}
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {editableContent.length} characters
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!editableContent.trim()}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 