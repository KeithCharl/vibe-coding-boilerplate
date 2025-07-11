"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  ArrowRight, 
  Sparkles,
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
import { type SerializableAgent } from "@/server/actions/agents";
import { Brain, Shield, TestTube, GitBranch, BarChart } from "lucide-react";

interface TenantSelectorProps {
  userTenants: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: "viewer" | "contributor" | "admin";
    isActive: boolean | null;
  }>;
  availableAgents: SerializableAgent[];
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

export function TenantSelector({ userTenants, availableAgents, userEmail }: TenantSelectorProps) {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(to right, #F4F7FA, #FFFFFF)',
        fontFamily: 'Montserrat, "Open Sans", system-ui, sans-serif'
      }}
    >
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: '#002C54' }}
              >
                <div className="text-white font-bold text-lg">b</div>
              </div>
              <div>
                <h1 
                  className="text-2xl font-bold" 
                  style={{ color: '#002C54' }}
                >
                  bAxis
                </h1>
                <p className="text-sm text-gray-500">by bancon</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" style={{ color: '#00B3B0' }} />
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
                <h2 className="text-4xl font-bold" style={{ color: '#002C54' }}>Choose Your Workspace</h2>
                <p className="text-lg text-gray-600">
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
                          className={`cursor-pointer transition-all duration-300 rounded-xl border-2 ${
                            isSelected 
                              ? 'shadow-xl border-bancon-teal' 
                              : 'shadow-sm hover:shadow-lg border-gray-200 hover:border-bancon-teal'
                          }`}
                          onClick={() => setSelectedTenant(tenant.tenantId)}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div 
                                  className="p-3 rounded-xl"
                                  style={{
                                    backgroundColor: tenant.role === 'admin' 
                                      ? 'rgba(0, 44, 84, 0.1)' 
                                      : tenant.role === 'contributor'
                                      ? 'rgba(0, 179, 176, 0.1)'
                                      : 'rgba(255, 107, 0, 0.1)'
                                  }}
                                >
                                  <Icon 
                                    className="h-6 w-6" 
                                    style={{
                                      color: tenant.role === 'admin' 
                                        ? '#002C54' 
                                        : tenant.role === 'contributor'
                                        ? '#00B3B0'
                                        : '#FF6B00'
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <CardTitle className="text-xl font-bold" style={{ color: '#002C54' }}>
                                    {tenant.tenantName}
                                  </CardTitle>
                                  <div className="flex items-center gap-3">
                                    <Badge 
                                      className="text-xs font-bold rounded-full"
                                      style={{
                                        backgroundColor: tenant.role === 'admin' 
                                          ? 'rgba(0, 44, 84, 0.1)' 
                                          : tenant.role === 'contributor'
                                          ? 'rgba(0, 179, 176, 0.1)'
                                          : 'rgba(255, 107, 0, 0.1)',
                                        color: tenant.role === 'admin' 
                                          ? '#002C54' 
                                          : tenant.role === 'contributor'
                                          ? '#00B3B0'
                                          : '#FF6B00'
                                      }}
                                    >
                                      {roleLabels[tenant.role]}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <CheckCircle className="h-3 w-3" style={{ color: '#00B3B0' }} />
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
                                    className="h-6 w-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: '#00B3B0' }}
                                  >
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <CardDescription className="text-base text-gray-600">
                              Access {availableAgents.length} AI agents including Knowledge Base, Business Rules, Testing, and Analytics capabilities.
                            </CardDescription>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-600">
                                {availableAgents.filter(a => a.isCore).length} Core Agents • {availableAgents.length - availableAgents.filter(a => a.isCore).length} Extended Agents
                              </div>
                              
                              <Button 
                                asChild 
                                className="rounded-xl font-bold transition-all duration-200 hover:shadow-lg"
                                style={{
                                  backgroundColor: isSelected ? '#00B3B0' : '#002C54',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = isSelected ? '#008F8C' : '#001A35';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = isSelected ? '#00B3B0' : '#002C54';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
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
              <Card className="border-2 border-dashed rounded-xl transition-colors" style={{ borderColor: '#00B3B0' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg" style={{ color: '#002C54' }}>
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0, 179, 176, 0.1)' }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: '#00B3B0' }} />
                    </div>
                    <span>Create New Workspace</span>
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    Set up a new organizational workspace with full AI agent access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    asChild 
                    className="w-full btn-bancon-outline"
                    style={{ 
                      borderColor: '#00B3B0',
                      color: '#00B3B0'
                    }}
                  >
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
                <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#002C54' }}>
                  <Sparkles className="h-5 w-5" style={{ color: '#FF6B00' }} />
                  Available AI Agents
                </h3>
                <p className="text-sm text-gray-600">
                  Powerful AI agents available in every workspace
                </p>
              </div>

              <div className="space-y-4">
                {availableAgents.slice(0, 5).map((agent, index) => {
                  const Icon = getIconComponent(agent.iconName);
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                    >
                      <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{
                                backgroundColor: agent.color === 'navy' 
                                  ? 'rgba(0, 44, 84, 0.1)' 
                                  : agent.color === 'teal'
                                  ? 'rgba(0, 179, 176, 0.1)'
                                  : 'rgba(255, 107, 0, 0.1)'
                              }}
                            >
                              <Icon 
                                className="h-4 w-4" 
                                style={{
                                  color: agent.color === 'navy' 
                                    ? '#002C54' 
                                    : agent.color === 'teal'
                                    ? '#00B3B0'
                                    : '#FF6B00'
                                }}
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold" style={{ color: '#002C54' }}>{agent.name}</h4>
                                {agent.isCore && (
                                  <Badge 
                                    className="text-xs font-bold" 
                                    style={{ 
                                      backgroundColor: 'rgba(0, 179, 176, 0.1)', 
                                      color: '#00B3B0' 
                                    }}
                                  >
                                    Core
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {agent.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {agent.capabilities.slice(0, 2).map((cap) => (
                                  <Badge 
                                    key={cap} 
                                    className="text-xs rounded-full" 
                                    style={{ 
                                      backgroundColor: 'rgba(0, 44, 84, 0.1)', 
                                      color: '#002C54' 
                                    }}
                                  >
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
              <Card 
                className="rounded-xl border border-gray-200/50"
                style={{ 
                  background: 'linear-gradient(to bottom right, rgba(0, 179, 176, 0.05), rgba(255, 107, 0, 0.05))' 
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback 
                        className="text-white font-bold"
                        style={{ backgroundColor: '#002C54' }}
                      >
                        {userEmail.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: '#002C54' }}>Signed in as</p>
                      <p className="text-xs text-gray-600 font-mono">{userEmail}</p>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#00B3B0' }}>{userTenants.length}</p>
                      <p className="text-xs text-gray-600">Workspaces</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: '#FF6B00' }}>{availableAgents.length}</p>
                      <p className="text-xs text-gray-600">AI Agents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: '#002C54' }}>
                  <Clock className="h-4 w-4" />
                  Platform Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">System Health</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#00B3B0' }}></div>
                      <span className="font-bold" style={{ color: '#00B3B0' }}>Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Active Agents</span>
                    <span className="font-bold" style={{ color: '#002C54' }}>{availableAgents.filter(a => a.status === 'active').length}/{availableAgents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Security Level</span>
                    <span className="font-bold" style={{ color: '#FF6B00' }}>Enterprise</span>
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