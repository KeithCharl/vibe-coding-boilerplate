"use client";

import { useState } from "react";
import { PersonaData, deletePersona } from "@/server/actions/personas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeletePersonaDialogProps {
  persona: PersonaData;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletePersonaDialog({ persona, tenantId, open, onOpenChange }: DeletePersonaDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deletePersona(tenantId, persona.id);
      toast.success("Persona deleted successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to delete persona:", error);
      toast.error(error.message || "Failed to delete persona");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Persona
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the persona "{persona.name}"? This action cannot be undone.
            The persona will be removed from any active chat sessions.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Persona
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 