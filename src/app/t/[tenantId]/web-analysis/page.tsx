import { getWebAnalyses, getWebAnalysisStats } from "@/server/actions/web-analysis";
import { requireAuth } from "@/server/actions/auth";
import { WebAnalysisList } from "@/components/web-analysis/web-analysis-list";
import { AnalyzeUrlForm } from "@/components/web-analysis/analyze-url-form";
import { WebAnalysisStats } from "@/components/web-analysis/web-analysis-stats";
import { CheerioDemo } from "@/components/web-analysis/cheerio-demo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, TrendingUp, Settings, Sparkles } from "lucide-react";
import Link from "next/link";

interface WebAnalysisPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function WebAnalysisPage({ params }: WebAnalysisPageProps) {
  const { tenantId } = await params;
  
  // Ensure user has access to this tenant
  await requireAuth(tenantId, "viewer");

  // Fetch analyses and stats for this tenant
  const [analyses, stats] = await Promise.all([
    getWebAnalyses(tenantId),
    getWebAnalysisStats(tenantId)
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Web Analysis
          </h1>
          <p className="text-muted-foreground">
            Analyze external websites and extract content for your knowledge base using enhanced Cheerio-powered scraping.
          </p>
        </div>
        <Link 
          href={`/t/${tenantId}/web-analysis/enhanced`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Enhanced Features
        </Link>
      </div>

      {/* Stats Overview */}
      <WebAnalysisStats stats={stats} />

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Standard Analysis
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Enhanced Cheerio Demo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="space-y-6">
          {/* URL Analysis Form */}
          <AnalyzeUrlForm tenantId={tenantId} />

          {/* Analysis Results */}
          {analyses.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Analysis Results</h2>
                <span className="text-sm text-muted-foreground">({analyses.length} total)</span>
              </div>
              <WebAnalysisList analyses={analyses} tenantId={tenantId} />
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No web analyses yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Start by analyzing your first website or webpage. The content will be processed 
                and made available for AI-powered search and analysis.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="demo" className="space-y-6">
          <CheerioDemo tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 