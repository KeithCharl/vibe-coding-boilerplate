import { type GlobalRole, type UserRole } from "@/server/actions/auth";

// Role hierarchy definitions
export const GLOBAL_ROLE_HIERARCHY = {
  super_admin: 3,
  tenant_admin: 2,
  user: 1,
} as const;

export const TENANT_ROLE_HIERARCHY = {
  admin: 3,
  contributor: 2,
  viewer: 1,
} as const;

// Permission checking utilities
export function hasGlobalPermission(userRole: GlobalRole | null, requiredRole: GlobalRole): boolean {
  if (!userRole) return false;
  return GLOBAL_ROLE_HIERARCHY[userRole] >= GLOBAL_ROLE_HIERARCHY[requiredRole];
}

export function hasTenantPermission(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return TENANT_ROLE_HIERARCHY[userRole] >= TENANT_ROLE_HIERARCHY[requiredRole];
}

// Permission constants for common use cases
export const PERMISSIONS = {
  // Global permissions
  MANAGE_USERS: "super_admin" as GlobalRole,
  MANAGE_TENANTS: "tenant_admin" as GlobalRole,
  ACCESS_ADMIN: "tenant_admin" as GlobalRole,
  
  // Tenant permissions
  MANAGE_TENANT: "admin" as UserRole,
  EDIT_CONTENT: "contributor" as UserRole,
  VIEW_CONTENT: "viewer" as UserRole,
} as const;

// Role descriptions and metadata
export const ROLE_METADATA = {
  global: {
    super_admin: {
      label: "Super Administrator",
      description: "Full system access with all permissions",
      color: "destructive",
      icon: "Shield",
    },
    tenant_admin: {
      label: "Tenant Administrator", 
      description: "Manage tenants and users within assigned scope",
      color: "default",
      icon: "Settings",
    },
    user: {
      label: "User",
      description: "Standard user with basic access",
      color: "secondary", 
      icon: "User",
    },
  },
  tenant: {
    admin: {
      label: "Administrator",
      description: "Full control over workspace and users",
      color: "destructive",
      icon: "Shield",
    },
    contributor: {
      label: "Contributor",
      description: "Create and edit content, collaborate with team",
      color: "default",
      icon: "Users",
    },
    viewer: {
      label: "Viewer", 
      description: "Read-only access to content",
      color: "secondary",
      icon: "Eye",
    },
  },
} as const;

// Audit action types
export const AUDIT_ACTIONS = {
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated", 
  USER_DELETED: "user_deleted",
  ROLE_ASSIGNED: "role_assigned",
  ROLE_UPDATED: "role_updated",
  ROLE_REMOVED: "role_removed",
  LOGIN: "login",
  LOGOUT: "logout",
  PERMISSION_DENIED: "permission_denied",
} as const;

// Security settings
export const SECURITY_SETTINGS = {
  // Session settings
  SESSION_MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  
  // Password requirements (for future implementation)
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SYMBOLS: true,
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes
  
  // Audit retention
  AUDIT_LOG_RETENTION_DAYS: 90,
} as const; 