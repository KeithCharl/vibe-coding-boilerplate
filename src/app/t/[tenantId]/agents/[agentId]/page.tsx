import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenantRole } from "@/server/actions/auth";
import { getAvailableAgents, getTenantAgentConfigs, getAgentHealth } from "@/server/actions/agents";
import { redirect } from "next/navigation";
import { AgentDashboard } from "@/components/agents/agent-dashboard";

interface AgentPageProps {
  params: Promise<{
    tenantId: string;
    agentId: string;
  }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { tenantId, agentId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Verify user has access to this tenant
  const userRole = await getUserTenantRole(tenantId);
  if (!userRole) {
    redirect("/");
  }

  // Get agent data
  const [availableAgents, tenantConfigs, healthData] = await Promise.all([
    getAvailableAgents(),
    getTenantAgentConfigs(tenantId),
    getAgentHealth(tenantId)
  ]);

  // Find the specific agent
  const agent = availableAgents.find((a) => a.id === agentId);
  if (!agent) {
    redirect(`/t/${tenantId}/agents`);
  }

  // Get agent-specific config and health
  const rawConfig = tenantConfigs.find((c) => c.agentId === agentId);
  const rawHealth = healthData.find((h) => h.agentId === agentId);

  // Transform config to match component expectations
  const agentConfig = rawConfig ? {
    isEnabled: rawConfig.isEnabled ?? false,
    accessLevel: rawConfig.accessLevel,
    customConfig: (rawConfig.customConfig as Record<string, any>) ?? {},
    dailyRequestLimit: rawConfig.dailyRequestLimit ?? undefined,
    monthlyRequestLimit: rawConfig.monthlyRequestLimit ?? undefined,
    encryptionRequired: rawConfig.encryptionRequired ?? false,
    auditingRequired: rawConfig.auditingRequired ?? false,
  } : undefined;

  // Transform health to match component expectations
  const agentHealth = rawHealth ? {
    status: rawHealth.status,
    responseTime: rawHealth.responseTime ?? undefined,
    errorRate: rawHealth.errorRate ?? undefined,
    uptime: rawHealth.uptime ?? undefined,
    lastHealthCheck: rawHealth.lastHealthCheck ?? undefined,
  } : undefined;

  return (
    <AgentDashboard
      agent={agent}
      config={agentConfig}
      health={agentHealth}
      tenantId={tenantId}
      userRole={userRole === 'admin' ? 'admin' : 'user'}
    />
  );
} 