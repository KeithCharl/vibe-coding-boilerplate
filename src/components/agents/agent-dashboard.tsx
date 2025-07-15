"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  Settings,
  Activity,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Zap,
  Database,
  MessageSquare,
  BarChart3,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { type SerializableAgent } from "@/server/actions/agents";
import { Brain, Shield, TestTube, GitBranch, BarChart } from "lucide-react";
import { AgentExecutor } from "./agent-executor";

// Helper function to map icon names back to components
function getIconComponent(iconName: string) {
  const iconMap = {
    'Brain': Brain,
    'Shield': Shield,
    'TestTube': TestTube,
    'GitBranch': GitBranch,
    'BarChart': BarChart,
  };
  return iconMap[iconName as keyof typeof iconMap] || Brain;
}

interface AgentDashboardProps {
  agent: SerializableAgent;
  config?: {
    isEnabled: boolean;
    accessLevel: string;
    customConfig: Record<string, any>;
    dailyRequestLimit?: number;
    monthlyRequestLimit?: number;
    encryptionRequired: boolean;
    auditingRequired: boolean;
  };
  health?: {
    status: string;
    responseTime?: number;
    errorRate?: number;
    uptime?: number;
    lastHealthCheck?: Date;
  };
  tenantId: string;
  userRole: 'admin' | 'user';
}

const statusColors = {
  healthy: "text-green-600 bg-green-100 dark:bg-green-900/20",
  degraded: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20", 
  unhealthy: "text-red-600 bg-red-100 dark:bg-red-900/20",
  offline: "text-gray-600 bg-gray-100 dark:bg-gray-900/20",
};

export function AgentDashboard({ agent, config, health, tenantId, userRole }: AgentDashboardProps) {
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  
  const Icon = getIconComponent(agent.iconName);
  const status = health?.status || 'offline';
  const isEnabled = config?.isEnabled ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/t/${tenantId}/agents`} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Agents</span>
                </Link>
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-${agent.color}-100 dark:bg-${agent.color}-900/20`}>
                  <Icon className={`h-6 w-6 text-${agent.color}-600 dark:text-${agent.color}-400`} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{agent.name}</h1>
                  <p className="text-muted-foreground">{agent.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge 
                className={statusColors[status as keyof typeof statusColors]}
                variant="secondary"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              
              {userRole === 'admin' && (
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Agent Overview */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="text-2xl font-bold">
                        {isEnabled ? 'Active' : 'Disabled'}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${
                      isEnabled 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-gray-100 dark:bg-gray-900/20'
                    }`}>
                      {isEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Pause className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                      <p className="text-2xl font-bold">
                        {health?.responseTime ? `${health.responseTime}ms` : '--'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                      <p className="text-2xl font-bold">
                        {health?.uptime ? `${(health.uptime * 100).toFixed(1)}%` : '--'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                      <p className="text-2xl font-bold">
                        {health?.errorRate ? `${(health.errorRate * 100).toFixed(1)}%` : '--'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="execute" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="execute">Execute</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="execute" className="space-y-6">
                <AgentExecutor 
                  agent={agent}
                  tenantId={tenantId}
                  userRole={userRole}
                  onTaskComplete={(result) => {
                    // Handle task completion if needed
                    console.log('Task completed:', result);
                  }}
                />
              </TabsContent>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Agent Capabilities */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Capabilities
                      </CardTitle>
                      <CardDescription>
                        Features and functions available in this agent
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agent.capabilities.map((capability) => (
                        <div key={capability} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{capability}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Dependencies */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Dependencies
                      </CardTitle>
                      <CardDescription>
                        Other agents and services this agent relies on
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agent.dependencies.length > 0 ? (
                        agent.dependencies.map((dep) => (
                          <div key={dep} className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">{dep}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No dependencies</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>
                        Latest operations and interactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Health check completed</p>
                            <p className="text-xs text-muted-foreground">
                              {health?.lastHealthCheck 
                                ? new Date(health.lastHealthCheck).toLocaleString()
                                : 'No recent health checks'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Configuration updated</p>
                            <p className="text-xs text-muted-foreground">
                              {config ? 'Settings applied' : 'Using default configuration'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>
                      Detailed activity and operation history
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Activity logging coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Analytics</CardTitle>
                    <CardDescription>
                      Usage metrics and performance insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Configuration</CardTitle>
                    <CardDescription>
                      Manage agent settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userRole === 'admin' ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Agent Enabled</p>
                            <p className="text-sm text-muted-foreground">
                              Enable or disable this agent for your workspace
                            </p>
                          </div>
                          <Switch checked={isEnabled} />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <h4 className="font-medium">Security Settings</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Encryption Required</p>
                              <p className="text-muted-foreground">
                                {config?.encryptionRequired ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Audit Logging</p>
                              <p className="text-muted-foreground">
                                {config?.auditingRequired ? 'Enabled' : 'Disabled'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Admin access required to modify settings
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="ghost" size="sm" className="w-full justify-start btn-bancon-outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with Agent
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start btn-bancon-outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start btn-bancon-outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Usage Reports
                </Button>
                {userRole === 'admin' && (
                  <Button variant="ghost" size="sm" className="w-full justify-start btn-bancon-secondary">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restart Agent
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Agent Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agent Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">{agent.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Security Level</p>
                  <p className="text-sm text-muted-foreground">{agent.securityLevel}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Version</p>
                  <p className="text-sm text-muted-foreground">1.0.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Access Level</p>
                  <p className="text-sm text-muted-foreground">
                    {config?.accessLevel || 'Standard'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Health Monitoring */}
            {health && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Health Monitor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Performance</span>
                      <span>{health.uptime ? `${(health.uptime * 100).toFixed(0)}%` : 'N/A'}</span>
                    </div>
                    <Progress value={health.uptime ? health.uptime * 100 : 0} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Error Rate</span>
                      <span>{health.errorRate ? `${(health.errorRate * 100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <Progress 
                      value={health.errorRate ? health.errorRate * 100 : 0} 
                      className="[&>div]:bg-red-500"
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Last check: {health.lastHealthCheck 
                      ? new Date(health.lastHealthCheck).toLocaleString()
                      : 'Never'
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 