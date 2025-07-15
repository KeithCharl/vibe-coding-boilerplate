"use client";

import { useState } from "react";
import { createPersona, generatePersonaWithAI, refinePersonaWithAI } from "@/server/actions/personas";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles, RefreshCw, Copy, Check } from "lucide-react";

const createPersonaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  systemPrompt: z.string().min(1, "System prompt is required").max(2000, "System prompt must be less than 2000 characters"),
});

const aiGenerationSchema = z.object({
  description: z.string().min(10, "Please provide a detailed description (at least 10 characters)"),
  expertise: z.string().optional(),
  tone: z.string().optional(),
  style: z.string().optional(),
  constraints: z.string().optional(),
});

type CreatePersonaFormData = z.infer<typeof createPersonaSchema>;
type AIGenerationFormData = z.infer<typeof aiGenerationSchema>;

interface CreatePersonaFormProps {
  tenantId: string;
  onSuccess: () => void;
}

export function CreatePersonaForm({ tenantId, onSuccess }: CreatePersonaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [generatedPersona, setGeneratedPersona] = useState<{
    name: string;
    description: string;
    systemPrompt: string;
  } | null>(null);
  const [refinementRequest, setRefinementRequest] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const form = useForm<CreatePersonaFormData>({
    resolver: zodResolver(createPersonaSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
    },
  });

  const aiForm = useForm<AIGenerationFormData>({
    resolver: zodResolver(aiGenerationSchema),
    defaultValues: {
      description: "",
      expertise: "",
      tone: "",
      style: "",
      constraints: "",
    },
  });

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

  const onAIGenerate = async (data: AIGenerationFormData) => {
    try {
      setIsGenerating(true);
      const result = await generatePersonaWithAI(tenantId, data.description, {
        expertise: data.expertise,
        tone: data.tone,
        style: data.style,
        constraints: data.constraints,
      });

      if (result.success) {
        setGeneratedPersona(result.persona);
        toast.success("AI generated persona successfully!");
      }
    } catch (error: any) {
      console.error("Failed to generate persona:", error);
      toast.error(error.message || "Failed to generate persona with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const onRefinePersona = async () => {
    if (!generatedPersona || !refinementRequest.trim()) {
      toast.error("Please provide refinement instructions");
      return;
    }

    try {
      setIsRefining(true);
      const result = await refinePersonaWithAI(tenantId, generatedPersona, refinementRequest);

      if (result.success) {
        setGeneratedPersona(result.persona);
        setRefinementRequest("");
        toast.success("Persona refined successfully!");
        toast.info(result.changes);
      }
    } catch (error: any) {
      console.error("Failed to refine persona:", error);
      toast.error(error.message || "Failed to refine persona");
    } finally {
      setIsRefining(false);
    }
  };

  const useGeneratedPersona = () => {
    if (!generatedPersona) return;

    form.setValue("name", generatedPersona.name);
    form.setValue("description", generatedPersona.description);
    form.setValue("systemPrompt", generatedPersona.systemPrompt);
    setActiveTab("manual");
    toast.success("Generated persona loaded into form");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI Persona Generator
              </CardTitle>
              <CardDescription>
                Describe what kind of persona you need, and AI will help create it for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...aiForm}>
                <form onSubmit={aiForm.handleSubmit(onAIGenerate)} className="space-y-4">
                  <FormField
                    control={aiForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the persona you want to create. For example: 'I need a technical support specialist who can help users troubleshoot software issues with patience and clear explanations'"
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a detailed description of the persona's role and characteristics
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aiForm.control}
                      name="expertise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expertise Focus (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Software development, Marketing, Customer service"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Tone (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Professional, Friendly, Casual, Academic"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Communication Style (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Concise, Detailed, Step-by-step"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="constraints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Constraints (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Keep responses under 200 words"
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isGenerating} variant="ghost" className="flex items-center gap-2 btn-bancon-primary">
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate Persona
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {generatedPersona && (
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-200">Generated Persona ✨</CardTitle>
                <CardDescription>
                  Review the AI-generated persona and refine if needed. Scroll down to see save options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="max-h-[50vh] pr-4">
                  <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Name</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedPersona.name, "Name")}
                      >
                        {copiedField === "Name" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{generatedPersona.name}</p>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Description</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedPersona.description, "Description")}
                      >
                        {copiedField === "Description" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{generatedPersona.description}</p>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">System Prompt</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generatedPersona.systemPrompt, "System Prompt")}
                      >
                        {copiedField === "System Prompt" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {generatedPersona.systemPrompt}
                    </pre>
                  </div>
                </div>
                </ScrollArea>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Refine Persona</h4>
                  <Textarea
                    placeholder="Describe how you'd like to improve this persona (e.g., 'Make it more technical', 'Add examples', 'Make responses shorter')"
                    value={refinementRequest}
                    onChange={(e) => setRefinementRequest(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={onRefinePersona}
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
                  <h4 className="text-sm font-medium">Save Persona</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose how to proceed with this AI-generated persona
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={async () => {
                        if (!generatedPersona) {
                          toast.error("No persona generated to save");
                          return;
                        }

                        console.log("Saving persona:", generatedPersona);
                        
                        try {
                          setIsSubmitting(true);
                          const result = await createPersona(tenantId, {
                            name: generatedPersona.name,
                            description: generatedPersona.description,
                            systemPrompt: generatedPersona.systemPrompt,
                          });
                          
                          console.log("Save result:", result);
                          toast.success("Persona saved successfully!");
                          onSuccess();
                        } catch (error: any) {
                          console.error("Failed to save persona:", error);
                          toast.error(error.message || "Failed to save persona");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting || !generatedPersona}
                      className="w-full"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      💾 Save Persona Directly
                    </Button>
                    
                    <Button
                      onClick={useGeneratedPersona}
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
    </div>
  );
} 