import { db } from "@/server/db";
import { 
  agentRegistry, 
  tenantAgentConfigs, 
  agentHealthMetrics,
  agentCommunicationLog,
  agentSecurityEvents,
  agentTypeEnum,
  agentStatusEnum,
  agentCapabilityEnum
} from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Brain, Shield, TestTube, GitBranch, BarChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ===== TYPE DEFINITIONS =====

export type AgentTypeEnum = typeof agentTypeEnum.enumValues[number];
export type AgentStatusEnum = typeof agentStatusEnum.enumValues[number];
export type AgentCapabilityEnum = typeof agentCapabilityEnum.enumValues[number];

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentTypeEnum;
  version: string;
  description: string;
  baseRoute: string;
  icon: LucideIcon;
  color: string;
  capabilities: AgentCapabilityEnum[];
  dependencies: string[];
  isCore: boolean;
  securityLevel: 'basic' | 'standard' | 'high' | 'critical';
  status: AgentStatusEnum;
}

export interface AgentConfig {
  enabled: boolean;
  accessLevel: 'readonly' | 'standard' | 'advanced' | 'admin';
  customSettings: Record<string, any>;
  resourceLimits: {
    dailyRequests?: number;
    monthlyRequests?: number;
    tokenQuotaDaily?: number;
    tokenQuotaMonthly?: number;
  };
  securitySettings: {
    encryptionRequired: boolean;
    auditingRequired: boolean;
    ipWhitelist?: string[];
  };
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  errorRate: number;
  successRate: number;
  lastHealthCheck: Date;
  uptime: number;
}

export interface InterAgentMessage {
  sourceAgentId: string;
  targetAgentId: string;
  operationType: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface AgentCommunicationResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  tokensUsed?: number;
}

// ===== CORE AGENTS REGISTRY =====

export const CORE_AGENTS: Record<string, AgentDefinition> = {
  'knowledge-base': {
    id: 'knowledge-base',
    name: 'Knowledge Base Agent',
    type: 'knowledge_base' as AgentTypeEnum,
    version: '2.0.0',
    description: 'Advanced document search, analysis, and retrieval with AI-powered insights',
    baseRoute: '/agents/knowledge-base',
    icon: Brain,
    color: 'blue',
    capabilities: ['search', 'analyze', 'generate'],
    dependencies: [],
    isCore: true,
    securityLevel: 'high',
    status: 'active' as AgentStatusEnum,
  },
  'business-rules': {
    id: 'business-rules',
    name: 'Business Rules Agent',
    type: 'business_rules' as AgentTypeEnum,
    version: '1.0.0',
    description: 'Automated business logic validation, rule enforcement, and compliance checking',
    baseRoute: '/agents/business-rules',
    icon: Shield,
    color: 'green',
    capabilities: ['validate', 'audit', 'monitor'],
    dependencies: ['knowledge-base'],
    isCore: true,
    securityLevel: 'critical',
    status: 'active' as AgentStatusEnum,
  },
  'testing': {
    id: 'testing',
    name: 'Testing Agent',
    type: 'testing' as AgentTypeEnum,
    version: '1.0.0',
    description: 'Automated testing, quality assurance, and performance validation',
    baseRoute: '/agents/testing',
    icon: TestTube,
    color: 'purple',
    capabilities: ['validate', 'analyze', 'monitor'],
    dependencies: ['knowledge-base', 'business-rules'],
    isCore: false,
    securityLevel: 'standard',
    status: 'active' as AgentStatusEnum,
  },
  'workflow': {
    id: 'workflow',
    name: 'Workflow Agent',
    type: 'workflow' as AgentTypeEnum,
    version: '1.0.0',
    description: 'Process automation, workflow orchestration, and task management',
    baseRoute: '/agents/workflow',
    icon: GitBranch,
    color: 'orange',
    capabilities: ['integrate', 'transform', 'monitor'],
    dependencies: ['knowledge-base'],
    isCore: false,
    securityLevel: 'standard',
    status: 'active' as AgentStatusEnum,
  },
  'analytics': {
    id: 'analytics',
    name: 'Analytics Agent',
    type: 'analytics' as AgentTypeEnum,
    version: '1.0.0',
    description: 'Advanced analytics, reporting, and business intelligence',
    baseRoute: '/agents/analytics',
    icon: BarChart,
    color: 'cyan',
    capabilities: ['analyze', 'generate', 'monitor'],
    dependencies: ['knowledge-base'],
    isCore: false,
    securityLevel: 'standard',
    status: 'active' as AgentStatusEnum,
  },
};

// ===== AGENT REGISTRY SERVICE =====

export class AgentRegistryService {
  // Get all available agents
  static async getAvailableAgents(): Promise<AgentDefinition[]> {
    const registeredAgents = await db.select().from(agentRegistry);
    
    // Merge core agents with database agents
    const allAgents = Object.values(CORE_AGENTS).map(coreAgent => {
      const dbAgent = registeredAgents.find(a => a.name.toLowerCase().replace(/\s+/g, '-') === coreAgent.id);
      return {
        ...coreAgent,
        ...(dbAgent && {
          id: dbAgent.id,
          version: dbAgent.version,
          status: dbAgent.status,
          description: dbAgent.description,
        })
      };
    });

    return allAgents;
  }

  // Get agent configuration for a specific tenant
  static async getTenantAgentConfig(tenantId: string, agentId: string): Promise<AgentConfig | null> {
    const config = await db.select()
      .from(tenantAgentConfigs)
      .where(and(
        eq(tenantAgentConfigs.tenantId, tenantId),
        eq(tenantAgentConfigs.agentId, agentId)
      ))
      .limit(1);

    if (!config[0]) return null;

    return {
      enabled: config[0].isEnabled ?? false,
      accessLevel: config[0].accessLevel as any,
      customSettings: config[0].customConfig as Record<string, any>,
      resourceLimits: {
        dailyRequests: config[0].dailyRequestLimit || undefined,
        monthlyRequests: config[0].monthlyRequestLimit || undefined,
        tokenQuotaDaily: config[0].tokenQuotaDaily || undefined,
        tokenQuotaMonthly: config[0].tokenQuotaMonthly || undefined,
      },
      securitySettings: {
        encryptionRequired: config[0].encryptionRequired ?? false,
        auditingRequired: config[0].auditingRequired ?? true,
        ipWhitelist: config[0].ipWhitelist || undefined,
      }
    };
  }

  // Get enabled agents for a tenant
  static async getEnabledAgentsForTenant(tenantId: string): Promise<AgentDefinition[]> {
    const allAgents = await this.getAvailableAgents();
    const tenantConfigs = await db.select()
      .from(tenantAgentConfigs)
      .where(and(
        eq(tenantAgentConfigs.tenantId, tenantId),
        eq(tenantAgentConfigs.isEnabled, true)
      ));

    // Filter agents based on tenant configuration
    return allAgents.filter(agent => {
      const config = tenantConfigs.find(c => c.agentId === agent.id);
      return config || agent.isCore; // Core agents are enabled by default
    });
  }

  // Get agent health status
  static async getAgentHealth(agentId: string, tenantId?: string): Promise<AgentHealth | null> {
    const healthData = await db.select()
      .from(agentHealthMetrics)
      .where(and(
        eq(agentHealthMetrics.agentId, agentId),
        tenantId ? eq(agentHealthMetrics.tenantId, tenantId) : sql`tenant_id IS NULL`
      ))
      .orderBy(desc(agentHealthMetrics.timestamp))
      .limit(1);

    if (!healthData[0]) return null;

    const metric = healthData[0];
    return {
      status: metric.status as any,
      responseTime: metric.responseTime ?? 0,
      errorRate: metric.errorRate ?? 0,
      successRate: metric.successRate ?? 100,
      lastHealthCheck: metric.lastHealthCheck ?? new Date(),
      uptime: metric.uptime ?? 0,
    };
  }

  // Log inter-agent communication
  static async logAgentCommunication(
    sourceAgentId: string,
    targetAgentId: string,
    operationType: string,
    requestData: any,
    responseData: any,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
    tenantId?: string,
    userId?: string,
    duration?: number,
    tokensUsed?: number
  ): Promise<void> {
    await db.insert(agentCommunicationLog).values({
      sourceAgentId,
      targetAgentId,
      tenantId,
      userId,
      operationType,
      requestData,
      responseData,
      status,
      duration,
      tokensUsed,
      encrypted: true,
      dataClassification: 'internal',
    });
  }

  // Update agent health metrics
  static async updateHealthMetrics(
    agentId: string,
    metrics: Partial<AgentHealth>,
    tenantId?: string
  ): Promise<void> {
    await db.insert(agentHealthMetrics).values({
      agentId,
      tenantId,
      status: metrics.status || 'healthy',
      responseTime: metrics.responseTime,
      errorRate: metrics.errorRate || 0,
      successRate: metrics.successRate || 100,
      uptime: metrics.uptime || 0,
      lastHealthCheck: new Date(),
      encryptionStatus: true,
      auditCompliance: true,
      dataRetentionCompliance: true,
    });
  }

  // Enable/disable agent for tenant
  static async setAgentEnabledForTenant(
    tenantId: string,
    agentId: string,
    enabled: boolean
  ): Promise<void> {
    // Check if configuration exists
    const existing = await db.select()
      .from(tenantAgentConfigs)
      .where(and(
        eq(tenantAgentConfigs.tenantId, tenantId),
        eq(tenantAgentConfigs.agentId, agentId)
      ))
      .limit(1);

    if (existing[0]) {
      // Update existing configuration
      await db.update(tenantAgentConfigs)
        .set({ isEnabled: enabled, updatedAt: new Date() })
        .where(and(
          eq(tenantAgentConfigs.tenantId, tenantId),
          eq(tenantAgentConfigs.agentId, agentId)
        ));
    } else {
      // Create new configuration
      await db.insert(tenantAgentConfigs).values({
        tenantId,
        agentId,
        isEnabled: enabled,
        accessLevel: 'standard',
        customConfig: {},
        auditingRequired: true,
        encryptionRequired: false,
      });
    }
  }

  // Initialize core agents in database
  static async initializeCoreAgents(): Promise<void> {
    for (const agent of Object.values(CORE_AGENTS)) {
      // Check if agent already exists
      const existing = await db.select()
        .from(agentRegistry)
        .where(eq(agentRegistry.name, agent.name))
        .limit(1);

      if (!existing[0]) {
        // Create agent in registry
        await db.insert(agentRegistry).values({
          name: agent.name,
          type: agent.type,
          version: agent.version,
          description: agent.description,
          baseRoute: agent.baseRoute,
          capabilities: agent.capabilities,
          dependencies: agent.dependencies,
          defaultConfig: {},
          securityLevel: agent.securityLevel,
          status: agent.status,
          isCore: agent.isCore,
          icon: agent.icon.name,
          color: agent.color,
          complianceFrameworks: ['SOC2', 'GDPR'],
          auditLevel: 'comprehensive',
        });
      }
    }
  }
}

// ===== AGENT COMMUNICATION INTERFACE =====

export abstract class BaseAgent {
  protected agentId: string;
  protected agentName: string;
  protected capabilities: AgentCapabilityEnum[];

  constructor(agentId: string, agentName: string, capabilities: AgentCapabilityEnum[]) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.capabilities = capabilities;
  }

  // Abstract methods that each agent must implement
  abstract processRequest(request: any, context: any): Promise<any>;
  abstract validateRequest(request: any): boolean;
  abstract getHealthStatus(): Promise<AgentHealth>;

  // Common inter-agent communication
  async communicateWithAgent(
    targetAgentId: string,
    operationType: string,
    data: any,
    tenantId?: string,
    userId?: string
  ): Promise<AgentCommunicationResult> {
    const startTime = Date.now();
    
    try {
      // Log the communication attempt
      await AgentRegistryService.logAgentCommunication(
        this.agentId,
        targetAgentId,
        operationType,
        data,
        null,
        'pending',
        tenantId,
        userId
      );

      // TODO: Implement actual inter-agent communication
      // This would typically involve HTTP calls, message queues, or direct function calls
      const result = await this.executeInterAgentCall(targetAgentId, operationType, data);
      
      const duration = Date.now() - startTime;
      
      // Log successful communication
      await AgentRegistryService.logAgentCommunication(
        this.agentId,
        targetAgentId,
        operationType,
        data,
        result,
        'completed',
        tenantId,
        userId,
        duration
      );

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed communication
      await AgentRegistryService.logAgentCommunication(
        this.agentId,
        targetAgentId,
        operationType,
        data,
        { error: errorMessage },
        'failed',
        tenantId,
        userId,
        duration
      );

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  }

  // Template method for inter-agent calls (to be implemented by specific agents)
  protected async executeInterAgentCall(
    targetAgentId: string,
    operationType: string,
    data: any
  ): Promise<any> {
    throw new Error(`Inter-agent communication not implemented for ${this.agentName}`);
  }

  // Update health metrics
  async updateHealth(metrics: Partial<AgentHealth>, tenantId?: string): Promise<void> {
    await AgentRegistryService.updateHealthMetrics(this.agentId, metrics, tenantId);
  }
} 