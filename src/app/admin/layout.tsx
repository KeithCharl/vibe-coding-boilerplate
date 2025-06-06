import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/server/actions/user-management";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Settings, Shield, Activity } from "lucide-react";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

async function AdminNavigation() {
  const currentUserRole = await getCurrentUserRole();
  
  if (!currentUserRole || !["super_admin", "tenant_admin"].includes(currentUserRole.globalRole)) {
    return null;
  }

  const navigationItems = [
    {
      label: "User Management",
      href: "/admin/users",
      icon: Users,
      description: "Manage users and their roles",
      requiredRole: "tenant_admin" as const,
    },
    {
      label: "System Settings",
      href: "/admin/settings",
      icon: Settings,
      description: "Configure system-wide settings",
      requiredRole: "super_admin" as const,
    },
    {
      label: "Permissions",
      href: "/admin/permissions",
      icon: Shield,
      description: "Manage roles and permissions",
      requiredRole: "super_admin" as const,
    },
    {
      label: "Audit Logs",
      href: "/admin/audit",
      icon: Activity,
      description: "View system activity logs",
      requiredRole: "super_admin" as const,
    },
  ];

  const allowedItems = navigationItems.filter(item => {
    if (currentUserRole.globalRole === "super_admin") return true;
    return item.requiredRole === "tenant_admin";
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {allowedItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}>
            <Card className="transition-all hover:shadow-md cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const currentUserRole = await getCurrentUserRole();
  
  // Check if user has permission to access admin area
  if (!currentUserRole || !["super_admin", "tenant_admin"].includes(currentUserRole.globalRole)) {
    redirect("/");
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Administration
              </h1>
              <p className="text-muted-foreground">
                System administration and user management
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-muted-foreground">
                Role: {currentUserRole.globalRole.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
} 