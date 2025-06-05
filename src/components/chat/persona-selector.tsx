"use client";

import { useState, useEffect } from "react";
import { getPersonas, getChatSessionPersonas, applyChatSessionPersonas } from "@/server/actions/personas";
import { PersonaData } from "@/server/actions/personas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserCog, Settings, Check } from "lucide-react";
import { toast } from "sonner";

interface PersonaSelectorProps {
  tenantId: string;
  sessionId: string;
}

export function PersonaSelector({ tenantId, sessionId }: PersonaSelectorProps) {
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [appliedPersonaIds, setAppliedPersonaIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadPersonas();
    loadAppliedPersonas();
  }, [tenantId, sessionId]);

  const loadPersonas = async () => {
    try {
      const data = await getPersonas(tenantId);
      setPersonas(data);
    } catch (error) {
      console.error("Failed to load personas:", error);
      toast.error("Failed to load personas");
    }
  };

  const loadAppliedPersonas = async () => {
    try {
      const applied = await getChatSessionPersonas(tenantId, sessionId);
      const appliedIds = applied.map(p => p.id);
      setAppliedPersonaIds(appliedIds);
      setSelectedPersonaIds(appliedIds);
    } catch (error) {
      console.error("Failed to load applied personas:", error);
    }
  };

  const handlePersonaToggle = (personaId: string, checked: boolean) => {
    if (checked) {
      setSelectedPersonaIds(prev => [...prev, personaId]);
    } else {
      setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
    }
  };

  const handleApplyPersonas = async () => {
    try {
      setIsLoading(true);
      await applyChatSessionPersonas(tenantId, sessionId, selectedPersonaIds);
      setAppliedPersonaIds([...selectedPersonaIds]);
      setIsOpen(false);
      toast.success("Personas updated successfully!");
    } catch (error: any) {
      console.error("Failed to apply personas:", error);
      toast.error(error.message || "Failed to apply personas");
    } finally {
      setIsLoading(false);
    }
  };

  const appliedPersonas = personas.filter(p => appliedPersonaIds.includes(p.id));
  const hasChanges = JSON.stringify(selectedPersonaIds.sort()) !== JSON.stringify(appliedPersonaIds.sort());

  return (
    <div className="flex items-center gap-2">
      {/* Display applied personas */}
      {appliedPersonas.length > 0 && (
        <div className="flex gap-1 max-w-md overflow-x-auto">
          {appliedPersonas.map((persona) => (
            <Badge key={persona.id} variant="secondary" className="flex items-center gap-1">
              <UserCog className="h-3 w-3" />
              {persona.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Persona selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {appliedPersonas.length === 0 ? "Select Personas" : `${appliedPersonas.length} Active`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Chat Personas</h4>
              <p className="text-sm text-muted-foreground">
                Select personas to customize the AI's behavior and expertise
              </p>
            </div>

            {personas.length === 0 ? (
              <div className="text-center py-4">
                <UserCog className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No personas available. Create some in the Personas section.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {personas.map((persona) => (
                  <Card key={persona.id} className="p-0">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={persona.id}
                          checked={selectedPersonaIds.includes(persona.id)}
                          onCheckedChange={(checked) =>
                            handlePersonaToggle(persona.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={persona.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {persona.name}
                          </label>
                          {persona.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {persona.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {persona.systemPrompt}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {personas.length > 0 && (
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPersonaIds([]);
                  }}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyPersonas}
                  disabled={isLoading || !hasChanges}
                >
                  {isLoading ? (
                    "Applying..."
                  ) : hasChanges ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply Changes
                    </>
                  ) : (
                    "No Changes"
                  )}
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 