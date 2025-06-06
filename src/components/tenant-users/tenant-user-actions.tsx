"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  UserPlus, 
  MoreHorizontal, 
  Edit, 
  UserMinus, 
  Loader2,
  AlertTriangle 
} from "lucide-react";
import { 
  assignTenantRole, 
  removeTenantRole, 
  type UserWithRoles, 
  type TenantRole 
} from "@/server/actions/user-management";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TenantUserActionsProps {
  tenantId: string;
  user?: UserWithRoles;
  currentRole?: TenantRole;
  availableUsers?: UserWithRoles[];
}

const roleLabels = {
  viewer: "Viewer",
  contributor: "Contributor", 
  admin: "Admin",
} as const;

export function TenantUserActions({ 
  tenantId, 
  user, 
  currentRole, 
  availableUsers 
}: TenantUserActionsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<TenantRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Add user to tenant
  const handleAddUser = async () => {
    if (!selectedUser || !selectedRole) return;

    setIsLoading(true);
    try {
      await assignTenantRole({
        userId: selectedUser,
        tenantId,
        role: selectedRole,
      });
      toast.success("User added to tenant successfully");
      setShowAddDialog(false);
      setSelectedUser("");
      setSelectedRole("viewer");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  };

  // Update user role in tenant
  const handleUpdateRole = async () => {
    if (!user || !selectedRole) return;

    setIsLoading(true);
    try {
      await assignTenantRole({
        userId: user.id,
        tenantId,
        role: selectedRole,
      });
      toast.success("User role updated successfully");
      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove user from tenant
  const handleRemoveUser = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await removeTenantRole(user.id, tenantId);
      toast.success("User removed from tenant");
      setShowRemoveDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove user");
    } finally {
      setIsLoading(false);
    }
  };

  // If this is for adding users (no user prop), show add button
  if (!user && availableUsers) {
    return (
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add User to Tenant</DialogTitle>
            <DialogDescription>
              Select a user and assign them a role in this knowledge base.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.image ?? undefined} />
                          <AvatarFallback>
                            {user.name?.slice(0, 2).toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as TenantRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - Can view content</SelectItem>
                  <SelectItem value="contributor">Contributor - Can edit content</SelectItem>
                  <SelectItem value="admin">Admin - Can manage everything</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={isLoading || !selectedUser}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // If this is for managing existing user, show actions dropdown
  if (user && currentRole) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              setSelectedRole(currentRole);
              setShowEditDialog(true);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowRemoveDialog(true)}
              className="text-destructive"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Access
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Role Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update {user.name}'s role in this knowledge base.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 border rounded-md">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback>
                    {user.name?.slice(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">New Role</label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as TenantRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer - Can view content</SelectItem>
                    <SelectItem value="contributor">Contributor - Can edit content</SelectItem>
                    <SelectItem value="admin">Admin - Can manage everything</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={isLoading || selectedRole === currentRole}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove User Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span>Remove User Access</span>
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {user.name}'s access to this knowledge base? 
                They will no longer be able to view or interact with the content.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex items-center space-x-3 p-4 border rounded-md">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback>
                  {user.name?.slice(0, 2).toUpperCase() ?? "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <Badge variant={currentRole === "admin" ? "destructive" : currentRole === "contributor" ? "default" : "secondary"}>
                  {roleLabels[currentRole]}
                </Badge>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRemoveDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveUser}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove Access
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
} 