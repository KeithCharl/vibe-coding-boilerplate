import { Suspense } from "react";
import { requireAuth, getUserTenants, getCurrentUser } from "@/server/actions/auth";
import { getAllUsers, getCurrentUserRole, assignTenantRole, removeTenantRole, type TenantRole } from "@/server/actions/user-management";
import { db } from "@/server/db";
import { users, userTenantRoles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Shield, Eye, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { TenantUserActions } from "@/components/tenant-users/tenant-user-actions";

interface TenantUsersPageProps {
  params: Promise<{ tenantId: string }>;
}

const roleLabels = {
  viewer: "Viewer",
  contributor: "Contributor", 
  admin: "Admin",
} as const;

const roleColors = {
  admin: "destructive",
  contributor: "default",
  viewer: "secondary",
} as const;

async function TenantUsersContent({ tenantId }: { tenantId: string }) {
  await requireAuth(tenantId, "admin");
  
  // Get current user's role without requiring global permissions
  const currentUser = await getCurrentUser();
  
  // Get all users with their tenant roles for this specific tenant only
  const tenantUserRoles = await db
    .select({
      userId: userTenantRoles.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      role: userTenantRoles.role,
    })
    .from(userTenantRoles)
    .innerJoin(users, eq(userTenantRoles.userId, users.id))
    .where(eq(userTenantRoles.tenantId, tenantId));

  // Get all users who don't have roles in this tenant yet
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users);

  // Filter for available users (those not in this tenant)
  const tenantUserIds = new Set(tenantUserRoles.map(u => u.userId));
  const availableUsers = allUsers.filter(user => !tenantUserIds.has(user.id));

  // Format tenant users for display
  const tenantUsers = tenantUserRoles.map(role => ({
    id: role.userId,
    name: role.userName,
    email: role.userEmail,
    image: role.userImage,
    emailVerified: null,
    globalRole: "user" as const,
    tenantRoles: [{
      tenantId,
      tenantName: "Current Tenant",
      role: role.role as TenantRole,
    }],
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Users</h1>
          <p className="text-muted-foreground">
            Manage user access and roles for this knowledge base.
          </p>
        </div>
                 <TenantUserActions tenantId={tenantId} availableUsers={availableUsers.map(u => ({
           ...u,
           emailVerified: null,
           globalRole: "user" as const,
           tenantRoles: [],
         }))} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Users with access to this tenant
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
              {tenantUsers.filter(u => u.tenantRoles.find(r => r.tenantId === tenantId)?.role === "admin").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Can manage this knowledge base
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contributors</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenantUsers.filter(u => u.tenantRoles.find(r => r.tenantId === tenantId)?.role === "contributor").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Can edit content
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users with Access</CardTitle>
          <CardDescription>
            Users who have been granted access to this knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No users assigned</h3>
              <p className="text-muted-foreground mb-6">
                No users have been given access to this knowledge base yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role in Tenant</TableHead>
                    <TableHead>Global Role</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUsers.map((user) => {
                    const tenantRole = user.tenantRoles.find(r => r.tenantId === tenantId);
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback>
                                {user.name?.slice(0, 2).toUpperCase() ?? "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tenantRole && (
                            <Badge variant={roleColors[tenantRole.role]}>
                              {roleLabels[tenantRole.role]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.globalRole.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TenantUserActions 
                            tenantId={tenantId} 
                            user={user} 
                            currentRole={tenantRole?.role}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TenantUsersPage({ params }: TenantUsersPageProps) {
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
      {params.then(({ tenantId }) => (
        <TenantUsersContent tenantId={tenantId} />
      ))}
    </Suspense>
  );
} 