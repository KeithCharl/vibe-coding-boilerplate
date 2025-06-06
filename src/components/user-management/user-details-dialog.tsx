"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Mail, Shield, Clock, Activity } from "lucide-react";
import { type UserWithRoles } from "@/server/actions/user-management";
import { getUserAuditLog } from "@/server/actions/user-management";

interface UserDetailsDialogProps {
  user: UserWithRoles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuditLog {
  id: string;
  action: string;
  details: any;
  createdAt: Date | null;
  performedByName: string | null;
  performedByEmail: string;
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

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  useEffect(() => {
    if (open) {
      loadAuditLogs();
    }
  }, [open, user.id]);

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await getUserAuditLog(user.id);
      setAuditLogs(logs);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return "👤";
      case "updated":
        return "✏️";
      case "deleted":
        return "🗑️";
      case "tenant_role_assigned":
        return "🔑";
      case "tenant_role_removed":
        return "🔒";
      default:
        return "📝";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Detailed information and activity for this user.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-full">
          <div className="space-y-6">
            {/* User Profile */}
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="text-lg">
                  {user.name?.slice(0, 2).toUpperCase() ?? "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Verified: {formatDate(user.emailVerified)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Roles Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center">
                <Shield className="mr-2 h-4 w-4" />
                Roles & Permissions
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Global Role
                  </label>
                  <div className="mt-1">
                    <Badge variant={roleColors[user.globalRole]}>
                      {roleLabels[user.globalRole]}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tenant Access
                  </label>
                  <div className="mt-1 space-y-2">
                    {user.tenantRoles.length > 0 ? (
                      user.tenantRoles.map((role) => (
                        <div key={`${role.tenantId}-${role.role}`} className="flex items-center justify-between p-2 border rounded-md">
                          <span className="text-sm font-medium">{role.tenantName}</span>
                          <Badge variant="outline">
                            {tenantRoleLabels[role.role]}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tenant access assigned</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Activity Log */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center">
                <Activity className="mr-2 h-4 w-4" />
                Recent Activity
              </h4>
              
              <div className="space-y-3">
                {isLoadingAudit ? (
                  <div className="text-sm text-muted-foreground">Loading activity...</div>
                ) : auditLogs.length > 0 ? (
                  auditLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-md">
                      <span className="text-lg">{getActionIcon(log.action)}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By {log.performedByName || log.performedByEmail}
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground">
                            <pre className="font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 