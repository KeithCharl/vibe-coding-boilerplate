"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus, Shield, BarChart3, Users, ArrowRight, CheckCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const roleColors = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  contributor: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
};

const roleLabels = {
  admin: "Administrator",
  contributor: "Contributor", 
  viewer: "Viewer",
};

export function TenantDashboard({ userTenants, userEmail }: TenantDashboardProps) {
  const router = useRouter();

  const handleTenantUpdate = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
              {/* Professional Header */}
        <div className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                      Enterprise Knowledge Platform
                    </h1>
                    <p className="text-lg text-gray-600">
                      Intelligent data management and collaborative analytics
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span>Enterprise Grade Security</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>Multi-Tenant Architecture</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {userTenants.length > 0 ? (
            <>
              {/* Workspace Overview */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">Your Workspaces</h2>
                    <p className="text-muted-foreground mt-1">
                      Manage and access your organization's knowledge domains
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span>{userTenants.length} Active Workspace{userTenants.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {userTenants.map((tenant) => (
                    <Card key={tenant.tenantId} className="bg-white border shadow-sm hover:shadow-lg transition-all duration-200 group cursor-pointer animate-fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {tenant.tenantName}
                              </CardTitle>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs font-medium ${roleColors[tenant.role]}`}
                              >
                                {roleLabels[tenant.role]}
                              </Badge>
                            </div>
                          </div>
                          <TenantEditDialog tenant={tenant} onSuccess={handleTenantUpdate} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Active & Operational</span>
                        </div>
                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm group">
                          <Link href={`/t/${tenant.tenantId}`} className="flex items-center justify-center gap-2">
                            <span>Access Workspace</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Enterprise Actions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Workspace Management</h3>
                  <p className="text-muted-foreground mt-1">
                    Create new workspaces or join existing organizational units
                  </p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
                  <Card className="business-card border-2 border-dashed border-primary/30 hover:border-primary/50 group">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <span>Create New Workspace</span>
                      </CardTitle>
                      <CardDescription className="text-base">
                        Establish a new knowledge domain with advanced AI capabilities and enterprise security
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full btn-executive">
                        <Link href="/create-tenant">
                          Create Workspace
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="business-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="h-10 w-10 bg-secondary/80 rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <span>Join Existing Workspace</span>
                      </CardTitle>
                      <CardDescription className="text-base">
                        Request access to an organizational workspace through administrator invitation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Your Professional Email
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Provide this email to your workspace administrator for invitation
                        </p>
                      </div>
                      <Button variant="outline" className="w-full" disabled>
                        Awaiting Administrator Invitation
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Welcome Experience for New Users */}
              <div className="text-center space-y-8 py-12">
                <div className="space-y-4">
                  <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Building2 className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">
                    Welcome to Your Enterprise Knowledge Platform
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Begin your journey with intelligent data management and AI-powered analytics. 
                    Create your first workspace or join an existing organizational unit.
                  </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
                  <Card className="business-card border-2 border-dashed border-primary/30 hover:border-primary/50 group">
                    <CardHeader className="text-center pb-6">
                      <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                        <Plus className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Create New Workspace</CardTitle>
                      <CardDescription className="text-base">
                        Establish your organization's knowledge infrastructure with enterprise-grade security and AI capabilities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full btn-executive">
                        <Link href="/create-tenant">
                          Initialize Workspace
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="business-card">
                    <CardHeader className="text-center pb-6">
                      <div className="h-16 w-16 bg-secondary/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-secondary-foreground" />
                      </div>
                      <CardTitle className="text-xl">Join Organization</CardTitle>
                      <CardDescription className="text-base">
                        Connect with your team's existing workspace through administrator invitation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Professional Email Address
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Share this email with your administrator for workspace access
                        </p>
                      </div>
                      <Button variant="outline" className="w-full" disabled>
                        Awaiting Administrator Invitation
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Enterprise Features */}
              <div className="bg-muted/30 rounded-2xl p-8 mt-12">
                <div className="text-center space-y-6">
                  <h3 className="text-2xl font-semibold text-foreground">
                    Enterprise-Grade Knowledge Management
                  </h3>
                  <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
                    <div className="text-center space-y-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground">Secure & Compliant</h4>
                      <p className="text-sm text-muted-foreground">
                        Enterprise-grade security with multi-tenant isolation and data compliance
                      </p>
                    </div>
                    <div className="text-center space-y-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground">AI-Powered Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Advanced insights and intelligent search capabilities across your knowledge base
                      </p>
                    </div>
                    <div className="text-center space-y-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-foreground">Global Scalability</h4>
                      <p className="text-sm text-muted-foreground">
                        Multi-tenant architecture designed for enterprise-scale operations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 