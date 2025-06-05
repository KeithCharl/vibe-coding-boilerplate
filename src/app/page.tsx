import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import Link from "next/link";
import { Building2, Plus, MessageSquare, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userTenants = await getUserTenants();

  // Always show the tenant dashboard, regardless of how many tenants user has
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Welcome to bAssist
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your AI-powered knowledge base agent. Select a tenant to continue or create a new one.
            </p>
          </div>

          {userTenants.length > 0 ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-6">Your Tenants</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userTenants.map((tenant) => (
                    <Card key={tenant.tenantId} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {tenant.tenantName}
                        </CardTitle>
                        <CardDescription>
                          Role: {tenant.role}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button asChild className="w-full">
                          <Link href={`/t/${tenant.tenantId}`}>
                            Open Tenant
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-xl font-semibold mb-4">Create or Join</h3>
                <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
                  <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Create New Tenant
                      </CardTitle>
                      <CardDescription>
                        Start your own knowledge base with AI-powered chat
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link href="/create-tenant">
                          Create Tenant
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Join Existing Tenant
                      </CardTitle>
                      <CardDescription>
                        Get invited by an admin to join their knowledge base
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Ask your team admin to invite you using your email:{" "}
                        <strong>{session.user.email}</strong>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center">
              <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
                <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create New Tenant
                    </CardTitle>
                    <CardDescription>
                      Start your own knowledge base with AI-powered chat
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href="/create-tenant">
                        Create Tenant
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Join Existing Tenant
                    </CardTitle>
                    <CardDescription>
                      Get invited by an admin to join their knowledge base
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Ask your team admin to invite you using your email:{" "}
                      <strong>{session.user.email}</strong>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-12 max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-6">Features</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium mb-1">AI Chat</h3>
                    <p className="text-sm text-muted-foreground">
                      Chat with your knowledge base using advanced AI
                    </p>
                  </div>
                  <div className="text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium mb-1">Document Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload and organize your documents with smart search
                    </p>
                  </div>
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium mb-1">Team Collaboration</h3>
                    <p className="text-sm text-muted-foreground">
                      Role-based access control for team workflows
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
