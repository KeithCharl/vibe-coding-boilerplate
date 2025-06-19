import { getCurrentUserRole } from "@/server/actions/user-management";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Settings, Shield, Activity, FileText } from "lucide-react";
import Link from "next/link";

async function AdminNavigation() {
  const currentUserRole = await getCurrentUserRole();
  
  if (!currentUserRole) {
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
      label: "Template Submissions",
      href: "/admin/template-submissions",
      icon: FileText,
      description: "Review and approve template submissions",
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

export default async function AdminDashboard() {
  const currentUserRole = await getCurrentUserRole();
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Welcome to the Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Select an area below to manage your system.
        </p>
      </div>

      {/* Navigation Cards */}
      <AdminNavigation />

      {/* Quick Info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Your Permissions</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Global Role:</span>
              <span className="font-medium">
                {currentUserRole?.globalRole?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div className="space-y-1">
              <span>Available Actions:</span>
              <ul className="list-disc list-inside text-muted-foreground pl-4">
                {currentUserRole?.globalRole === "super_admin" && (
                  <>
                    <li>Create, edit, and delete all users</li>
                    <li>Manage system-wide settings</li>
                    <li>View audit logs and analytics</li>
                    <li>Assign roles and permissions</li>
                  </>
                )}
                {currentUserRole?.globalRole === "tenant_admin" && (
                  <>
                    <li>View and edit regular users</li>
                    <li>Manage knowledge base assignments</li>
                    <li>View user activity within assigned tenants</li>
                  </>
                )}
                {currentUserRole?.globalRole === "user" && (
                  <li>Access only assigned knowledge bases</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 