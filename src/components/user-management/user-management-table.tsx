"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Shield,
  Eye,
} from "lucide-react";
import { type UserWithRoles, type GlobalRole } from "@/server/actions/user-management";
import { EditUserDialog } from "./edit-user-dialog";
import { UserDetailsDialog } from "./user-details-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

interface UserManagementTableProps {
  users: UserWithRoles[];
  currentPage: number;
  totalPages: number;
  currentUserRole: GlobalRole;
  search?: string;
}

const roleColors = {
  super_admin: "destructive",
  tenant_admin: "default",
  user: "secondary",
} as const;

const roleLabels = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin", 
  user: "User",
} as const;

const tenantRoleLabels = {
  admin: "Admin",
  contributor: "Contributor",
  viewer: "Viewer",
} as const;

export function UserManagementTable({
  users,
  currentPage,
  totalPages,
  currentUserRole,
  search,
}: UserManagementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search ?? "");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [dialogType, setDialogType] = useState<"edit" | "view" | "delete" | null>(null);

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to first page on search
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const openDialog = (user: UserWithRoles, type: "edit" | "view" | "delete") => {
    setSelectedUser(user);
    setDialogType(type);
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setDialogType(null);
  };

  const canEditUser = (user: UserWithRoles) => {
    if (currentUserRole === "super_admin") return true;
    if (currentUserRole === "tenant_admin" && user.globalRole === "user") return true;
    return false;
  };

  const canDeleteUser = (user: UserWithRoles) => {
    return currentUserRole === "super_admin" && user.globalRole !== "super_admin";
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(searchValue);
              }
            }}
            className="pl-8"
          />
        </div>
        <Button onClick={() => handleSearch(searchValue)}>
          Search
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Global Role</TableHead>
              <TableHead>Tenant Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
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
                  <Badge variant={roleColors[user.globalRole]}>
                    {roleLabels[user.globalRole]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.tenantRoles.length > 0 ? (
                      user.tenantRoles.map((role) => (
                        <Badge key={`${role.tenantId}-${role.role}`} variant="outline" className="text-xs">
                          {role.tenantName}: {tenantRoleLabels[role.role]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No tenant access
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Verified" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openDialog(user, "view")}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {canEditUser(user) && (
                        <>
                          <DropdownMenuItem onClick={() => openDialog(user, "edit")}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog(user, "edit")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Manage Roles
                          </DropdownMenuItem>
                        </>
                      )}
                      {canDeleteUser(user) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDialog(user, "delete")}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {search ? "No users found matching your search." : "No users found."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {selectedUser && dialogType === "edit" && (
        <EditUserDialog
          user={selectedUser}
          open={true}
          onOpenChange={closeDialog}
          currentUserRole={currentUserRole}
        />
      )}
      {selectedUser && dialogType === "view" && (
        <UserDetailsDialog
          user={selectedUser}
          open={true}
          onOpenChange={closeDialog}
        />
      )}
      {selectedUser && dialogType === "delete" && (
        <DeleteUserDialog
          user={selectedUser}
          open={true}
          onOpenChange={closeDialog}
        />
      )}
    </div>
  );
} 