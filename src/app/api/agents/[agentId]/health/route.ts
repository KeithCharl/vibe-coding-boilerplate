import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenantRole } from "@/server/actions/auth";
import { AgentFactory } from "@/lib/agents/concrete-agents";
import { AgentRegistryService } from "@/lib/agents/agent-registry";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    // For health checks, we can be more permissive with tenant access
    // but still verify if tenantId is provided
    if (tenantId) {
      const userRole = await getUserTenantRole(tenantId);
      if (!userRole) {
        return NextResponse.json({ error: "Access denied to tenant" }, { status: 403 });
      }
    }

    // Get the agent instance
    const agent = AgentFactory.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get health status from the agent
    const startTime = Date.now();
    const healthStatus = await agent.getHealthStatus();
    const checkDuration = Date.now() - startTime;

    // Update health metrics in the database
    await AgentRegistryService.updateHealthMetrics(
      agentId,
      {
        ...healthStatus,
        responseTime: checkDuration,
        lastHealthCheck: new Date()
      },
      tenantId || undefined
    );

    // Get historical health data if available
    const historicalHealth = tenantId 
      ? await AgentRegistryService.getAgentHealth(agentId, tenantId)
      : null;

    return NextResponse.json({
      agentId,
      health: healthStatus,
      checkDuration,
      historical: historicalHealth,
      checkedAt: new Date()
    });

  } catch (error) {
    console.error("Agent health check error:", error);
    return NextResponse.json(
      { 
        agentId: (await params).agentId,
        health: {
          status: 'offline',
          responseTime: 0,
          errorRate: 100,
          successRate: 0,
          lastHealthCheck: new Date(),
          uptime: 0
        },
        error: "Health check failed" 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, forceCheck = false } = body;

    if (tenantId) {
      const userRole = await getUserTenantRole(tenantId);
      if (!userRole) {
        return NextResponse.json({ error: "Access denied to tenant" }, { status: 403 });
      }
      
      // Only admins can force health checks
      if (forceCheck && userRole !== 'admin') {
        return NextResponse.json({ error: "Admin access required for forced health checks" }, { status: 403 });
      }
    }

    // Get the agent instance
    const agent = AgentFactory.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Perform health check
    const startTime = Date.now();
    const healthStatus = await agent.getHealthStatus();
    const checkDuration = Date.now() - startTime;

    // Update health metrics
    await AgentRegistryService.updateHealthMetrics(
      agentId,
      {
        ...healthStatus,
        responseTime: checkDuration,
        lastHealthCheck: new Date()
      },
      tenantId || undefined
    );

    return NextResponse.json({
      agentId,
      health: healthStatus,
      checkDuration,
      forced: forceCheck,
      checkedAt: new Date(),
      checkedBy: session.user.id
    });

  } catch (error) {
    console.error("Forced health check error:", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
} 