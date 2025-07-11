"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Brain, 
  ExternalLink, 
  Settings, 
  Wrench,
  ChevronRight,
  Home,
  Search,
  Database,
  Network,
  FileText,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface KBNavigationProps {
  tenantId: string;
  currentPage?: string;
  documentCount?: number;
  referenceCount?: number;
  className?: string;
}

interface KBSection {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  status?: 'active' | 'beta' | 'new';
  category: 'core' | 'tools' | 'integrations';
}

export function KBNavigation({ 
  tenantId, 
  currentPage, 
  documentCount = 0, 
  referenceCount = 0,
  className 
}: KBNavigationProps) {
  const pathname = usePathname();
  
  const sections: KBSection[] = [
    {
      id: 'main',
      title: 'Knowledge Base',
      description: 'Browse and manage your documents and content',
      href: `/t/${tenantId}/kb`,
      icon: <BookOpen className="h-5 w-5" />,
      badge: documentCount > 0 ? documentCount : undefined,
      category: 'core'
    },
    {
      id: 'agent',
      title: 'AI Agent',
      description: 'Interact with your knowledge base using AI',
      href: `/t/${tenantId}/kb/agent`,
      icon: <Brain className="h-5 w-5" />,
      status: 'active',
      category: 'core'
    },
    {
      id: 'references',
      title: 'References',
      description: 'Connect to other knowledge bases',
      href: `/t/${tenantId}/kb/references`,
      icon: <ExternalLink className="h-5 w-5" />,
      badge: referenceCount > 0 ? referenceCount : undefined,
      category: 'integrations'
    },
    {
      id: 'fix-link',
      title: 'Fix Links',
      description: 'Repair broken or outdated links',
      href: `/t/${tenantId}/kb/fix-link`,
      icon: <Wrench className="h-5 w-5" />,
      category: 'tools'
    },
    {
      id: 'simple-fix',
      title: 'Simple Fix',
      description: 'Quick fixes and maintenance tools',
      href: `/t/${tenantId}/kb/simple-fix`,
      icon: <Settings className="h-5 w-5" />,
      category: 'tools'
    }
  ];

  const getCurrentSection = () => {
    return sections.find(section => {
      if (section.href === `/t/${tenantId}/kb` && pathname === `/t/${tenantId}/kb`) {
        return true;
      }
      if (section.href !== `/t/${tenantId}/kb` && pathname?.startsWith(section.href)) {
        return true;
      }
      return false;
    });
  };

  const currentSection = getCurrentSection();
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 text-white text-xs">Active</Badge>;
      case 'beta':
        return <Badge variant="secondary" className="text-xs">Beta</Badge>;
      case 'new':
        return <Badge variant="default" className="bg-blue-500 text-white text-xs">New</Badge>;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core':
        return <Database className="h-4 w-4" />;
      case 'tools':
        return <Settings className="h-4 w-4" />;
      case 'integrations':
        return <Network className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const groupedSections = sections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, KBSection[]>);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/t/${tenantId}`} className="hover:text-foreground">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium">Knowledge Base</span>
        {currentSection && currentSection.id !== 'main' && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{currentSection.title}</span>
          </>
        )}
      </div>

      {/* Current Section Header */}
      {currentSection && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {currentSection.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{currentSection.title}</h2>
                {getStatusBadge(currentSection.status)}
                {currentSection.badge && (
                  <Badge variant="outline">
                    {currentSection.badge}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-4">{currentSection.description}</p>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                {currentSection.id === 'main' && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenantId}/kb/agent`}>
                        <Brain className="h-4 w-4 mr-2" />
                        Use AI Agent
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenantId}/kb/references`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage References
                      </Link>
                    </Button>
                  </>
                )}
                {currentSection.id === 'agent' && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenantId}/kb`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Browse Documents
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenantId}/kb/references`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View References
                      </Link>
                    </Button>
                  </>
                )}
                {currentSection.id === 'references' && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenantId}/kb`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Back to KB
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenantId}/kb/agent`}>
                        <Brain className="h-4 w-4 mr-2" />
                        Test with AI
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Grid */}
      <div className="space-y-6">
        {Object.entries(groupedSections).map(([category, categorySections]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              {getCategoryIcon(category)}
              <h3 className="font-semibold text-lg capitalize">{category}</h3>
              <Separator className="flex-1" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySections.map((section) => {
                const isActive = section.id === currentSection?.id;
                
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={cn(
                      "h-full transition-all duration-200 hover:shadow-md cursor-pointer group",
                      isActive && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    )}>
                      <Link href={section.href}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn(
                              "p-2 rounded-lg transition-colors",
                              isActive 
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600" 
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                            )}>
                              {section.icon}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(section.status)}
                              {section.badge && (
                                <Badge variant="outline" className="text-xs">
                                  {section.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <h4 className={cn(
                            "font-semibold mb-2 transition-colors",
                            isActive ? "text-blue-700 dark:text-blue-300" : "group-hover:text-blue-600"
                          )}>
                            {section.title}
                          </h4>
                          
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                          
                          {isActive && (
                            <div className="mt-3 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                              <Activity className="h-3 w-3" />
                              <span>Currently Active</span>
                            </div>
                          )}
                        </CardContent>
                      </Link>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Integration Notice */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Network className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Integrated Knowledge Base
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                All sections work together - use the AI Agent to search across documents and references, 
                or manage connections to enhance your knowledge base capabilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 