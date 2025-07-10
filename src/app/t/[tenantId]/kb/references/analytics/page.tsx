"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock,
  Target,
  AlertTriangle,
  BarChart3,
  Activity,
  Users,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  getReferenceAnalytics,
  getTopPerformingReferences,
  getUsageTrends 
} from "@/server/actions/kb-references";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default function ReferenceAnalyticsPage({ params }: PageProps) {
  const { tenantId } = use(params);
  const [analytics, setAnalytics] = useState<any>(null);
  const [topReferences, setTopReferences] = useState<any[]>([]);
  const [usageTrends, setUsageTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [tenantId]);

  const loadAnalytics = async () => {
    try {
      const [analyticsData, topRefsData, trendsData] = await Promise.all([
        getReferenceAnalytics(tenantId),
        getTopPerformingReferences(tenantId),
        getUsageTrends(tenantId),
      ]);
      
      setAnalytics(analyticsData);
      setTopReferences(topRefsData);
      setUsageTrends(trendsData);
    } catch (error) {
      toast.error("Failed to load analytics");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/t/${tenantId}/kb/references`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to References
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reference Analytics</h1>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/t/${tenantId}/kb/references`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to References
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Reference Analytics</h1>
          <p className="text-muted-foreground">
            Monitor usage, performance, and effectiveness of your knowledge base references.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalQueries || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics?.queriesGrowth || 0}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.avgResponseTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              -{analytics?.responseTimeImprovement || 0}ms improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.successRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.successRateChange > 0 ? '+' : ''}{analytics?.successRateChange || 0}% change
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active References</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeReferences || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalReferences || 0} total configured
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">
            <Activity className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage Patterns
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Errors & Issues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing References</CardTitle>
              <CardDescription>
                References ranked by response time and success rate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topReferences.map((ref, index) => (
                  <div key={ref.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <h4 className="font-medium">{ref.name}</h4>
                        <Badge variant="outline">{ref.targetTenant?.name}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{ref.queryCount} queries</span>
                        <span>{ref.avgResponseTime}ms avg</span>
                        <span>{ref.successRate}% success</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{ref.score}</div>
                      <div className="text-xs text-muted-foreground">Performance Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <CardDescription>
                Query volume and response patterns over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageTrends.map((trend, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{trend.period}</span>
                      <span>{trend.queries} queries</span>
                    </div>
                    <Progress value={trend.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reference Usage Distribution</CardTitle>
              <CardDescription>
                How frequently each reference is used in responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topReferences.map((ref) => (
                  <div key={ref.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{ref.name}</span>
                      <span>{ref.usagePercentage}%</span>
                    </div>
                    <Progress value={ref.usagePercentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>
                Common issues and failures in reference queries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.errorBreakdown?.map((error: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <div>
                        <h4 className="font-medium">{error.type}</h4>
                        <p className="text-sm text-muted-foreground">{error.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-destructive">{error.count}</div>
                      <div className="text-xs text-muted-foreground">occurrences</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p>No errors detected</p>
                    <p className="text-sm">All references are functioning properly.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
              <CardDescription>
                References with degraded performance or high error rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.alerts?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.alerts.map((alert: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-destructive">{alert.reference}</h4>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Error Rate: {alert.errorRate}%</span>
                          <span>Avg Response: {alert.avgResponseTime}ms</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Investigate
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p>All references performing well</p>
                  <p className="text-sm">No performance alerts at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 