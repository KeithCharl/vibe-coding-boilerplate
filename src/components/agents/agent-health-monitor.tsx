"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Zap,
  TrendingUp,
  WifiOff
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { type SerializableAgent } from "@/server/actions/agents";

interface AgentHealthMonitorProps {
  agents: (SerializableAgent & { config?: any; health?: any })[];
  tenantId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  errorRate: number;
  successRate: number;
  lastHealthCheck: Date;
  uptime: number;
}

interface AgentHealthData {
  agentId: string;
  health: HealthStatus;
  trend: 'improving' | 'stable' | 'degrading';
  lastUpdated: Date;
}

export function AgentHealthMonitor({ 
  agents, 
  tenantId, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: AgentHealthMonitorProps) {
  const [healthData, setHealthData] = useState<Record<string, AgentHealthData>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Initialize health data from props
  useEffect(() => {
    const initialHealth: Record<string, AgentHealthData> = {};
    
    agents.forEach(agent => {
      if (agent.health) {
        initialHealth[agent.id] = {
          agentId: agent.id,
          health: agent.health,
          trend: 'stable',
          lastUpdated: new Date()
        };
      } else {
        // Default health status for agents without health data
        initialHealth[agent.id] = {
          agentId: agent.id,
          health: {
            status: 'offline',
            responseTime: 0,
            errorRate: 0,
            successRate: 100,
            lastHealthCheck: new Date(),
            uptime: 0
          },
          trend: 'stable',
          lastUpdated: new Date()
        };
      }
    });
    
    setHealthData(initialHealth);
  }, [agents]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshHealthData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, tenantId]);

  const refreshHealthData = async () => {
    setIsRefreshing(true);
    
    try {
      const healthPromises = agents.map(async (agent) => {
        try {
          const response = await fetch(`/api/agents/${agent.id}/health?tenantId=${tenantId}`);
          const data = await response.json();
          
          if (response.ok) {
            return {
              agentId: agent.id,
              health: data.health,
              trend: calculateTrend(healthData[agent.id]?.health, data.health),
              lastUpdated: new Date()
            };
          } else {
            throw new Error(data.error || 'Health check failed');
          }
        } catch (error) {
          return {
            agentId: agent.id,
            health: {
              status: 'offline' as const,
              responseTime: 0,
              errorRate: 100,
              successRate: 0,
              lastHealthCheck: new Date(),
              uptime: 0
            },
            trend: 'degrading' as const,
            lastUpdated: new Date()
          };
        }
      });

      const results = await Promise.all(healthPromises);
      const newHealthData: Record<string, AgentHealthData> = {};
      
      results.forEach(result => {
        newHealthData[result.agentId] = result;
      });

      setHealthData(newHealthData);
      setLastRefresh(new Date());
      
    } catch (error) {
      toast.error("Failed to refresh health data", {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateTrend = (oldHealth?: HealthStatus, newHealth?: HealthStatus): 'improving' | 'stable' | 'degrading' => {
    if (!oldHealth || !newHealth) return 'stable';
    
    const oldScore = getHealthScore(oldHealth);
    const newScore = getHealthScore(newHealth);
    
    if (newScore > oldScore) return 'improving';
    if (newScore < oldScore) return 'degrading';
    return 'stable';
  };

  const getHealthScore = (health: HealthStatus): number => {
    const statusScore = {
      'healthy': 100,
      'degraded': 75,
      'unhealthy': 25,
      'offline': 0
    };
    
    return statusScore[health.status] + 
           (health.successRate || 0) * 0.5 + 
           Math.max(0, 100 - (health.responseTime || 0) / 10);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
          case 'healthy': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    case 'degraded': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    case 'unhealthy': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
    case 'offline': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'degrading':
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default:
        return null;
    }
  };

  const overallHealth = Object.values(healthData).reduce((acc, data) => {
    acc.total++;
    if (data.health.status === 'healthy') acc.healthy++;
    else if (data.health.status === 'degraded') acc.degraded++;
    else if (data.health.status === 'unhealthy') acc.unhealthy++;
    else acc.offline++;
    return acc;
  }, { total: 0, healthy: 0, degraded: 0, unhealthy: 0, offline: 0 });

  return (
    <div className="space-y-6">
      {/* Overall Health Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Agent Health Overview
              </CardTitle>
              <CardDescription>
                Real-time monitoring of all agents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshHealthData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallHealth.healthy}</div>
              <div className="text-sm text-muted-foreground">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{overallHealth.degraded}</div>
              <div className="text-sm text-muted-foreground">Degraded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallHealth.unhealthy}</div>
              <div className="text-sm text-muted-foreground">Unhealthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{overallHealth.offline}</div>
              <div className="text-sm text-muted-foreground">Offline</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
              <span>Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Agent Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const health = healthData[agent.id];
          if (!health) return null;

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(health.trend)}
                      {getStatusIcon(health.health.status)}
                    </div>
                  </div>
                  <Badge className={getStatusColor(health.health.status)} variant="secondary">
                    {health.health.status.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Response Time */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span className="text-sm font-medium">
                        {health.health.responseTime}ms
                      </span>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <span className="text-sm font-medium">
                        {health.health.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={health.health.successRate} className="h-2" />
                  </div>

                  {/* Uptime */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <span className="text-sm font-medium">
                        {health.health.uptime.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={health.health.uptime} className="h-2" />
                  </div>

                  {/* Last Check */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last check:</span>
                    <span>{health.health.lastHealthCheck.toLocaleTimeString()}</span>
                  </div>
                </CardContent>

                {/* Status indicator line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  health.health.status === 'healthy' ? 'bg-green-500' :
                  health.health.status === 'degraded' ? 'bg-yellow-500' :
                  health.health.status === 'unhealthy' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
} 