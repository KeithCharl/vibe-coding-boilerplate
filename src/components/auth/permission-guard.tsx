"use client";

import { ReactNode } from "react";
import { usePermissions, useHasGlobalRole, useHasTenantRole } from "@/hooks/use-permissions";
import { type GlobalRole, type UserRole } from "@/server/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldX } from "lucide-react";

interface PermissionGuardProps {
  children: ReactNode;
  globalRole?: GlobalRole;
  tenantId?: string;
  tenantRole?: UserRole;
  fallback?: ReactNode;
  loading?: ReactNode;
  requireAll?: boolean; // If true, requires both global AND tenant role
}

export function PermissionGuard({
  children,
  globalRole,
  tenantId,
  tenantRole,
  fallback,
  loading,
  requireAll = false,
}: PermissionGuardProps) {
  const { isLoading } = usePermissions(tenantId);
  const hasGlobalRole = globalRole ? useHasGlobalRole(globalRole) : true;
  const hasTenantRole = tenantRole && tenantId ? useHasTenantRole(tenantId, tenantRole) : true;

  if (isLoading) {
    return loading || (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPermission = requireAll 
    ? hasGlobalRole && hasTenantRole
    : hasGlobalRole || hasTenantRole;

  if (!hasPermission) {
    return fallback || (
      <Alert variant="destructive" className="max-w-md mx-auto">
        <ShieldX className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this content.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

// Specialized permission guards
export function GlobalRoleGuard({ 
  children, 
  role, 
  fallback 
}: { 
  children: ReactNode; 
  role: GlobalRole; 
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard globalRole={role} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function TenantRoleGuard({ 
  children, 
  tenantId, 
  role, 
  fallback 
}: { 
  children: ReactNode; 
  tenantId: string; 
  role: UserRole; 
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard tenantId={tenantId} tenantRole={role} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function AdminOnlyGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <GlobalRoleGuard role="super_admin" fallback={fallback}>
      {children}
    </GlobalRoleGuard>
  );
} 