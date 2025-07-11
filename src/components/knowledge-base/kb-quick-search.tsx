"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Brain, 
  BookOpen, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface KBQuickSearchProps {
  tenantId: string;
  documentCount: number;
  referenceCount: number;
  className?: string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: 'document' | 'reference' | 'ai_insight';
  sourceLabel: string;
  score: number;
  url?: string;
}

export function KBQuickSearch({ 
  tenantId, 
  documentCount, 
  referenceCount, 
  className 
}: KBQuickSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Mock search function - in real implementation, this would call the Knowledge Base Agent API
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock results that demonstrate integration
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: 'DORA Metrics Implementation Guide',
        content: 'Comprehensive guide on implementing DORA metrics for software delivery performance measurement...',
        source: 'document',
        sourceLabel: 'Local Document',
        score: 0.95,
        url: `/t/${tenantId}/kb`
      },
      {
        id: '2',
        title: 'DevOps Best Practices from Engineering KB',
        content: 'Industry best practices for DevOps implementation shared from the Engineering knowledge base...',
        source: 'reference',
        sourceLabel: 'Engineering KB',
        score: 0.88,
        url: `/t/${tenantId}/kb/references`
      },
      {
        id: '3',
        title: 'AI-Generated Insights: Performance Optimization',
        content: 'Based on analysis of your documents and connected knowledge bases, here are optimization recommendations...',
        source: 'ai_insight',
        sourceLabel: 'AI Agent Analysis',
        score: 0.92,
        url: `/t/${tenantId}/kb/agent`
      },
      {
        id: '4',
        title: 'Deployment Frequency Best Practices',
        content: 'Strategies for improving deployment frequency based on DORA research and industry patterns...',
        source: 'document',
        sourceLabel: 'Local Document',
        score: 0.82,
        url: `/t/${tenantId}/kb`
      },
      {
        id: '5',
        title: 'Cross-Team Knowledge Sharing Patterns',
        content: 'Effective patterns for knowledge sharing across teams from the Product Management knowledge base...',
        source: 'reference',
        sourceLabel: 'Product KB',
        score: 0.79,
        url: `/t/${tenantId}/kb/references`
      }
    ];

    // Filter results based on query
    const filteredResults = mockResults.filter(result =>
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filteredResults);
    setIsSearching(false);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'document':
        return <BookOpen className="h-4 w-4 text-green-600" />;
      case 'reference':
        return <ExternalLink className="h-4 w-4 text-purple-600" />;
      case 'ai_insight':
        return <Brain className="h-4 w-4 text-blue-600" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'document':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'reference':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ai_insight':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleSearch = () => {
    performSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Quick Knowledge Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search across {documentCount} documents and {referenceCount} connected knowledge bases with AI insights
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for DORA metrics, DevOps practices, performance insights..."
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Search Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
              <BookOpen className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Local Documents</p>
                <p className="text-xs text-muted-foreground">{documentCount} files</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200">
              <ExternalLink className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Connected KBs</p>
                <p className="text-xs text-muted-foreground">{referenceCount} sources</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
              <Brain className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">AI Insights</p>
                <p className="text-xs text-muted-foreground">Powered by LLM</p>
              </div>
            </div>
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <Separator />
                
                {isSearching ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-muted-foreground">
                      Searching across documents, references, and generating AI insights...
                    </p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Search Results</h4>
                      <Badge variant="outline">{results.length} found</Badge>
                    </div>
                    
                    {results.map((result) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group"
                      >
                        <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                          <Link href={result.url || '#'}>
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h5 className="font-medium group-hover:text-blue-600 transition-colors line-clamp-1">
                                  {result.title}
                                </h5>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors ml-2 flex-shrink-0" />
                              </div>
                              
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {result.content}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getSourceIcon(result.source)}
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getSourceColor(result.source)}`}
                                  >
                                    {result.sourceLabel}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.round(result.score * 100)}% match
                                </div>
                              </div>
                            </div>
                          </Link>
                        </Card>
                      </motion.div>
                    ))}
                    
                    <div className="text-center pt-4">
                      <Button variant="outline" asChild>
                        <Link href={`/t/${tenantId}/kb/agent`}>
                          <Brain className="h-4 w-4 mr-2" />
                          Use Full AI Agent for Advanced Search
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for "{query}"</p>
                    <p className="text-sm">Try different keywords or use the AI Agent for advanced analysis</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
} 