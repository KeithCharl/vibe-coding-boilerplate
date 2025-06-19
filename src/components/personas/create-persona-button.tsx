"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePersonaForm } from "./create-persona-form";

interface CreatePersonaButtonProps {
  tenantId: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export function CreatePersonaButton({ tenantId, variant = "outline" }: CreatePersonaButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus className="h-4 w-4 mr-2" />
          Create Persona
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Persona</DialogTitle>
          <DialogDescription>
            Define a new AI persona with specific characteristics and behavior.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto">
          <CreatePersonaForm tenantId={tenantId} onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
} 