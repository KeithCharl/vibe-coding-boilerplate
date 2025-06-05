import { getPersonas } from "@/server/actions/personas";
import { requireAuth } from "@/server/actions/auth";
import { PersonasList } from "@/components/personas/personas-list";
import { CreatePersonaButton } from "@/components/personas/create-persona-button";
import { UserCog, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonasPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function PersonasPage({ params }: PersonasPageProps) {
  const { tenantId } = await params;
  
  // Ensure user has access to this tenant
  await requireAuth(tenantId, "viewer");

  // Fetch personas for this tenant
  const personas = await getPersonas(tenantId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            Personas
          </h1>
          <p className="text-muted-foreground">
            Create and manage AI personas to customize chat behavior for different use cases.
          </p>
        </div>
        <CreatePersonaButton tenantId={tenantId} />
      </div>

      {personas.length > 0 ? (
        <PersonasList personas={personas} tenantId={tenantId} />
      ) : (
        <div className="text-center py-12">
          <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No personas created yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Personas allow you to define different AI personalities and behaviors. 
            Create your first persona to get started.
          </p>
          <CreatePersonaButton tenantId={tenantId} variant="default" />
        </div>
      )}
    </div>
  );
} 