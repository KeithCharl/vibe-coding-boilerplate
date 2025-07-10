import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenantRole } from "@/server/actions/auth";
import { getAvailableAgents, getTenantAgentConfigs, getAgentHealth } from "@/server/actions/agents";
import { redirect } from "next/navigation";
import { AgentDashboard } from "@/components/agents/agent-dashboard";

interface AgentPageProps {
  params: {
    tenantId: string;
    agentId: string;
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Verify user has access to this tenant
  const userRole = await getUserTenantRole(params.tenantId);
  if (!userRole) {
    redirect("/");
  }

  // Get agent data
  const [availableAgents, tenantConfigs, healthData] = await Promise.all([
    getAvailableAgents(),
    getTenantAgentConfigs(params.tenantId),
    getAgentHealth(params.tenantId)
  ]);

  // Find the specific agent
  const agent = availableAgents.find((a) => a.id === params.agentId);
  if (!agent) {
    redirect(`/t/${params.tenantId}/agents`);
  }

  // Get agent-specific config and health
  const agentConfig = tenantConfigs.find((c) => c.agentId === params.agentId);
  const agentHealth = healthData.find((h) => h.agentId === params.agentId);

  return (
    <AgentDashboard
      agent={agent}
      config={agentConfig}
      health={agentHealth}
      tenantId={params.tenantId}
      userRole={userRole === 'admin' ? 'admin' : 'user'}
    />
  );
} 