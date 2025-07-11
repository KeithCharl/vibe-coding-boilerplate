"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  ChevronDown, 
  ChevronRight, 
  BookOpen, 
  Brain, 
  ExternalLink, 
  Settings,
  Wrench,
  Database,
  FileText,
  Network,
  BarChart3,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KBTreeNavigationProps {
  tenantId: string;
  documentCount?: number;
  referenceCount?: number;
  className?: string;
}

interface NavItem {
  id: string;
  title: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
  expandable?: boolean;
}

export function KBTreeNavigation({ 
  tenantId, 
  documentCount = 0, 
  referenceCount = 0,
  className 
}: KBTreeNavigationProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['document-library']));
  const pathname = usePathname();

  const navigationItems: NavItem[] = [
    {
      id: 'document-library',
      title: 'Document Library',
      href: `/t/${tenantId}/kb`,
      icon: <BookOpen className="h-4 w-4" />,
      badge: documentCount > 0 ? documentCount : undefined,
      expandable: true,
      children: [
        {
          id: 'kb-documents-browse',
          title: 'Browse Documents',
          href: `/t/${tenantId}/kb`,
          icon: <FileText className="h-4 w-4" />
        },
        {
          id: 'kb-documents-categories',
          title: 'Categories',
          href: `/t/${tenantId}/kb#categories`,
          icon: <Database className="h-4 w-4" />
        },
        {
          id: 'kb-documents-upload',
          title: 'Upload Documents',
          href: `/t/${tenantId}/kb#upload`,
          icon: <Plus className="h-4 w-4" />
        }
      ]
    },
    {
      id: 'ai-knowledge-agent',
      title: 'AI Knowledge Agent',
      href: `/t/${tenantId}/kb/agent`,
      icon: <Brain className="h-4 w-4" />,
      expandable: true,
      children: [
        {
          id: 'kb-agent-search',
          title: 'Intelligent Search',
          href: `/t/${tenantId}/kb/agent`,
          icon: <Brain className="h-4 w-4" />
        },
        {
          id: 'kb-agent-analysis',
          title: 'Content Analysis',
          href: `/t/${tenantId}/kb/agent#analysis`,
          icon: <BarChart3 className="h-4 w-4" />
        },
        {
          id: 'kb-agent-insights',
          title: 'AI Insights',
          href: `/t/${tenantId}/kb/agent#insights`,
          icon: <Brain className="h-4 w-4" />
        }
      ]
    },
    {
      id: 'reference-management',
      title: 'Reference Management',
      href: `/t/${tenantId}/kb/references`,
      icon: <ExternalLink className="h-4 w-4" />,
      badge: referenceCount > 0 ? referenceCount : undefined,
      expandable: true,
      children: [
        {
          id: 'kb-references-connected',
          title: 'Connected Knowledge Bases',
          href: `/t/${tenantId}/kb/references`,
          icon: <Network className="h-4 w-4" />
        },
        {
          id: 'kb-references-request',
          title: 'Request Access',
          href: `/t/${tenantId}/kb/references/request`,
          icon: <Plus className="h-4 w-4" />
        },
        {
          id: 'kb-references-requests',
          title: 'Pending Requests',
          href: `/t/${tenantId}/kb/references/requests`,
          icon: <Settings className="h-4 w-4" />
        },
        {
          id: 'kb-references-analytics',
          title: 'Analytics',
          href: `/t/${tenantId}/kb/references/analytics`,
          icon: <BarChart3 className="h-4 w-4" />
        }
      ]
    }
  ];

  const toggleExpanded = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === `/t/${tenantId}/kb` && pathname === `/t/${tenantId}/kb`) {
      return true;
    }
    if (href !== `/t/${tenantId}/kb` && pathname?.startsWith(href)) {
      return true;
    }
    return false;
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isExpanded = expandedSections.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.href);

    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer group",
            active && "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
            !active && "hover:bg-gray-100 dark:hover:bg-gray-800",
            level > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {/* Expand/Collapse Button */}
          {item.expandable && hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => toggleExpanded(item.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}

          {/* Navigation Link */}
          <div className="flex-1 flex items-center gap-2">
            {item.href ? (
              <Link 
                href={item.href}
                className="flex-1 flex items-center gap-2 hover:text-blue-600 transition-colors"
              >
                {item.icon}
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs ml-auto",
                      active && "bg-blue-200 dark:bg-blue-900"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ) : (
              <div 
                className="flex-1 flex items-center gap-2"
                onClick={() => item.expandable && toggleExpanded(item.id)}
              >
                {item.icon}
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="px-3 py-2 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Knowledge Repository
        </h3>
      </div>

      {/* Navigation Tree */}
      <div className="space-y-1">
        {navigationItems.map(item => renderNavItem(item))}
      </div>

      {/* Expand/Collapse All */}
      <div className="px-3 py-2 border-t">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs flex-1"
            onClick={() => setExpandedSections(new Set(['document-library', 'ai-knowledge-agent', 'reference-management']))}
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs flex-1"
            onClick={() => setExpandedSections(new Set())}
          >
            Collapse All
          </Button>
        </div>
      </div>
    </div>
  );
} 