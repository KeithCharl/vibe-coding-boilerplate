import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenantRole } from "@/server/actions/auth";
import { AgentFactory } from "@/lib/agents/concrete-agents";
import { AgentRegistryService } from "@/lib/agents/agent-registry";
import { db } from "@/server/db";
import { agentCommunicationLog } from "@/server/db/schema";

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
    const { tenantId, operation, data, options = {} } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    // Verify user has access to this tenant
    const userRole = await getUserTenantRole(tenantId);
    if (!userRole) {
      return NextResponse.json({ error: "Access denied to tenant" }, { status: 403 });
    }

    // Check if agent is enabled for this tenant
    const agentConfig = await AgentRegistryService.getTenantAgentConfig(tenantId, agentId);
    if (agentConfig && !agentConfig.enabled) {
      return NextResponse.json({ error: "Agent is disabled for this tenant" }, { status: 403 });
    }

    // Get the agent instance
    const agent = AgentFactory.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Prepare the request for the agent
    const agentRequest = {
      type: operation,
      tenantId,
      userId: session.user.id,
      ...data,
      options
    };

    // Validate the request
    if (!agent.validateRequest(agentRequest)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    const startTime = Date.now();
    
    try {
      // Execute the agent request
      const result = await agent.processRequest(agentRequest, {
        userRole,
        sessionId: session.user.id,
        timestamp: new Date()
      });

      const duration = Date.now() - startTime;

      // Log the successful communication
      await AgentRegistryService.logAgentCommunication(
        'api',
        agentId,
        operation,
        agentRequest,
        result,
        'completed',
        tenantId,
        session.user.id,
        duration
      );

      // Update agent health metrics
      await AgentRegistryService.updateHealthMetrics(
        agentId,
        {
          status: 'healthy',
          responseTime: duration,
          successRate: 100,
          lastHealthCheck: new Date()
        },
        tenantId
      );

      return NextResponse.json({
        success: true,
        agentId,
        operation,
        result,
        duration,
        executedAt: new Date()
      });

    } catch (executionError) {
      const duration = Date.now() - startTime;
      const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown error';

      // Log the failed communication
      await AgentRegistryService.logAgentCommunication(
        'api',
        agentId,
        operation,
        agentRequest,
        { error: errorMessage },
        'failed',
        tenantId,
        session.user.id,
        duration
      );

      // Update agent health metrics
      await AgentRegistryService.updateHealthMetrics(
        agentId,
        {
          status: 'unhealthy',
          responseTime: duration,
          errorRate: 100,
          lastHealthCheck: new Date()
        },
        tenantId
      );

      return NextResponse.json({
        success: false,
        agentId,
        operation,
        error: errorMessage,
        duration,
        executedAt: new Date()
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    // Verify user has access to this tenant
    const userRole = await getUserTenantRole(tenantId);
    if (!userRole) {
      return NextResponse.json({ error: "Access denied to tenant" }, { status: 403 });
    }

    // Get agent capabilities and status
    const agent = AgentFactory.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const healthStatus = await agent.getHealthStatus();
    const agentConfig = await AgentRegistryService.getTenantAgentConfig(tenantId, agentId);

    return NextResponse.json({
      agentId,
      capabilities: (agent as any).capabilities || [],
      health: healthStatus,
      config: agentConfig,
      availableOperations: getAvailableOperations(agentId)
    });

  } catch (error) {
    console.error("Agent info error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getAvailableOperations(agentId: string): string[] {
  switch (agentId) {
    case 'knowledge-base':
      return ['search', 'analyze', 'generate'];
    case 'business-rules':
      return ['validate', 'audit', 'monitor'];
    case 'testing':
      return ['runTests', 'validateQuality', 'performanceTest'];
    case 'workflow':
      return ['execute', 'schedule', 'monitor'];
    case 'analytics':
      return ['generateReport', 'analyzeData', 'getDashboard'];
    default:
      return [];
  }
} 