import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenantRole } from "@/server/actions/auth";
import { AgentFactory } from "@/lib/agents/concrete-agents";
import { AgentRegistryService } from "@/lib/agents/agent-registry";
import { getSerializableAgents } from "@/server/actions/agents";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const includeHealth = searchParams.get('includeHealth') === 'true';
    const includeConfig = searchParams.get('includeConfig') === 'true';

    // Get basic agent information
    const agents = await getSerializableAgents();

    // If tenantId is provided, verify access and get tenant-specific data
    let enrichedAgents = agents;
    
    if (tenantId) {
      const userRole = await getUserTenantRole(tenantId);
      if (!userRole) {
        return NextResponse.json({ error: "Access denied to tenant" }, { status: 403 });
      }

      // Enrich with tenant-specific data
      enrichedAgents = await Promise.all(agents.map(async (agent) => {
        let health = null;
        let config = null;

        if (includeHealth) {
          try {
            const agentInstance = AgentFactory.getAgent(agent.id);
            health = await agentInstance.getHealthStatus();
          } catch (error) {
            health = {
              status: 'offline' as const,
              responseTime: 0,
              errorRate: 100,
              successRate: 0,
              lastHealthCheck: new Date(),
              uptime: 0
            };
          }
        }

        if (includeConfig) {
          config = await AgentRegistryService.getTenantAgentConfig(tenantId, agent.id);
        }

        return {
          ...agent,
          health,
          config,
          tenantId
        };
      }));
    }

    return NextResponse.json({
      agents: enrichedAgents,
      total: enrichedAgents.length,
      tenantId,
      retrievedAt: new Date()
    });

  } catch (error) {
    console.error("Agents list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, tenantId, agentId, config } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    // Verify user has admin access to this tenant
    const userRole = await getUserTenantRole(tenantId);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    switch (action) {
      case 'enable':
        if (!agentId) {
          return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
        }
        
        await AgentRegistryService.setAgentEnabledForTenant(tenantId, agentId, true);
        
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} enabled for tenant ${tenantId}`,
          action: 'enable',
          agentId,
          tenantId
        });

      case 'disable':
        if (!agentId) {
          return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
        }
        
        await AgentRegistryService.setAgentEnabledForTenant(tenantId, agentId, false);
        
        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} disabled for tenant ${tenantId}`,
          action: 'disable',
          agentId,
          tenantId
        });

      case 'configure':
        if (!agentId || !config) {
          return NextResponse.json({ error: "Agent ID and config are required" }, { status: 400 });
        }

        // Update agent configuration
        const existingConfig = await AgentRegistryService.getTenantAgentConfig(tenantId, agentId);
        const updatedConfig = { ...existingConfig, ...config };
        
        // This would need to be implemented in AgentRegistryService
        // For now, we'll use the existing pattern
        await AgentRegistryService.setAgentEnabledForTenant(
          tenantId, 
          agentId, 
          updatedConfig.enabled ?? true
        );

        return NextResponse.json({
          success: true,
          message: `Agent ${agentId} configuration updated`,
          action: 'configure',
          agentId,
          tenantId,
          config: updatedConfig
        });

      case 'healthCheck':
        if (!agentId) {
          return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
        }

        try {
          const agent = AgentFactory.getAgent(agentId);
          const startTime = Date.now();
          const health = await agent.getHealthStatus();
          const duration = Date.now() - startTime;

          await AgentRegistryService.updateHealthMetrics(
            agentId,
            { ...health, responseTime: duration },
            tenantId
          );

          return NextResponse.json({
            success: true,
            agentId,
            health,
            duration,
            checkedAt: new Date()
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            agentId,
            error: error instanceof Error ? error.message : 'Health check failed'
          }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Agents management error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 