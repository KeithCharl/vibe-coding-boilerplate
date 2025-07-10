"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  ArrowRight, 
  Sparkles,
  Shield,
  Users,
  Clock,
  CheckCircle,
  Globe,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { type AgentDefinition } from "@/lib/agents/agent-registry";

interface TenantSelectorProps {
  userTenants: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: "viewer" | "contributor" | "admin";
    isActive: boolean | null;
  }>;
  availableAgents: AgentDefinition[];
  userEmail: string;
}

const roleColors = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  contributor: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
};

const roleLabels = {
  admin: "Administrator",
  contributor: "Contributor", 
  viewer: "Viewer",
};

export function TenantSelector({ userTenants, availableAgents, userEmail }: TenantSelectorProps) {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Enterprise Agent Platform
                </h1>
                <p className="text-sm text-muted-foreground">
                  Select your workspace to access AI agents
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>Enterprise Security</span>
              </div>
              <ThemeToggleButton />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Workspace Selection */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-foreground">Choose Your Workspace</h2>
                <p className="text-lg text-muted-foreground">
                  Select a workspace to access your AI agents and collaborative tools
                </p>
              </div>

              <div className="grid gap-6">
                <AnimatePresence mode="popLayout">
                  {userTenants.map((tenant, index) => {
                    const isSelected = selectedTenant === tenant.tenantId;
                    const Icon = tenant.role === 'admin' ? Shield : tenant.role === 'contributor' ? Users : Building2;
                    
                    return (
                      <motion.div
                        key={tenant.tenantId}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            isSelected 
                              ? 'ring-2 ring-blue-500 shadow-lg border-blue-200 dark:border-blue-800' 
                              : 'hover:border-blue-200 dark:hover:border-blue-800'
                          }`}
                          onClick={() => setSelectedTenant(tenant.tenantId)}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${
                                  tenant.role === 'admin' 
                                    ? 'bg-red-100 dark:bg-red-900/20' 
                                    : tenant.role === 'contributor'
                                    ? 'bg-blue-100 dark:bg-blue-900/20'
                                    : 'bg-gray-100 dark:bg-gray-900/20'
                                }`}>
                                  <Icon className={`h-6 w-6 ${
                                    tenant.role === 'admin' 
                                      ? 'text-red-600 dark:text-red-400' 
                                      : tenant.role === 'contributor'
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`} />
                                </div>
                                <div className="space-y-2">
                                  <CardTitle className="text-xl font-semibold">
                                    {tenant.tenantName}
                                  </CardTitle>
                                  <div className="flex items-center gap-3">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs font-medium ${roleColors[tenant.role]}`}
                                    >
                                      {roleLabels[tenant.role]}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                      <span>Active</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center"
                                  >
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <CardDescription className="text-base">
                              Access {availableAgents.length} AI agents including Knowledge Base, Business Rules, Testing, and Analytics capabilities.
                            </CardDescription>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                {availableAgents.filter(a => a.isCore).length} Core Agents • {availableAgents.length - availableAgents.filter(a => a.isCore).length} Extended Agents
                              </div>
                              
                              <Button 
                                asChild 
                                className={`transition-all duration-300 ${
                                  isSelected 
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md' 
                                    : 'bg-primary hover:bg-primary/90'
                                }`}
                              >
                                <Link href={`/t/${tenant.tenantId}`} className="flex items-center gap-2">
                                  <span>Enter Workspace</span>
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Create New Workspace */}
              <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Create New Workspace</span>
                  </CardTitle>
                  <CardDescription className="text-base">
                    Set up a new organizational workspace with full AI agent access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/create-tenant">
                      Create Workspace
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Agent Preview Sidebar */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Available AI Agents
                </h3>
                <p className="text-sm text-muted-foreground">
                  Powerful AI agents available in every workspace
                </p>
              </div>

              <div className="space-y-4">
                {availableAgents.slice(0, 5).map((agent, index) => {
                  const Icon = agent.icon;
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                    >
                      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-${agent.color}-100 dark:bg-${agent.color}-900/20`}>
                              <Icon className={`h-4 w-4 text-${agent.color}-600 dark:text-${agent.color}-400`} />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">{agent.name}</h4>
                                {agent.isCore && (
                                  <Badge variant="outline" className="text-xs">Core</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {agent.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {agent.capabilities.slice(0, 2).map((cap) => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              <Separator />

              {/* User Info */}
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200/50 dark:border-blue-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {userEmail.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Signed in as</p>
                      <p className="text-xs text-muted-foreground font-mono">{userEmail}</p>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600">{userTenants.length}</p>
                      <p className="text-xs text-muted-foreground">Workspaces</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600">{availableAgents.length}</p>
                      <p className="text-xs text-muted-foreground">AI Agents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Platform Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">System Health</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium">Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Agents</span>
                    <span className="font-medium">{availableAgents.filter(a => a.status === 'active').length}/{availableAgents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Security Level</span>
                    <span className="font-medium text-blue-600">Enterprise</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 