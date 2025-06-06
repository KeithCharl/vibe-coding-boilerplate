import { requireAuth, getTenant } from "@/server/actions/auth";
import { getFeedbackStats, getTenantFeedback } from "@/server/actions/feedback";
import { getChatAnalytics } from "@/server/actions/chat";
import {
  getDocumentUsageAnalytics,
  getPopularQueriesAnalytics,
  getUserActivityAnalytics,
  getAnalyticsOverview
} from "@/server/actions/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { BarChart3 } from "lucide-react";

interface AnalyticsPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { tenantId } = await params;
  
  // Ensure user has access to analytics (contributor or admin only)
  await requireAuth(tenantId, "contributor");

  // Fetch all analytics data
  const [
    tenant, 
    feedbackStats, 
    tenantFeedback, 
    chatAnalytics,
    documentUsage,
    popularQueries,
    userActivity,
    analyticsOverview
  ] = await Promise.all([
    getTenant(tenantId),
    getFeedbackStats(tenantId),
    getTenantFeedback(tenantId),
    getChatAnalytics(tenantId),
    getDocumentUsageAnalytics(tenantId).catch(() => []),
    getPopularQueriesAnalytics(tenantId).catch(() => []),
    getUserActivityAnalytics(tenantId).catch(() => []),
    getAnalyticsOverview(tenantId).catch(() => ({
      totalQueries: 0,
      totalFeedback: 0,
      activeUsers: 0,
      documentsReferenced: 0,
      averageSessionLength: 0
    }))
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <BreadcrumbNav 
          items={[
            { label: tenant.name, href: `/t/${tenantId}` },
            { label: "Analytics" }
          ]} 
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Analytics & Feedback
            </h1>
            <p className="text-muted-foreground">
              Monitor user interactions, feedback, and system performance
            </p>
          </div>
        </div>
      </div>

      <AnalyticsDashboard 
        tenantId={tenantId}
        feedbackStats={feedbackStats}
        tenantFeedback={tenantFeedback}
        chatAnalytics={chatAnalytics}
        documentUsage={documentUsage}
        popularQueries={popularQueries}
        userActivity={userActivity}
        analyticsOverview={analyticsOverview}
      />
    </div>
  );
} 