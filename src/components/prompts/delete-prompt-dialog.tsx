"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { deletePrompt, type Prompt } from '@/server/actions/prompts';
import { toast } from 'sonner';

interface DeletePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptDeleted: (promptId: string) => void;
  tenantId: string;
  prompt: Prompt;
}

export function DeletePromptDialog({ 
  isOpen, 
  onClose, 
  onPromptDeleted, 
  tenantId, 
  prompt 
}: DeletePromptDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      await deletePrompt(tenantId, prompt.id);
      onPromptDeleted(prompt.id);
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete prompt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <DialogTitle>Delete Prompt</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this prompt? This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md bg-muted p-4">
            <h4 className="font-semibold">{prompt.name}</h4>
            {prompt.description && (
              <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {prompt.content}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 