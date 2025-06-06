"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantEditDialog } from "@/components/tenant/tenant-edit-dialog";

interface TenantDashboardProps {
  userTenants: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: "viewer" | "contributor" | "admin";
    isActive: boolean | null;
  }>;
  userEmail: string;
}

export function TenantDashboard({ userTenants, userEmail }: TenantDashboardProps) {
  const router = useRouter();

  const handleTenantUpdate = () => {
    router.refresh();
  };

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
                    <Card key={tenant.tenantId} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {tenant.tenantName}
                          </div>
                          <TenantEditDialog tenant={tenant} onSuccess={handleTenantUpdate} />
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

              <div>
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
                        <strong>{userEmail}</strong>
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
                      <strong>{userEmail}</strong>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 