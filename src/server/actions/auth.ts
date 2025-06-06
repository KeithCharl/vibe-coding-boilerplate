"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { userTenantRoles, tenants, users } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { redirect } from "next/navigation";

export type UserRole = "viewer" | "contributor" | "admin";

/**
 * Get current user session
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

/**
 * Get user's role in a specific tenant
 */
export async function getUserRole(tenantId: string): Promise<UserRole | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userRole = await db
    .select({ role: userTenantRoles.role })
    .from(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, session.user.id),
        eq(userTenantRoles.tenantId, tenantId)
      )
    )
    .limit(1);

  return userRole[0]?.role || null;
}

/**
 * Check if user has specific permissions
 */
export async function hasPermission(
  tenantId: string,
  requiredRole: UserRole
): Promise<boolean> {
  const userRole = await getUserRole(tenantId);
  if (!userRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    contributor: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Require authentication and specific role
 */
export async function requireAuth(tenantId?: string, role?: UserRole) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (tenantId && role) {
    const hasAccess = await hasPermission(tenantId, role);
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }
  }

  return session.user;
}

/**
 * Get user's tenants with roles
 */
export async function getUserTenants() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const userTenants = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      role: userTenantRoles.role,
      isActive: tenants.isActive,
    })
    .from(userTenantRoles)
    .innerJoin(tenants, eq(userTenantRoles.tenantId, tenants.id))
    .where(eq(userTenantRoles.userId, session.user.id))
    .orderBy(tenants.name);

  return userTenants;
}

/**
 * Create a new tenant (admin action)
 */
export async function createTenant(data: {
  name: string;
  slug: string;
  description?: string;
  systemPrompt?: string;
}) {
  const user = await requireAuth();
  
  // Create tenant
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description,
      systemPrompt: data.systemPrompt,
    })
    .returning();

  // Make creator an admin
  await db.insert(userTenantRoles).values({
    userId: user.id,
    tenantId: tenant.id,
    role: "admin",
  });

  return tenant;
}

/**
 * Update tenant details (admin only)
 */
export async function updateTenant(
  tenantId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    systemPrompt?: string;
    tokenCap?: number;
  }
) {
  await requireAuth(tenantId, "admin");

  // If slug is being updated, check if it's unique
  if (data.slug) {
    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, data.slug), ne(tenants.id, tenantId)))
      .limit(1);

    if (existingTenant.length > 0) {
      throw new Error("Slug is already taken");
    }
  }

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  const [updatedTenant] = await db
    .update(tenants)
    .set(updateData)
    .where(eq(tenants.id, tenantId))
    .returning();

  if (!updatedTenant) {
    throw new Error("Tenant not found");
  }

  return updatedTenant;
}

/**
 * Get tenant details
 */
export async function getTenant(tenantId: string) {
  await requireAuth(tenantId, "viewer");

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
}

/**
 * Invite user to tenant
 */
export async function inviteUserToTenant(data: {
  tenantId: string;
  userEmail: string;
  role: UserRole;
}) {
  await requireAuth(data.tenantId, "admin");

  // Find user by email
  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.userEmail))
    .limit(1);

  if (!targetUser) {
    throw new Error("User not found");
  }

  // Check if user is already in tenant
  const existingRole = await db
    .select()
    .from(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, targetUser.id),
        eq(userTenantRoles.tenantId, data.tenantId)
      )
    )
    .limit(1);

  if (existingRole.length > 0) {
    throw new Error("User is already a member of this tenant");
  }

  // Add user to tenant
  await db.insert(userTenantRoles).values({
    userId: targetUser.id,
    tenantId: data.tenantId,
    role: data.role,
  });

  return { success: true };
}

/**
 * Update user role in tenant
 */
export async function updateUserRole(data: {
  tenantId: string;
  userId: string;
  role: UserRole;
}) {
  await requireAuth(data.tenantId, "admin");

  await db
    .update(userTenantRoles)
    .set({ role: data.role })
    .where(
      and(
        eq(userTenantRoles.userId, data.userId),
        eq(userTenantRoles.tenantId, data.tenantId)
      )
    );

  return { success: true };
}

/**
 * Remove user from tenant
 */
export async function removeUserFromTenant(data: {
  tenantId: string;
  userId: string;
}) {
  await requireAuth(data.tenantId, "admin");

  await db
    .delete(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, data.userId),
        eq(userTenantRoles.tenantId, data.tenantId)
      )
    );

  return { success: true };
} 