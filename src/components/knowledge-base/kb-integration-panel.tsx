"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Brain, 
  BookOpen, 
  ExternalLink, 
  Search,
  ArrowRight,
  Database,
  Network,
  Sparkles,
  Zap,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { KBQuickSearch } from "./kb-quick-search";

interface KBIntegrationPanelProps {
  tenantId: string;
  documentCount: number;
  referenceCount: number;
  currentPage: 'main' | 'agent' | 'references';
  className?: string;
}

interface Integration {
  id: string;
  title: string;
  description: string;
  features: string[];
  action: {
    text: string;
    href: string;
    variant: 'default' | 'outline' | 'secondary';
  };
  icon: React.ReactNode;
  color: string;
  active: boolean;
}

export function KBIntegrationPanel({ 
  tenantId, 
  documentCount, 
  referenceCount, 
  currentPage,
  className 
}: KBIntegrationPanelProps) {
  const [hoveredIntegration, setHoveredIntegration] = useState<string | null>(null);

  const integrations: Integration[] = [
    {
      id: 'documents',
      title: 'Document Library',
      description: 'Your core knowledge base with documents, files, and content',
      features: [
        `${documentCount} documents available`,
        'Organized by categories',
        'Version history tracking',
        'Full-text search enabled'
      ],
      action: {
        text: currentPage === 'main' ? 'Currently Here' : 'Browse Documents',
        href: `/t/${tenantId}/kb`,
        variant: currentPage === 'main' ? 'secondary' : 'outline'
      },
      icon: <BookOpen className="h-5 w-5" />,
      color: 'bg-green-50 border-green-200 text-green-700',
      active: currentPage === 'main'
    },
    {
      id: 'agent',
      title: 'AI Agent',
      description: 'Intelligent search and analysis across all your knowledge sources',
      features: [
        'Semantic search across documents',
        'Cross-reference integration',
        'AI-powered insights',
        'Natural language queries'
      ],
      action: {
        text: currentPage === 'agent' ? 'Currently Active' : 'Use AI Agent',
        href: `/t/${tenantId}/kb/agent`,
        variant: currentPage === 'agent' ? 'secondary' : 'default'
      },
      icon: <Brain className="h-5 w-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      active: currentPage === 'agent'
    },
    {
      id: 'references',
      title: 'External References',
      description: 'Connect to other knowledge bases for enhanced search capabilities',
      features: [
        `${referenceCount} active connections`,
        'Cross-KB search enabled',
        'Shared knowledge access',
        'Collaborative intelligence'
      ],
      action: {
        text: currentPage === 'references' ? 'Managing Now' : 'Manage References',
        href: `/t/${tenantId}/kb/references`,
        variant: currentPage === 'references' ? 'secondary' : 'outline'
      },
      icon: <ExternalLink className="h-5 w-5" />,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      active: currentPage === 'references'
    }
  ];

  const workflows = [
    {
      title: "Smart Search Workflow",
      steps: [
        { text: "Upload documents", link: `/t/${tenantId}/kb`, icon: <BookOpen className="h-3 w-3" /> },
        { text: "Connect external KBs", link: `/t/${tenantId}/kb/references`, icon: <ExternalLink className="h-3 w-3" /> },
        { text: "Use AI to search all sources", link: `/t/${tenantId}/kb/agent`, icon: <Brain className="h-3 w-3" /> }
      ]
    },
    {
      title: "Knowledge Integration",
      steps: [
        { text: "Request KB access", link: `/t/${tenantId}/kb/references/request`, icon: <Network className="h-3 w-3" /> },
        { text: "Test connections", link: `/t/${tenantId}/kb/agent`, icon: <Search className="h-3 w-3" /> },
        { text: "Enhanced search results", link: `/t/${tenantId}/kb/agent`, icon: <Sparkles className="h-3 w-3" /> }
      ]
    }
  ];

  return (
    <div className={className}>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle>Integrated Knowledge Base</CardTitle>
          </div>
          <CardDescription>
            All sections work together to provide comprehensive knowledge management and intelligent search
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Integration Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <motion.div
                key={integration.id}
                onHoverStart={() => setHoveredIntegration(integration.id)}
                onHoverEnd={() => setHoveredIntegration(null)}
                className="relative"
              >
                <Card className={`transition-all duration-200 ${
                  integration.active 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : hoveredIntegration === integration.id 
                      ? 'shadow-md border-blue-300' 
                      : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${integration.color}`}>
                        {integration.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center gap-2">
                          {integration.title}
                          {integration.active && (
                            <Badge variant="default" className="bg-green-500 text-white text-xs">
                              Active
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      {integration.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant={integration.action.variant}
                      className="w-full"
                      asChild
                      disabled={integration.active}
                    >
                      <Link href={integration.action.href}>
                        {integration.action.text}
                        {!integration.active && <ArrowRight className="h-3 w-3 ml-2" />}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Separator />

          {/* Quick Search Demo */}
          <KBQuickSearch
            tenantId={tenantId}
            documentCount={documentCount}
            referenceCount={referenceCount}
          />

          <Separator />

          {/* Workflow Examples */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              Suggested Workflows
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((workflow, workflowIndex) => (
                <Card key={workflowIndex} className="p-4">
                  <h5 className="font-medium mb-3">{workflow.title}</h5>
                  <div className="space-y-2">
                    {workflow.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 text-xs font-medium">
                          {stepIndex + 1}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 justify-start h-auto p-2"
                          asChild
                        >
                          <Link href={step.link}>
                            <div className="flex items-center gap-2">
                              {step.icon}
                              <span className="text-sm">{step.text}</span>
                            </div>
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Integration Benefits */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Why Integration Matters
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
                    <div className="space-y-1">
                      <p><strong>Enhanced Search:</strong> AI agent searches across local documents and external references</p>
                      <p><strong>Unified Interface:</strong> Single platform for all knowledge management needs</p>
                    </div>
                    <div className="space-y-1">
                      <p><strong>Collaborative Knowledge:</strong> Share and access knowledge across organizations</p>
                      <p><strong>Intelligent Insights:</strong> AI discovers connections across all knowledge sources</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 