"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { KBNavigation } from "./kb-navigation";
import { KBIntegrationPanel } from "./kb-integration-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutGrid, 
  List, 
  Minimize2, 
  Maximize2,
  BookOpen,
  Brain,
  ExternalLink,
  ArrowRight,
  Search,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KBLayoutProps {
  children: React.ReactNode;
  tenantId: string;
  title?: string;
  description?: string;
  documentCount?: number;
  referenceCount?: number;
  showNavigation?: boolean;
  navigationMode?: 'full' | 'compact' | 'hidden';
  className?: string;
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

export function KBLayout({
  children,
  tenantId,
  title,
  description,
  documentCount = 0,
  referenceCount = 0,
  showNavigation = true,
  navigationMode = 'full',
  className
}: KBLayoutProps) {
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'navigation' | 'content'>('navigation');
  const pathname = usePathname();

  // Determine if we're on a specific KB page
  const isMainKB = pathname === `/t/${tenantId}/kb`;
  const isAgent = pathname?.includes('/kb/agent');
  const isReferences = pathname?.includes('/kb/references');
  
  // Determine current page for integration panel
  const getCurrentPage = (): 'main' | 'agent' | 'references' => {
    if (isAgent) return 'agent';
    if (isReferences) return 'references';
    return 'main';
  };

  // Quick actions based on current page
  const getQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    if (isMainKB) {
      actions.push(
        {
          title: "Search with AI",
          description: "Use the Knowledge Base Agent to search and analyze",
          href: `/t/${tenantId}/kb/agent`,
          icon: <Brain className="h-4 w-4" />,
          color: "bg-blue-50 text-blue-600 border-blue-200",
          badge: "AI"
        },
        {
          title: "Connect KBs",
          description: "Link to other knowledge bases for enhanced search",
          href: `/t/${tenantId}/kb/references`,
          icon: <ExternalLink className="h-4 w-4" />,
          color: "bg-purple-50 text-purple-600 border-purple-200",
          badge: referenceCount > 0 ? referenceCount.toString() : undefined
        }
      );
    }

    if (isAgent) {
      actions.push(
        {
          title: "Browse Documents",
          description: "View and manage your document collection",
          href: `/t/${tenantId}/kb`,
          icon: <BookOpen className="h-4 w-4" />,
          color: "bg-green-50 text-green-600 border-green-200",
          badge: documentCount > 0 ? documentCount.toString() : undefined
        },
        {
          title: "External Sources",
          description: "Search across connected knowledge bases",
          href: `/t/${tenantId}/kb/references`,
          icon: <ExternalLink className="h-4 w-4" />,
          color: "bg-purple-50 text-purple-600 border-purple-200"
        }
      );
    }

    if (isReferences) {
      actions.push(
        {
          title: "Test Integration",
          description: "Use AI Agent to test cross-KB search",
          href: `/t/${tenantId}/kb/agent`,
          icon: <Brain className="h-4 w-4" />,
          color: "bg-blue-50 text-blue-600 border-blue-200",
          badge: "Test"
        },
        {
          title: "View Documents",
          description: "Check your local document collection",
          href: `/t/${tenantId}/kb`,
          icon: <BookOpen className="h-4 w-4" />,
          color: "bg-green-50 text-green-600 border-green-200"
        }
      );
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-950", className)}>
      <div className="container mx-auto py-6 px-4 space-y-6">
        
        {/* View Mode Toggle for Mobile */}
        <div className="lg:hidden">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="navigation">Navigation</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Navigation Sidebar */}
          {showNavigation && navigationMode !== 'hidden' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "space-y-6",
                navigationMode === 'full' ? "lg:col-span-4" : "lg:col-span-3",
                viewMode === 'content' && "hidden lg:block"
              )}
            >
              {/* Navigation Component */}
              <KBNavigation
                tenantId={tenantId}
                documentCount={documentCount}
                referenceCount={referenceCount}
                className={navigationMode === 'compact' ? "scale-90" : ""}
              />

              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>
                      Suggested next steps for your current workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start h-auto p-4 hover:shadow-sm transition-all",
                            action.color
                          )}
                          asChild
                        >
                          <a href={action.href}>
                            <div className="flex items-start gap-3 text-left">
                              <div className="mt-0.5">
                                {action.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{action.title}</span>
                                  {action.badge && (
                                    <Badge variant="secondary" className="text-xs">
                                      {action.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs opacity-80">
                                  {action.description}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 mt-0.5 opacity-50" />
                            </div>
                          </a>
                        </Button>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* KB Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Knowledge Base Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Documents</span>
                    <Badge variant="outline">{documentCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">References</span>
                    <Badge variant="outline">{referenceCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AI Agent</span>
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              navigationMode === 'hidden' 
                ? "lg:col-span-12" 
                : navigationMode === 'full' 
                  ? "lg:col-span-8" 
                  : "lg:col-span-9",
              viewMode === 'navigation' && "hidden lg:block"
            )}
          >
            {/* Custom Header */}
            {(title || description) && (
              <Card className="mb-6">
                <CardHeader>
                  {title && <CardTitle className="text-2xl">{title}</CardTitle>}
                  {description && <CardDescription className="text-base">{description}</CardDescription>}
                </CardHeader>
              </Card>
            )}

            {/* Integration Panel */}
            <KBIntegrationPanel
              tenantId={tenantId}
              documentCount={documentCount}
              referenceCount={referenceCount}
              currentPage={getCurrentPage()}
              className="mb-6"
            />
            
            {/* Main Content */}
            <div className="space-y-6">
              {children}
            </div>
          </motion.div>
        </div>

        {/* Navigation Toggle for Desktop */}
        {showNavigation && (
          <div className="hidden lg:block fixed bottom-6 right-6 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNavigationExpanded(!isNavigationExpanded)}
              className="shadow-lg bg-white dark:bg-gray-800"
            >
              {isNavigationExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 