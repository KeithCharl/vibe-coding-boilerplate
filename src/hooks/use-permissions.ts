"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getGlobalUserRole, getUserRole, type GlobalRole, type UserRole } from "@/server/actions/auth";

interface UserPermissions {
  globalRole: GlobalRole | null;
  tenantRole: UserRole | null;
  isLoading: boolean;
  error: string | null;
}

export function usePermissions(tenantId?: string) {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions>({
    globalRole: null,
    tenantRole: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!session?.user) {
      setPermissions({
        globalRole: null,
        tenantRole: null,
        isLoading: false,
        error: "Not authenticated",
      });
      return;
    }

    const fetchPermissions = async () => {
      try {
        setPermissions(prev => ({ ...prev, isLoading: true, error: null }));

        const [globalRole, tenantRole] = await Promise.all([
          getGlobalUserRole(),
          tenantId ? getUserRole(tenantId) : Promise.resolve(null),
        ]);

        setPermissions({
          globalRole,
          tenantRole,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
        setPermissions(prev => ({
          ...prev,
          isLoading: false,
          error: "Failed to load permissions",
        }));
      }
    };

    fetchPermissions();
  }, [session?.user, tenantId]);

  return permissions;
}

export function useGlobalPermissions() {
  return usePermissions();
}

export function useTenantPermissions(tenantId: string) {
  return usePermissions(tenantId);
}

// Permission check hooks
export function useHasGlobalRole(requiredRole: GlobalRole) {
  const { globalRole, isLoading } = useGlobalPermissions();
  
  const roleHierarchy = {
    super_admin: 3,
    tenant_admin: 2,
    user: 1,
  };

  if (isLoading || !globalRole) return false;
  
  return roleHierarchy[globalRole] >= roleHierarchy[requiredRole];
}

export function useHasTenantRole(tenantId: string, requiredRole: UserRole) {
  const { tenantRole, isLoading } = useTenantPermissions(tenantId);
  
  const roleHierarchy = {
    admin: 3,
    contributor: 2,
    viewer: 1,
  };

  if (isLoading || !tenantRole) return false;
  
  return roleHierarchy[tenantRole] >= roleHierarchy[requiredRole];
}

// Combined permission checks
export function useCanAccessAdminPanel() {
  return useHasGlobalRole("tenant_admin");
}

export function useCanManageUsers() {
  return useHasGlobalRole("super_admin");
}

export function useCanManageTenant(tenantId: string) {
  const hasGlobalAccess = useHasGlobalRole("tenant_admin");
  const hasTenantAccess = useHasTenantRole(tenantId, "admin");
  
  return hasGlobalAccess || hasTenantAccess;
} 