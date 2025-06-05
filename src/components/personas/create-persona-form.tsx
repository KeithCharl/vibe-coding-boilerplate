"use client";

import { useState } from "react";
import { createPersona } from "@/server/actions/personas";
import { Button } from "@/components/ui/button";
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

const createPersonaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  systemPrompt: z.string().min(1, "System prompt is required").max(2000, "System prompt must be less than 2000 characters"),
});

type CreatePersonaFormData = z.infer<typeof createPersonaSchema>;

interface CreatePersonaFormProps {
  tenantId: string;
  onSuccess: () => void;
}

export function CreatePersonaForm({ tenantId, onSuccess }: CreatePersonaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePersonaFormData>({
    resolver: zodResolver(createPersonaSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
    },
  });

  const onSubmit = async (data: CreatePersonaFormData) => {
    try {
      setIsSubmitting(true);
      await createPersona(tenantId, data);
      toast.success("Persona created successfully!");
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create persona:", error);
      toast.error(error.message || "Failed to create persona");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Persona
          </Button>
        </div>
      </form>
    </Form>
  );
} 