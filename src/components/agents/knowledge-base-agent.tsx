"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Eye, 
  Edit, 
  ExternalLink, 
  Save, 
  X, 
  Trash2, 
  History, 
  RotateCcw, 
  Globe,
  MoreHorizontal,
  Download,
  Calendar,
  FileIcon,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Brain,
  Settings,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Move,
  Search,
  Filter,
  Tag,
  Bot,
  Sparkles,
  MessageSquare,
  Layers,
  Database,
  Activity,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Target,
  Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Document {
  id: string;
  name: string;
  chunks?: Array<{ id: string; content: string; chunkIndex: number }>;
  fileType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fileUrl?: string;
  version?: number;
  assignedCategory?: string;
  summary?: string;
  tags?: string[];
  confidence?: number;
  aiGenerated?: boolean;
}

interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'pending' | 'disabled';
  accuracy?: number;
}

interface KnowledgeInsight {
  id: string;
  type: 'gap' | 'duplication' | 'suggestion' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  relatedDocuments?: string[];
}

interface KnowledgeBaseAgentProps {
  tenantId: string;
  initialDocuments: Document[];
  userRole: 'admin' | 'user';
  agentConfig?: {
    isEnabled: boolean;
    autoTagging: boolean;
    contentAnalysis: boolean;
    smartSuggestions: boolean;
    webScraping: boolean;
  };
}

const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    id: 'content-analysis',
    name: 'Content Analysis',
    description: 'AI-powered document analysis and categorization',
    icon: <Brain className="h-4 w-4" />,
    status: 'active',
    accuracy: 94.2
  },
  {
    id: 'smart-search',
    name: 'Semantic Search',
    description: 'Intelligent search using embeddings and context',
    icon: <Search className="h-4 w-4" />,
    status: 'active',
    accuracy: 91.8
  },
  {
    id: 'auto-tagging',
    name: 'Auto-Tagging',
    description: 'Automatic tag generation and content organization',
    icon: <Tag className="h-4 w-4" />,
    status: 'active',
    accuracy: 88.5
  },
  {
    id: 'web-extraction',
    name: 'Web Extraction',
    description: 'Enhanced web scraping with Cheerio integration',
    icon: <Globe className="h-4 w-4" />,
    status: 'active',
    accuracy: 87.3
  },
  {
    id: 'knowledge-gaps',
    name: 'Gap Detection',
    description: 'Identify missing information and knowledge gaps',
    icon: <Target className="h-4 w-4" />,
    status: 'pending',
    accuracy: 85.1
  },
  {
    id: 'content-optimization',
    name: 'Content Optimization',
    description: 'Suggest improvements and optimize knowledge base',
    icon: <TrendingUp className="h-4 w-4" />,
    status: 'pending',
    accuracy: 82.7
  }
];

const MOCK_INSIGHTS: KnowledgeInsight[] = [
  {
    id: '1',
    type: 'gap',
    title: 'Missing DORA Core Metrics Documentation',
    description: 'Your knowledge base contains DORA research but lacks specific implementation guides for the four key metrics.',
    confidence: 92,
    actionable: true,
    relatedDocuments: ['dora-2024-report', 'devops-metrics']
  },
  {
    id: '2',
    type: 'duplication',
    title: 'Duplicate Content Detected',
    description: '3 documents contain similar content about deployment frequency measurement.',
    confidence: 88,
    actionable: true,
    relatedDocuments: ['deployment-guide-1', 'deployment-guide-2', 'deployment-metrics']
  },
  {
    id: '3',
    type: 'suggestion',
    title: 'Enhanced Web Scraping Available',
    description: 'Cheerio integration can extract structured data from your DORA research links more effectively.',
    confidence: 95,
    actionable: true
  }
];

export function KnowledgeBaseAgent({ 
  tenantId, 
  initialDocuments, 
  userRole,
  agentConfig = {
    isEnabled: true,
    autoTagging: true,
    contentAnalysis: true,
    smartSuggestions: true,
    webScraping: true
  }
}: KnowledgeBaseAgentProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<KnowledgeInsight[]>(MOCK_INSIGHTS);
  const [agentEnabled, setAgentEnabled] = useState(agentConfig.isEnabled);
  const [isPending, startTransition] = useTransition();
  
  const router = useRouter();

  // Simulate AI processing
  const simulateAIProcessing = async (action: string) => {
    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    toast.success(`AI ${action} completed successfully`, {
      description: "Knowledge base has been updated with new insights"
    });
    
    setIsProcessing(false);
  };

  const handleSmartAnalysis = async () => {
    await simulateAIProcessing("analysis");
    
    // Add a new insight
    const newInsight: KnowledgeInsight = {
      id: Date.now().toString(),
      type: 'optimization',
      title: 'Content Structure Improvement',
      description: 'AI analysis suggests reorganizing your DORA metrics content for better discoverability.',
      confidence: 89,
      actionable: true,
      relatedDocuments: ['dora-metrics', 'performance-indicators']
    };
    
    setInsights(prev => [newInsight, ...prev]);
  };

  const handleWebScraping = async () => {
    toast.info("Enhanced web scraping with Cheerio", {
      description: "Extracting structured data from web sources..."
    });
    
    await simulateAIProcessing("web extraction");
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.assignedCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'disabled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'gap': return 'border-red-200 bg-red-50';
      case 'duplication': return 'border-yellow-200 bg-yellow-50';
      case 'suggestion': return 'border-blue-200 bg-blue-50';
      case 'optimization': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'gap': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'duplication': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-blue-600" />;
      case 'optimization': return <TrendingUp className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Agent Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  Knowledge Base Agent
                  <Badge className="bg-blue-100 text-blue-700 text-xs">AI-Powered</Badge>
                </h1>
                <p className="text-muted-foreground">
                  Intelligent document management with AI analysis and insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Agent Active</span>
              </div>
              
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Agent Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  AI Capabilities
                </CardTitle>
                <CardDescription>
                  Intelligent features powered by advanced AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {AGENT_CAPABILITIES.map((capability) => (
                    <div key={capability.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {capability.icon}
                          <span className="font-medium text-sm">{capability.name}</span>
                        </div>
                        <Badge className={getStatusColor(capability.status)} variant="secondary">
                          {capability.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {capability.description}
                      </p>
                      {capability.accuracy && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Accuracy</span>
                            <span className="font-medium">{capability.accuracy}%</span>
                          </div>
                          <Progress value={capability.accuracy} className="h-1" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Actions
                </CardTitle>
                <CardDescription>
                  Let AI enhance your knowledge base automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={handleSmartAnalysis} 
                    disabled={isProcessing}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Brain className="h-8 w-8 text-blue-600" />
                    <div className="text-center">
                      <div className="font-medium">Smart Analysis</div>
                      <div className="text-xs text-muted-foreground">Analyze content</div>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={handleWebScraping}
                    disabled={isProcessing}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Globe className="h-8 w-8 text-green-600" />
                    <div className="text-center">
                      <div className="font-medium">Web Extract</div>
                      <div className="text-xs text-muted-foreground">Cheerio scraping</div>
                    </div>
                  </Button>
                  
                  <Button 
                    disabled={isProcessing}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Target className="h-8 w-8 text-orange-600" />
                    <div className="text-center">
                      <div className="font-medium">Find Gaps</div>
                      <div className="text-xs text-muted-foreground">Knowledge analysis</div>
                    </div>
                  </Button>
                  
                  <Button 
                    disabled={isProcessing}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div className="text-center">
                      <div className="font-medium">Optimize</div>
                      <div className="text-xs text-muted-foreground">Improve content</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Document Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Library</CardTitle>
                    <CardDescription>
                      {documents.length} documents in your knowledge base
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-4">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search documents..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documents found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDocuments.map((doc) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group relative"
                        >
                          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <h3 className="font-medium text-sm line-clamp-1">
                                      {doc.name}
                                    </h3>
                                    {doc.fileType && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {doc.fileType.toUpperCase()}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              {doc.summary && (
                                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                                  {doc.summary}
                                </p>
                              )}
                              
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {doc.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {doc.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{doc.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown date'}
                                </span>
                                {doc.confidence && (
                                  <div className="flex items-center gap-1">
                                    <span>AI: {doc.confidence}%</span>
                                    <div className="h-1 w-8 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-500 transition-all"
                                        style={{ width: `${doc.confidence}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-6">
            
            {/* Agent Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agent Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Processing</span>
                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {isProcessing ? 'Active' : 'Ready'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Knowledge Coverage</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Content Quality</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  AI Insights
                </CardTitle>
                <CardDescription>
                  Intelligent recommendations for your knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.map((insight) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Confidence: {insight.confidence}%</span>
                          </div>
                          {insight.actionable && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs">
                              Act <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with Agent
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Workflow className="h-4 w-4 mr-2" />
                  Automation
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        tenantId={tenantId}
        onUploadComplete={() => {
          setShowUploadDialog(false);
          toast.success("Document uploaded and analyzed by AI");
          // Refresh documents
        }}
      />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-xl shadow-lg max-w-sm mx-4">
            <div className="text-center space-y-4">
              <div className="relative">
                <Bot className="h-12 w-12 mx-auto text-blue-600" />
                <div className="absolute -top-1 -right-1">
                  <div className="h-4 w-4 bg-blue-600 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">AI Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Knowledge Base Agent is analyzing your content...
                </p>
              </div>
              <Progress className="w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 