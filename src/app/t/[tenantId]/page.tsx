import { getDocumentStats } from "@/server/actions/content";
import { getChatSessions } from "@/server/actions/chat";
import { getFeedbackStats } from "@/server/actions/feedback";
import { requireAuth } from "@/server/actions/auth";
import Link from "next/link";
import { 
  MessageSquare, 
  BookOpen, 
  Upload, 
  Plus,
  TrendingUp,
  Users,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TenantDashboardProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDashboard({ params }: TenantDashboardProps) {
  const { tenantId } = await params;
  
  // Ensure user has access to this tenant
  await requireAuth(tenantId, "viewer");

  // Fetch dashboard stats
  const [docStats, chatSessions, feedbackStats] = await Promise.all([
    getDocumentStats(tenantId),
    getChatSessions(tenantId),
    getFeedbackStats(tenantId).catch(() => ({
      averageRating: 0,
      totalFeedback: 0,
      ratingDistribution: [],
      recentComments: []
    }))
  ]);

  const recentSessions = chatSessions.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your knowledge base and AI interactions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{docStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {docStats.totalChunks} total chunks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              Total conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {feedbackStats.averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {feedbackStats.totalFeedback} feedback entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">
              From last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild className="justify-start">
              <Link href={`/t/${tenantId}/chat`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Start New Chat
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href={`/t/${tenantId}/kb`}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href={`/t/${tenantId}/users`}>
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Chat Sessions</CardTitle>
            <CardDescription>
              Your latest conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No chat sessions yet
                </p>
                <Button asChild className="mt-2" size="sm">
                  <Link href={`/t/${tenantId}/chat`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start Chatting
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <p className="font-medium text-sm">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/t/${tenantId}/chat/${session.id}`}>
                        Continue
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 