"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, like, or, count, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  users,
  globalUserRoles,
  userTenantRoles,
  userAuditLog,
  tenants,
} from "@/server/db/schema";
import { getServerAuthSession } from "@/server/auth";

// Types for user management
export type GlobalRole = "super_admin" | "tenant_admin" | "user";
export type TenantRole = "viewer" | "contributor" | "admin";

export interface UserWithRoles {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: Date | null;
  globalRole: GlobalRole;
  tenantRoles: Array<{
    tenantId: string;
    tenantName: string;
    role: TenantRole;
  }>;
}

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  globalRole: z.enum(["super_admin", "tenant_admin", "user"]).default("user"),
});

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, "Name is required").optional(),
  globalRole: z.enum(["super_admin", "tenant_admin", "user"]).optional(),
});

const assignTenantRoleSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["viewer", "contributor", "admin"]),
});

// Helper function to check if user has permission
async function hasGlobalPermission(requiredRole: GlobalRole = "super_admin") {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  let userRole = await db
    .select()
    .from(globalUserRoles)
    .where(eq(globalUserRoles.userId, session.user.id))
    .limit(1);

  // If user has no global role, assign default "user" role
  if (!userRole.length) {
    await db.insert(globalUserRoles).values({
      userId: session.user.id,
      role: "user",
    });
    
    userRole = [{
      id: "auto-assigned",
      userId: session.user.id,
      role: "user" as GlobalRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
  }

  const currentRole = userRole[0]!.role;
  
  // Define role hierarchy
  const roleHierarchy = {
    super_admin: 3,
    tenant_admin: 2,
    user: 1,
  };

  if (roleHierarchy[currentRole] < roleHierarchy[requiredRole]) {
    throw new Error("Insufficient permissions");
  }

  return session.user.id;
}

// Log user management actions
async function logUserAction(
  performedBy: string,
  targetUserId: string,
  action: string,
  details?: any
) {
  await db.insert(userAuditLog).values({
    performedBy,
    targetUserId,
    action,
    details,
  });
}

// Get all users with their roles
export async function getAllUsers(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  await hasGlobalPermission("tenant_admin");

  const offset = (page - 1) * limit;

  // Build search condition
  const searchCondition = search
    ? or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      )
    : undefined;

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(users)
    .where(searchCondition);

  const total = totalResult[0]?.count ?? 0;

  // Get users with global roles
  const usersWithGlobalRoles = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      emailVerified: users.emailVerified,
      globalRole: globalUserRoles.role,
    })
    .from(users)
    .leftJoin(globalUserRoles, eq(users.id, globalUserRoles.userId))
    .where(searchCondition)
    .orderBy(desc(users.id))
    .limit(limit)
    .offset(offset);

  // Get tenant roles for all users
  const userIds = usersWithGlobalRoles.map((u) => u.id);
  const tenantRoles = userIds.length > 0 ? await db
    .select({
      userId: userTenantRoles.userId,
      tenantId: userTenantRoles.tenantId,
      role: userTenantRoles.role,
      tenantName: tenants.name,
    })
    .from(userTenantRoles)
    .innerJoin(tenants, eq(userTenantRoles.tenantId, tenants.id))
    .where(
      userIds.length === 1 
        ? eq(userTenantRoles.userId, userIds[0]!)
        : or(...userIds.map(id => eq(userTenantRoles.userId, id)))
    ) : [];

  // Build response
  const usersWithRoles: UserWithRoles[] = usersWithGlobalRoles.map((user) => ({
    ...user,
    globalRole: (user.globalRole ?? "user") as GlobalRole,
    tenantRoles: tenantRoles
      .filter((tr) => tr.userId === user.id)
      .map((tr) => ({
        tenantId: tr.tenantId,
        tenantName: tr.tenantName,
        role: tr.role as TenantRole,
      })),
  }));

  return {
    users: usersWithRoles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Get user by ID with roles
export async function getUserById(userId: string) {
  await hasGlobalPermission("tenant_admin");

  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      emailVerified: users.emailVerified,
      globalRole: globalUserRoles.role,
    })
    .from(users)
    .leftJoin(globalUserRoles, eq(users.id, globalUserRoles.userId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user.length) {
    throw new Error("User not found");
  }

  const tenantRoles = await db
    .select({
      tenantId: userTenantRoles.tenantId,
      role: userTenantRoles.role,
      tenantName: tenants.name,
    })
    .from(userTenantRoles)
    .innerJoin(tenants, eq(userTenantRoles.tenantId, tenants.id))
    .where(eq(userTenantRoles.userId, userId));

  const userWithRoles: UserWithRoles = {
    ...user[0]!,
    globalRole: (user[0]!.globalRole ?? "user") as GlobalRole,
    tenantRoles: tenantRoles.map((tr) => ({
      tenantId: tr.tenantId,
      tenantName: tr.tenantName,
      role: tr.role as TenantRole,
    })),
  };

  return userWithRoles;
}

// Create a new user (for manual user creation)
export async function createUser(input: z.infer<typeof createUserSchema>) {
  const performedBy = await hasGlobalPermission("super_admin");
  const validatedInput = createUserSchema.parse(input);

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, validatedInput.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("User with this email already exists");
  }

  // Create user
  const newUser = await db
    .insert(users)
    .values({
      email: validatedInput.email,
      name: validatedInput.name,
      emailVerified: new Date(),
    })
    .returning();

  const userId = newUser[0]!.id;

  // Assign global role
  await db.insert(globalUserRoles).values({
    userId,
    role: validatedInput.globalRole,
  });

  // Log the action
  await logUserAction(performedBy, userId, "created", {
    email: validatedInput.email,
    globalRole: validatedInput.globalRole,
  });

  revalidatePath("/admin/users");
  return newUser[0];
}

// Update user information and global role
export async function updateUser(input: z.infer<typeof updateUserSchema>) {
  const performedBy = await hasGlobalPermission("super_admin");
  const validatedInput = updateUserSchema.parse(input);

  // Update user basic info
  if (validatedInput.name) {
    await db
      .update(users)
      .set({
        name: validatedInput.name,
      })
      .where(eq(users.id, validatedInput.userId));
  }

  // Update global role if provided
  if (validatedInput.globalRole) {
    await db
      .update(globalUserRoles)
      .set({
        role: validatedInput.globalRole,
        updatedAt: new Date(),
      })
      .where(eq(globalUserRoles.userId, validatedInput.userId));
  }

  // Log the action
  await logUserAction(performedBy, validatedInput.userId, "updated", {
    changes: validatedInput,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Delete user (soft delete - remove roles but keep user record for audit)
export async function deleteUser(userId: string) {
  const performedBy = await hasGlobalPermission("super_admin");

  // Remove global role
  await db.delete(globalUserRoles).where(eq(globalUserRoles.userId, userId));

  // Remove all tenant roles
  await db.delete(userTenantRoles).where(eq(userTenantRoles.userId, userId));

  // Log the action
  await logUserAction(performedBy, userId, "deleted", {});

  revalidatePath("/admin/users");
  return { success: true };
}

// Assign tenant role to user
export async function assignTenantRole(
  input: z.infer<typeof assignTenantRoleSchema>
) {
  const performedBy = await hasGlobalPermission("tenant_admin");
  const validatedInput = assignTenantRoleSchema.parse(input);

  // Check if user already has a role in this tenant
  const existingRole = await db
    .select()
    .from(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, validatedInput.userId),
        eq(userTenantRoles.tenantId, validatedInput.tenantId)
      )
    )
    .limit(1);

  if (existingRole.length > 0) {
    // Update existing role
    await db
      .update(userTenantRoles)
      .set({
        role: validatedInput.role,
      })
      .where(eq(userTenantRoles.id, existingRole[0]!.id));
  } else {
    // Create new role assignment
    await db.insert(userTenantRoles).values({
      userId: validatedInput.userId,
      tenantId: validatedInput.tenantId,
      role: validatedInput.role,
    });
  }

  // Log the action
  await logUserAction(performedBy, validatedInput.userId, "tenant_role_assigned", {
    tenantId: validatedInput.tenantId,
    role: validatedInput.role,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Remove tenant role from user
export async function removeTenantRole(userId: string, tenantId: string) {
  const performedBy = await hasGlobalPermission("tenant_admin");

  await db
    .delete(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, userId),
        eq(userTenantRoles.tenantId, tenantId)
      )
    );

  // Log the action
  await logUserAction(performedBy, userId, "tenant_role_removed", {
    tenantId,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Get audit log for a user
export async function getUserAuditLog(userId: string, limit: number = 50) {
  await hasGlobalPermission("tenant_admin");

  const auditLogs = await db
    .select({
      id: userAuditLog.id,
      action: userAuditLog.action,
      details: userAuditLog.details,
      createdAt: userAuditLog.createdAt,
      performedByName: users.name,
      performedByEmail: users.email,
    })
    .from(userAuditLog)
    .innerJoin(users, eq(userAuditLog.performedBy, users.id))
    .where(eq(userAuditLog.targetUserId, userId))
    .orderBy(desc(userAuditLog.createdAt))
    .limit(limit);

  return auditLogs;
}

// Get current user's role information
export async function getCurrentUserRole() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const userRole = await db
    .select({
      globalRole: globalUserRoles.role,
    })
    .from(globalUserRoles)
    .where(eq(globalUserRoles.userId, session.user.id))
    .limit(1);

  return {
    userId: session.user.id,
    globalRole: userRole[0]?.globalRole ?? "user",
  };
}

// Initialize global role for existing users (migration helper)
export async function initializeGlobalRolesForExistingUsers() {
  const performedBy = await hasGlobalPermission("super_admin");

  // Get users without global roles
  const usersWithoutRoles = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(globalUserRoles, eq(users.id, globalUserRoles.userId))
    .where(isNull(globalUserRoles.id));

  // Assign default "user" role to users without global roles
  for (const user of usersWithoutRoles) {
    await db.insert(globalUserRoles).values({
      userId: user.id,
      role: "user",
    });
  }

  return { initialized: usersWithoutRoles.length };
} 