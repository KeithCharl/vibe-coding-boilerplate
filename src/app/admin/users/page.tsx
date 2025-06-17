import { Suspense } from "react";
import { getAllUsers, getCurrentUserRole } from "@/server/actions/user-management";
import { UserManagementTable } from "@/components/user-management/user-management-table";
// import { CreateUserDialog } from "@/components/user-management/create-user-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Shield, Users } from "lucide-react";
import { redirect } from "next/navigation";

interface UserManagementPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

async function UserManagementContent({ searchParams }: UserManagementPageProps) {
  const currentUserRole = await getCurrentUserRole();
  
  // Check if user has permission to access this page
  if (!currentUserRole || !["super_admin", "tenant_admin"].includes(currentUserRole.globalRole)) {
    redirect("/");
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const search = params.search;

  const { users, total, totalPages } = await getAllUsers(page, 10, search);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions across the platform.
          </p>
        </div>
        {currentUserRole.globalRole === "super_admin" && (
          <Button disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User (Coming Soon)
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              Active users in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.globalRole === "super_admin").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Super administrators
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.globalRole === "tenant_admin").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Knowledge base owners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            View and manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable 
            users={users} 
            currentPage={page} 
            totalPages={totalPages}
            currentUserRole={currentUserRole.globalRole}
            search={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserManagementPage({ searchParams }: UserManagementPageProps) {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <UserManagementContent searchParams={searchParams} />
    </Suspense>
  );
} 