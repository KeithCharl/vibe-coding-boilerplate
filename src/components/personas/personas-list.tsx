"use client";

import { useState } from "react";
import { PersonaData } from "@/server/actions/personas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Trash2, UserCog } from "lucide-react";
import { EditPersonaDialog } from "./edit-persona-dialog";
import { DeletePersonaDialog } from "./delete-persona-dialog";

interface PersonasListProps {
  personas: PersonaData[];
  tenantId: string;
}

export function PersonasList({ personas, tenantId }: PersonasListProps) {
  const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null);
  const [deletingPersona, setDeletingPersona] = useState<PersonaData | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <Card key={persona.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{persona.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingPersona(persona)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeletingPersona(persona)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {persona.description && (
                <CardDescription className="text-sm">
                  {persona.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    System Prompt
                  </label>
                  <p className="text-sm mt-1 line-clamp-3">
                    {persona.systemPrompt}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {persona.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(persona.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingPersona && (
        <EditPersonaDialog
          persona={editingPersona}
          tenantId={tenantId}
          open={!!editingPersona}
          onOpenChange={(open) => !open && setEditingPersona(null)}
        />
      )}

      {deletingPersona && (
        <DeletePersonaDialog
          persona={deletingPersona}
          tenantId={tenantId}
          open={!!deletingPersona}
          onOpenChange={(open) => !open && setDeletingPersona(null)}
        />
      )}
    </>
  );
} 