import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenantRole } from "@/server/actions/auth";
import { getSerializableAgents, getTenantAgentConfigs, getAgentHealth } from "@/server/actions/agents";
import { MultiAgentHub } from "@/components/agents/multi-agent-hub";
import { redirect } from "next/navigation";

interface AgentsPageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function AgentsPage({ params }: AgentsPageProps) {
  const { tenantId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Verify user has access to this tenant
  const userRole = await getUserTenantRole(tenantId);
  if (!userRole) {
    redirect("/");
  }

  // Get agent data for this tenant
  const [availableAgents, tenantConfigs, healthData] = await Promise.all([
    getSerializableAgents(),
    getTenantAgentConfigs(tenantId),
    getAgentHealth(tenantId)
  ]);

  // Merge agent definitions with tenant-specific configs and health data
  const agentsWithConfig = availableAgents.map((agent) => ({
    ...agent,
    config: tenantConfigs.find((c) => c.agentId === agent.id),
    health: healthData.find((h) => h.agentId === agent.id)
  }));

  return (
    <MultiAgentHub 
      agents={agentsWithConfig}
      tenantId={tenantId}
      userRole={userRole === 'admin' ? 'admin' : 'user'}
    />
  );
} 