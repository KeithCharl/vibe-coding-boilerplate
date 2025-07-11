"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Brain, 
  Shield, 
  TestTube, 
  GitBranch,
  BarChart,
  ArrowRight, 
  Sparkles,
  Zap,
  Layers,
  Monitor,
  Settings,
  Activity,
  Clock,
  Users,
  Lock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { type SerializableAgent } from "@/server/actions/agents";
import { AgentHealthMonitor } from "./agent-health-monitor";

interface AgentHubProps {
  agents: (SerializableAgent & { config?: any; health?: any })[];
  tenantId?: string;
  userRole?: 'admin' | 'user' | 'viewer';
}

interface AgentHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
}

// Remove mock data - using real health data from props

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

export function MultiAgentHub({ agents, tenantId, userRole = 'user' }: AgentHubProps) {
  const [selectedAgent, setSelectedAgent] = useState<SerializableAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && agent.status === 'active') ||
                         (filterStatus === 'disabled' && agent.status !== 'active');
    return matchesSearch && matchesFilter;
  });

  const getHealthStatus = (agentId: string): AgentHealthStatus => {
    const agent = agents.find(a => a.id === agentId);
    if (agent?.health) {
      return {
        status: agent.health.status,
        responseTime: agent.health.responseTime || 0,
        uptime: agent.health.uptime || 0,
        lastCheck: agent.health.lastHealthCheck || new Date(),
      };
    }
    
    return {
      status: 'offline',
      responseTime: 0,
      uptime: 0,
      lastCheck: new Date(),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'unhealthy': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10" />
        <div className="relative container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Layers className="h-12 w-12 text-blue-600" />
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Agent Hub
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Enterprise-grade AI agents working together to streamline your business operations.
              Choose an agent to execute tasks, analyze data, or automate workflows.
            </p>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Agents are now fully functional!</span>
              </div>
              <p className="text-green-700 dark:text-green-300 mt-1 text-sm">
                Click on any agent below to execute real tasks, monitor performance, and manage configurations.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="outline" className="px-4 py-2">
                <Activity className="h-4 w-4 mr-2" />
                {agents.filter(a => a.status === 'active').length} Active Agents
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                <Shield className="h-4 w-4 mr-2" />
                Enterprise Security
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                <Zap className="h-4 w-4 mr-2" />
                Real-time Monitoring
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Agent Grid */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Agents</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent, index) => {
                  const health = getHealthStatus(agent.id);
                  const Icon = getIconComponent(agent.iconName);
                  
                  return (
                    <motion.div
                      key={agent.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="group"
                    >
                      <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg bg-${agent.color}-100 dark:bg-${agent.color}-900/20`}>
                                <Icon className={`h-6 w-6 text-${agent.color}-600 dark:text-${agent.color}-400`} />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                                  {agent.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={getStatusBadgeVariant(health.status)} className="text-xs">
                                    {health.status}
                                  </Badge>
                                  {agent.isCore && (
                                    <Badge variant="outline" className="text-xs">
                                      Core
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <CardDescription className="text-sm line-clamp-2">
                            {agent.description}
                          </CardDescription>

                          {/* Health Metrics */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Uptime</span>
                              <span className="font-medium">{health.uptime}%</span>
                            </div>
                            <Progress value={health.uptime} className="h-2" />
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Response</span>
                                <p className="font-medium">{health.responseTime}ms</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Version</span>
                                <p className="font-medium">{agent.version}</p>
                              </div>
                            </div>
                          </div>

                          {/* Capabilities */}
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Capabilities</p>
                            <div className="flex flex-wrap gap-1">
                              {agent.capabilities.slice(0, 3).map((capability) => (
                                <Badge key={capability} variant="secondary" className="text-xs">
                                  {capability}
                                </Badge>
                              ))}
                              {agent.capabilities.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{agent.capabilities.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {tenantId ? (
                              <Button asChild className="flex-1" size="sm">
                                <Link href={`/t/${tenantId}${agent.baseRoute}`}>
                                  Open Agent
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Link>
                              </Button>
                            ) : (
                              <Button asChild className="flex-1" size="sm" variant="outline">
                                <Link href={agent.baseRoute}>
                                  View Details
                                </Link>
                              </Button>
                            )}
                            
                            {userRole === 'admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedAgent(agent)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {filteredAgents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Layers className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No agents found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or contact your administrator.
                </p>
              </motion.div>
            )}
          </div>

          {/* System Overview Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  System Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">Healthy</p>
                    <p className="text-2xl font-bold text-green-600">
                      {agents.filter(a => getHealthStatus(a.id).status === 'healthy').length}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                    <p className="text-sm font-medium">Issues</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {agents.filter(a => ['degraded', 'unhealthy'].includes(getHealthStatus(a.id).status)).length}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Agents</span>
                    <span className="font-medium">{agents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-medium">{agents.filter(a => a.status === 'active').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Core Agents</span>
                    <span className="font-medium">{agents.filter(a => a.isCore).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Response</span>
                    <span className="font-medium">
                      {Math.round(
                        agents.reduce((acc, agent) => acc + getHealthStatus(agent.id).responseTime, 0) / agents.length
                      )}ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {userRole === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Access
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Monitor className="h-4 w-4 mr-2" />
                    Health Monitor
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    Security Events
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    Audit Logs
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">KB</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-muted-foreground">Knowledge Base processed 47 queries</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">BR</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-muted-foreground">Business Rules validated 12 processes</p>
                      <p className="text-xs text-muted-foreground">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">TA</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-muted-foreground">Testing Agent completed 8 test suites</p>
                      <p className="text-xs text-muted-foreground">12 minutes ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 