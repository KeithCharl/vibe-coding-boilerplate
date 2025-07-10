import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { getSerializableAgents, type SerializableAgent } from "@/server/actions/agents";
import { MultiAgentHub } from "@/components/agents/multi-agent-hub";
import { LandingPage } from "@/components/landing-page";
import { TenantSelector } from "@/components/agents/tenant-selector";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If user is not authenticated, show the marketing landing page
  if (!session?.user) {
    return <LandingPage />;
  }

  // Get user's tenants and available agents
  const userTenants = await getUserTenants();
  let availableAgents: SerializableAgent[] = [];
  
  try {
    availableAgents = await getSerializableAgents();
  } catch (error) {
    console.error("Failed to get available agents:", error);
    availableAgents = [];
  }

  // If user has no tenants, show tenant creation flow
  if (userTenants.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Welcome to the Enterprise Agent Platform
              </h1>
              <p className="text-xl text-muted-foreground">
                Get started by creating your first workspace to access our AI agents.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border">
              <h2 className="text-2xl font-semibold mb-4">Create Your First Workspace</h2>
              <p className="text-muted-foreground mb-6">
                Workspaces allow you to organize your AI agents and collaborate with your team.
              </p>
              <a 
                href="/create-tenant"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Workspace
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user has only one tenant, show the multi-agent hub directly
  if (userTenants.length === 1) {
    return <MultiAgentHub tenantId={userTenants[0].tenantId} agents={availableAgents} />;
  }

  // If user has multiple tenants, show tenant selector with agent preview
  return (
    <TenantSelector
      userTenants={userTenants}
      availableAgents={availableAgents}
      userEmail={session.user.email || ""}
    />
  );
}
