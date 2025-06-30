"use server";

import { db } from "@/server/db";
import { 
  agentRegistry, 
  tenantAgentConfigs, 
  agentHealthMetrics,
  agentCommunicationLog,
  agentSecurityEvents
} from "@/server/db/schema";
import { eq, and, desc, count, sql, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AgentRegistryService, type AgentDefinition, type AgentConfig } from "@/lib/agents/agent-registry";
import { getServerAuthSession } from "@/server/auth";
import { redirect } from "next/navigation";

// ===== AGENT INITIALIZATION =====

export async function initializeAgentSystem() {
  try {
    // Initialize core agents in the database
    await AgentRegistryService.initializeCoreAgents();
    
    revalidatePath("/");
    return { success: true, message: "Agent system initialized successfully" };
  } catch (error) {
    console.error("Failed to initialize agent system:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ===== AGENT REGISTRY MANAGEMENT =====

export async function getAvailableAgents(): Promise<AgentDefinition[]> {
  try {
    return await AgentRegistryService.getAvailableAgents();
  } catch (error) {
    console.error("Failed to get available agents:", error);
    return [];
  }
}

export async function getEnabledAgentsForTenant(tenantId: string): Promise<AgentDefinition[]> {
  try {
    return await AgentRegistryService.getEnabledAgentsForTenant(tenantId);
  } catch (error) {
    console.error("Failed to get enabled agents for tenant:", error);
    return [];
  }
}

// ===== AGENT CONFIGURATION =====

export async function updateTenantAgentConfig(
  tenantId: string,
  agentId: string,
  config: Partial<AgentConfig>
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  try {
    // Check if configuration exists
    const existing = await db.select()
      .from(tenantAgentConfigs)
      .where(and(
        eq(tenantAgentConfigs.tenantId, tenantId),
        eq(tenantAgentConfigs.agentId, agentId)
      ))
      .limit(1);

    const updateData = {
      isEnabled: config.enabled ?? true,
      accessLevel: config.accessLevel ?? 'standard',
      customConfig: config.customSettings ?? {},
      dailyRequestLimit: config.resourceLimits?.dailyRequests,
      monthlyRequestLimit: config.resourceLimits?.monthlyRequests,
      tokenQuotaDaily: config.resourceLimits?.tokenQuotaDaily,
      tokenQuotaMonthly: config.resourceLimits?.tokenQuotaMonthly,
      encryptionRequired: config.securitySettings?.encryptionRequired ?? false,
      auditingRequired: config.securitySettings?.auditingRequired ?? true,
      ipWhitelist: config.securitySettings?.ipWhitelist,
      updatedAt: new Date(),
    };

    if (existing[0]) {
      // Update existing configuration
      await db.update(tenantAgentConfigs)
        .set(updateData)
        .where(and(
          eq(tenantAgentConfigs.tenantId, tenantId),
          eq(tenantAgentConfigs.agentId, agentId)
        ));
    } else {
      // Create new configuration
      await db.insert(tenantAgentConfigs).values({
        tenantId,
        agentId,
        ...updateData,
      });
    }

    revalidatePath(`/t/${tenantId}/settings`);
    return { success: true, message: "Agent configuration updated successfully" };
  } catch (error) {
    console.error("Failed to update agent configuration:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function enableAgentForTenant(
  tenantId: string, 
  agentId: string, 
  enabled: boolean
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  try {
    await AgentRegistryService.setAgentEnabledForTenant(tenantId, agentId, enabled);
    
    revalidatePath(`/t/${tenantId}/settings`);
    return { 
      success: true, 
      message: `Agent ${enabled ? 'enabled' : 'disabled'} successfully` 
    };
  } catch (error) {
    console.error("Failed to update agent status:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ===== AGENT HEALTH MONITORING =====

export async function getAgentHealthMetrics(tenantId?: string) {
  try {
    const agents = await AgentRegistryService.getAvailableAgents();
    const healthPromises = agents.map(async (agent) => {
      const health = await AgentRegistryService.getAgentHealth(agent.id, tenantId);
      return {
        agent,
        health: health || {
          status: 'offline' as const,
          responseTime: 0,
          errorRate: 0,
          successRate: 0,
          lastHealthCheck: new Date(),
          uptime: 0,
        }
      };
    });

    const results = await Promise.all(healthPromises);
    return results;
  } catch (error) {
    console.error("Failed to get agent health metrics:", error);
    return [];
  }
}

export async function updateAgentHealth(
  agentId: string,
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
    responseTime?: number;
    errorRate?: number;
    successRate?: number;
    uptime?: number;
  },
  tenantId?: string
) {
  try {
    await AgentRegistryService.updateHealthMetrics(agentId, health, tenantId);
    
    revalidatePath('/admin');
    if (tenantId) {
      revalidatePath(`/t/${tenantId}/settings`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update agent health:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ===== AGENT ANALYTICS =====

export async function getAgentUsageAnalytics(tenantId?: string, days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get communication logs for the specified period
    const communicationLogs = await db.select({
      sourceAgentId: agentCommunicationLog.sourceAgentId,
      targetAgentId: agentCommunicationLog.targetAgentId,
      operationType: agentCommunicationLog.operationType,
      status: agentCommunicationLog.status,
      duration: agentCommunicationLog.duration,
      tokensUsed: agentCommunicationLog.tokensUsed,
      timestamp: agentCommunicationLog.timestamp,
    })
    .from(agentCommunicationLog)
    .where(and(
      gte(agentCommunicationLog.timestamp, startDate),
      tenantId ? eq(agentCommunicationLog.tenantId, tenantId) : sql`1=1`
    ));

    // Get agent request counts
    const requestCounts = await db.select({
      agentId: agentCommunicationLog.targetAgentId,
      count: count(),
    })
    .from(agentCommunicationLog)
    .where(and(
      gte(agentCommunicationLog.timestamp, startDate),
      tenantId ? eq(agentCommunicationLog.tenantId, tenantId) : sql`1=1`
    ))
    .groupBy(agentCommunicationLog.targetAgentId);

    // Get error rates
    const errorRates = await db.select({
      agentId: agentCommunicationLog.targetAgentId,
      totalRequests: count(),
      errorCount: count(sql`CASE WHEN ${agentCommunicationLog.status} = 'failed' THEN 1 END`),
    })
    .from(agentCommunicationLog)
    .where(and(
      gte(agentCommunicationLog.timestamp, startDate),
      tenantId ? eq(agentCommunicationLog.tenantId, tenantId) : sql`1=1`
    ))
    .groupBy(agentCommunicationLog.targetAgentId);

    return {
      communicationLogs,
      requestCounts,
      errorRates,
      period: { days, startDate, endDate: new Date() }
    };
  } catch (error) {
    console.error("Failed to get agent analytics:", error);
    return {
      communicationLogs: [],
      requestCounts: [],
      errorRates: [],
      period: { days, startDate: new Date(), endDate: new Date() }
    };
  }
}

// ===== SECURITY EVENTS =====

export async function logSecurityEvent(
  agentId: string,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  metadata?: {
    sourceIP?: string;
    userAgent?: string;
    requestPath?: string;
    requestData?: any;
    tenantId?: string;
    userId?: string;
  }
) {
  try {
    await db.insert(agentSecurityEvents).values({
      agentId,
      tenantId: metadata?.tenantId,
      userId: metadata?.userId,
      eventType,
      severity,
      description,
      sourceIP: metadata?.sourceIP,
      userAgent: metadata?.userAgent,
      requestPath: metadata?.requestPath,
      requestData: metadata?.requestData,
      blocked: severity === 'critical',
      resolved: false,
      riskScore: severity === 'critical' ? 90 : severity === 'high' ? 70 : severity === 'medium' ? 40 : 10,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to log security event:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function getSecurityEvents(tenantId?: string, severity?: string) {
  try {
    const events = await db.select()
      .from(agentSecurityEvents)
      .where(and(
        tenantId ? eq(agentSecurityEvents.tenantId, tenantId) : sql`1=1`,
        severity ? eq(agentSecurityEvents.severity, severity) : sql`1=1`,
        eq(agentSecurityEvents.resolved, false)
      ))
      .orderBy(desc(agentSecurityEvents.timestamp))
      .limit(100);

    return events;
  } catch (error) {
    console.error("Failed to get security events:", error);
    return [];
  }
}

export async function resolveSecurityEvent(
  eventId: string,
  resolutionNotes: string
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  try {
    await db.update(agentSecurityEvents)
      .set({
        resolved: true,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
        resolutionNotes,
      })
      .where(eq(agentSecurityEvents.id, eventId));

    revalidatePath('/admin');
    return { success: true, message: "Security event resolved successfully" };
  } catch (error) {
    console.error("Failed to resolve security event:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
} 