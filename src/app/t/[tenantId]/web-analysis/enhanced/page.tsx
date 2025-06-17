import { requireAuth } from "@/server/actions/auth";
import { 
  getWebScrapingCredentials,
  getScrapingJobs,
  getRecentChanges
} from "@/server/actions/enhanced-web-scraping";
import { CredentialsManager } from "@/components/web-analysis/credentials-manager";
import { ScrapingJobsManager } from "@/components/web-analysis/scraping-jobs-manager";
import { ChangesTracker } from "@/components/web-analysis/changes-tracker";
import { EnhancedWebAnalysisDashboard } from "@/components/web-analysis/enhanced-dashboard";
import WebTemplateSelector from "@/components/WebTemplateSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Globe, 
  Key, 
  Calendar, 
  FileText,
  Settings,
  TrendingUp,
  Shield,
  Clock
} from "lucide-react";

interface EnhancedWebAnalysisPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function EnhancedWebAnalysisPage({ params }: EnhancedWebAnalysisPageProps) {
  const { tenantId } = await params;
  
  // Ensure user has access to this tenant
  await requireAuth(tenantId, "viewer");

  // Fetch all data in parallel
  const [credentials, jobs, changes] = await Promise.all([
    getWebScrapingCredentials(tenantId),
    getScrapingJobs(tenantId),
    getRecentChanges(tenantId, 50)
  ]);

  // Calculate summary statistics
  const stats = {
    totalCredentials: credentials.length,
    activeCredentials: credentials.filter(c => c.isActive).length,
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.isActive).length,
    runningJobs: jobs.filter(j => j.status === 'running').length,
    totalChanges: changes.length,
    majorChanges: changes.filter(c => c.changePercentage && c.changePercentage > 50).length,
    recentChanges: changes.length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Enhanced Web Analysis
          </h1>
          <p className="text-muted-foreground">
            Advanced website crawling with authentication, scheduling, and change tracking
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeCredentials}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.totalCredentials} total credentials
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeJobs}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.totalJobs} total jobs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.runningJobs}</div>
                <div className="text-xs text-muted-foreground">
                  Jobs running now
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.majorChanges}</div>
                <div className="text-xs text-muted-foreground">
                  Major changes detected
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scraping Jobs
          </TabsTrigger>
          <TabsTrigger value="changes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Changes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WebTemplateSelector tenantId={tenantId} />
            <EnhancedWebAnalysisDashboard 
              stats={stats}
              credentials={credentials}
              changes={changes}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="credentials">
          <CredentialsManager 
            tenantId={tenantId} 
            credentials={credentials} 
          />
        </TabsContent>
        
        <TabsContent value="jobs">
          <ScrapingJobsManager 
            tenantId={tenantId} 
            jobs={jobs}
            credentials={credentials}
          />
        </TabsContent>
        
        <TabsContent value="changes">
          <ChangesTracker 
            tenantId={tenantId} 
            changes={changes} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 