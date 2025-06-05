"use client";

import { useState } from "react";
import { PersonaData, updatePersona } from "@/server/actions/personas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const editPersonaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  systemPrompt: z.string().min(1, "System prompt is required").max(2000, "System prompt must be less than 2000 characters"),
});

type EditPersonaFormData = z.infer<typeof editPersonaSchema>;

interface EditPersonaDialogProps {
  persona: PersonaData;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPersonaDialog({ persona, tenantId, open, onOpenChange }: EditPersonaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditPersonaFormData>({
    resolver: zodResolver(editPersonaSchema),
    defaultValues: {
      name: persona.name,
      description: persona.description || "",
      systemPrompt: persona.systemPrompt,
    },
  });

  const onSubmit = async (data: EditPersonaFormData) => {
    try {
      setIsSubmitting(true);
      await updatePersona(tenantId, persona.id, data);
      toast.success("Persona updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update persona:", error);
      toast.error(error.message || "Failed to update persona");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Persona</DialogTitle>
          <DialogDescription>
            Update the persona's characteristics and behavior.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Tech Expert, Customer Support, Creative Writer" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this persona
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="A brief description of this persona's purpose" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify the persona's purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="You are a helpful AI assistant specialized in..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Define the persona's behavior, expertise, and response style
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Persona
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 