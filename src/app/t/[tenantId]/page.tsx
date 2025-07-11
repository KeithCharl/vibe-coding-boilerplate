import { getDocumentStats } from "@/server/actions/content";
import { getChatSessions } from "@/server/actions/chat";
import { getFeedbackStats } from "@/server/actions/feedback";
import { requireAuth, getTenant } from "@/server/actions/auth";
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
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

interface TenantDashboardProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDashboard({ params }: TenantDashboardProps) {
  const { tenantId } = await params;
  
  // Ensure user has access to this tenant
  await requireAuth(tenantId, "viewer");

  // Fetch tenant info and dashboard stats
  const [tenant, docStats, chatSessions, feedbackStats] = await Promise.all([
    getTenant(tenantId),
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
      <div className="space-y-4">
        <BreadcrumbNav 
          items={[
            { label: tenant.name, href: `/t/${tenantId}` },
            { label: "Dashboard" }
          ]} 
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-bancon-navy">Dashboard</h1>
            <p className="text-gray-600 text-lg mt-2">
              Overview of your knowledge base and AI interactions
            </p>
          </div>
          <Button 
            variant="outline" 
            asChild
            className="btn-bancon-outline"
          >
            <Link href="/" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              All Workspaces
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href={`/t/${tenantId}/kb`}>
          <Card className="card-bancon cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-bancon-navy">Documents</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-bancon-teal/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-bancon-teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-bancon-navy">{docStats.totalDocuments}</div>
              <p className="text-sm text-gray-600 mt-1">
                {docStats.totalChunks} total chunks
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/t/${tenantId}/chat`}>
          <Card className="card-bancon cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-bancon-navy">Chat Sessions</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-bancon-navy/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-bancon-navy" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-bancon-navy">{chatSessions.length}</div>
              <p className="text-sm text-gray-600 mt-1">
                Total conversations
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/t/${tenantId}/analytics`}>
          <Card className="card-bancon cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-bancon-navy">Avg Rating</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-bancon-orange/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-bancon-orange" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-bancon-navy">
                {feedbackStats.averageRating.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {feedbackStats.totalFeedback} feedback entries
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="card-bancon">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-bancon-navy">Growth</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-bancon-teal/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-bancon-teal" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-bancon-navy">+12%</div>
            <p className="text-sm text-gray-600 mt-1">
              From last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-bancon">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-bancon-navy">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button 
              asChild 
              className="justify-start btn-bancon-primary h-12"
              style={{ 
                backgroundColor: '#00B3B0',
                color: 'white'
              }}
            >
              <Link href={`/t/${tenantId}/chat`}>
                <MessageSquare className="h-4 w-4 mr-3" />
                Start New Chat
              </Link>
            </Button>
            <Button 
              asChild 
              className="justify-start btn-bancon-outline h-12"
              style={{ 
                borderColor: '#002C54',
                color: '#002C54'
              }}
            >
              <Link href={`/t/${tenantId}/kb`}>
                <Upload className="h-4 w-4 mr-3" />
                Upload Document
              </Link>
            </Button>
            <Button 
              asChild 
              className="justify-start btn-bancon-outline h-12"
              style={{ 
                borderColor: '#FF6B00',
                color: '#FF6B00'
              }}
            >
              <Link href={`/t/${tenantId}/users`}>
                <Users className="h-4 w-4 mr-3" />
                Manage Users
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-bancon">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-bancon-navy">Recent Chat Sessions</CardTitle>
            <CardDescription className="text-gray-600">
              Your latest conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-xl bg-bancon-teal/10 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-bancon-teal" />
                </div>
                <p className="text-gray-600 mb-4">
                  No chat sessions yet
                </p>
                <Button 
                  asChild 
                  className="btn-bancon-primary"
                  style={{ 
                    backgroundColor: '#00B3B0',
                    color: 'white'
                  }}
                >
                  <Link href={`/t/${tenantId}/chat`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start Chatting
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-bancon-teal transition-all duration-200"
                  >
                    <div>
                      <p className="font-bold text-bancon-navy text-sm">{session.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <Button 
                      asChild 
                      size="sm" 
                      className="btn-bancon-outline"
                      style={{ 
                        borderColor: '#00B3B0',
                        color: '#00B3B0'
                      }}
                    >
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