"use server";

import { db } from "@/server/db";
import {
  templates,
  templateSubmissions,
  templateRatings,
  templateDownloads,
  users,
  globalUserRoles,
} from "@/server/db/schema";
import { eq, desc, and, sql, asc, or, ilike, count } from "drizzle-orm";
import { getServerAuthSession } from "@/server/auth";
import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Types
export type Template = typeof templates.$inferSelect;
export type TemplateSubmission = typeof templateSubmissions.$inferSelect;
export type TemplateRating = typeof templateRatings.$inferSelect;

export type TemplateWithDetails = Template & {
  createdByUser: { id: string; name: string | null; email: string };
  approvedByUser?: { id: string; name: string | null; email: string } | null;
  userRating?: number | null;
};

export type TemplateSubmissionWithDetails = TemplateSubmission & {
  submittedByUser: { id: string; name: string | null; email: string };
  reviewedByUser?: { id: string; name: string | null; email: string } | null;
};

// Helper function to check if user is admin
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userRole = await db
      .select()
      .from(globalUserRoles)
      .where(eq(globalUserRoles.userId, userId))
      .limit(1);

    return userRole.length > 0 && 
      (userRole[0]?.role === "super_admin" || userRole[0]?.role === "tenant_admin");
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

// Template CRUD Operations
export async function getTemplates(params?: {
  category?: string;
  search?: string;
  sortBy?: "name" | "rating" | "downloads" | "created";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  try {
    // Build where conditions
    const whereConditions = [
      eq(templates.isActive, true),
      eq(templates.isPublic, true)
    ];

    // Add category filter
    if (params?.category) {
      whereConditions.push(eq(templates.category, params.category as any));
    }

    // Add search filter
    if (params?.search) {
      whereConditions.push(
        or(
          ilike(templates.name, `%${params.search}%`),
          ilike(templates.description, `%${params.search}%`)
        )!
      );
    }

    // Build order by
    let orderByClause;
    const sortOrder = params?.sortOrder === "asc" ? asc : desc;
    switch (params?.sortBy) {
      case "name":
        orderByClause = sortOrder(templates.name);
        break;
      case "rating":
        orderByClause = sortOrder(templates.rating);
        break;
      case "downloads":
        orderByClause = sortOrder(templates.downloadCount);
        break;
      default:
        orderByClause = desc(templates.createdAt);
    }

    // Build and execute the query
    const queryBuilder = db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        category: templates.category,
        tags: templates.tags,
        content: templates.content,
        fileUrl: templates.fileUrl,
        fileType: templates.fileType,
        fileSize: templates.fileSize,
        version: templates.version,
        downloadCount: templates.downloadCount,
        rating: templates.rating,
        ratingCount: templates.ratingCount,
        isPublic: templates.isPublic,
        isActive: templates.isActive,
        createdBy: templates.createdBy,
        approvedBy: templates.approvedBy,
        approvedAt: templates.approvedAt,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        createdByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(templates)
      .leftJoin(users, eq(templates.createdBy, users.id))
      .where(and(...whereConditions))
      .orderBy(orderByClause);

    // Apply pagination
    if (params?.limit) {
      queryBuilder.limit(params.limit);
    }
    if (params?.offset) {
      queryBuilder.offset(params.offset);
    }

    const results = await queryBuilder;
    return { success: true, data: results as TemplateWithDetails[] };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { success: false, error: "Failed to fetch templates" };
  }
}

export async function getTemplateById(id: string) {
  try {
    const result = await db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        category: templates.category,
        tags: templates.tags,
        content: templates.content,
        fileUrl: templates.fileUrl,
        fileType: templates.fileType,
        fileSize: templates.fileSize,
        version: templates.version,
        downloadCount: templates.downloadCount,
        rating: templates.rating,
        ratingCount: templates.ratingCount,
        isPublic: templates.isPublic,
        isActive: templates.isActive,
        createdBy: templates.createdBy,
        approvedBy: templates.approvedBy,
        approvedAt: templates.approvedAt,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        createdByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(templates)
      .leftJoin(users, eq(templates.createdBy, users.id))
      .where(
        and(
          eq(templates.id, id),
          eq(templates.isActive, true)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: result[0] as TemplateWithDetails };
  } catch (error) {
    console.error("Error fetching template:", error);
    return { success: false, error: "Failed to fetch template" };
  }
}

// Template Submission Operations
export async function submitTemplate(data: {
  name: string;
  description: string;
  category: string;
  tags?: string[];
  content: any;
  file?: File;
  submissionNotes?: string;
  version?: string;
}) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileSize: number | undefined;

    // Handle file upload if provided
    if (data.file) {
      const blob = await put(
        `templates/${crypto.randomUUID()}-${data.file.name}`,
        data.file,
        { access: "public" }
      );
      fileUrl = blob.url;
      fileType = data.file.type;
      fileSize = data.file.size;
    }

    const submission = await db
      .insert(templateSubmissions)
      .values({
        name: data.name,
        description: data.description,
        category: data.category as any,
        tags: data.tags || [],
        content: data.content,
        fileUrl,
        fileType,
        fileSize,
        version: data.version || "1.0.0",
        submissionNotes: data.submissionNotes,
        submittedBy: session.user.id,
      })
      .returning();

    revalidatePath("/admin/template-submissions");
    return { success: true, data: submission[0] };
  } catch (error) {
    console.error("Error submitting template:", error);
    return { success: false, error: "Failed to submit template" };
  }
}

export async function getTemplateSubmissions(status?: string) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const whereConditions = [];
    if (status) {
      whereConditions.push(eq(templateSubmissions.status, status as any));
    }

    const results = await db
      .select({
        id: templateSubmissions.id,
        name: templateSubmissions.name,
        description: templateSubmissions.description,
        category: templateSubmissions.category,
        tags: templateSubmissions.tags,
        content: templateSubmissions.content,
        fileUrl: templateSubmissions.fileUrl,
        fileType: templateSubmissions.fileType,
        fileSize: templateSubmissions.fileSize,
        version: templateSubmissions.version,
        status: templateSubmissions.status,
        submissionNotes: templateSubmissions.submissionNotes,
        reviewNotes: templateSubmissions.reviewNotes,
        submittedBy: templateSubmissions.submittedBy,
        reviewedBy: templateSubmissions.reviewedBy,
        reviewedAt: templateSubmissions.reviewedAt,
        submittedAt: templateSubmissions.submittedAt,
        updatedAt: templateSubmissions.updatedAt,
        submittedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(templateSubmissions)
      .leftJoin(users, eq(templateSubmissions.submittedBy, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(templateSubmissions.submittedAt));

    return { success: true, data: results as TemplateSubmissionWithDetails[] };
  } catch (error) {
    console.error("Error fetching template submissions:", error);
    return { success: false, error: "Failed to fetch template submissions" };
  }
}

export async function reviewTemplateSubmission(
  submissionId: string,
  action: "approve" | "reject",
  reviewNotes?: string
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Get the submission
    const submission = await db
      .select()
      .from(templateSubmissions)
      .where(eq(templateSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      return { success: false, error: "Submission not found" };
    }

    const sub = submission[0]!;

    // Update submission status
    await db
      .update(templateSubmissions)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        reviewNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(templateSubmissions.id, submissionId));

    // If approved, create the template
    if (action === "approve") {
      await db.insert(templates).values({
        name: sub.name,
        description: sub.description,
        category: sub.category,
        tags: sub.tags,
        content: sub.content,
        fileUrl: sub.fileUrl,
        fileType: sub.fileType,
        fileSize: sub.fileSize,
        version: sub.version,
        createdBy: sub.submittedBy,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      });
    }

    revalidatePath("/admin/template-submissions");
    revalidatePath("/t/[tenantId]/templates", "page");
    return { success: true };
  } catch (error) {
    console.error("Error reviewing template submission:", error);
    return { success: false, error: "Failed to review template submission" };
  }
}

// Template Rating Operations
export async function rateTemplate(templateId: string, rating: number, comment?: string) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5" };
    }

    // Check if user already rated this template
    const existingRating = await db
      .select()
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, templateId),
          eq(templateRatings.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingRating.length > 0) {
      // Update existing rating
      await db
        .update(templateRatings)
        .set({
          rating,
          comment,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(templateRatings.templateId, templateId),
            eq(templateRatings.userId, session.user.id)
          )
        );
    } else {
      // Create new rating
      await db.insert(templateRatings).values({
        templateId,
        userId: session.user.id,
        rating,
        comment,
      });
    }

    // Update template's average rating
    const ratings = await db
      .select({
        rating: templateRatings.rating,
      })
      .from(templateRatings)
      .where(eq(templateRatings.templateId, templateId));

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const ratingCount = ratings.length;

    await db
      .update(templates)
      .set({
        rating: avgRating,
        ratingCount,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId));

    revalidatePath("/t/[tenantId]/templates", "page");
    return { success: true };
  } catch (error) {
    console.error("Error rating template:", error);
    return { success: false, error: "Failed to rate template" };
  }
}

// Template Download Operations
export async function downloadTemplate(templateId: string) {
  try {
    const session = await getServerAuthSession();
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Get template
    const template = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.isActive, true),
          eq(templates.isPublic, true)
        )
      )
      .limit(1);

    if (template.length === 0) {
      return { success: false, error: "Template not found" };
    }

    // Track download
    await db.insert(templateDownloads).values({
      templateId,
      userId: session?.user?.id || null,
      ipAddress,
      userAgent,
    });

    // Update download count
    await db
      .update(templates)
      .set({
        downloadCount: sql`${templates.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId));

    revalidatePath("/t/[tenantId]/templates", "page");
    return { success: true, data: template[0] };
  } catch (error) {
    console.error("Error downloading template:", error);
    return { success: false, error: "Failed to download template" };
  }
}

// Analytics Functions
export async function getTemplateStats() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required" };
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Get template counts by status
    const templateCounts = await db
      .select({
        status: templateSubmissions.status,
        count: count(),
      })
      .from(templateSubmissions)
      .groupBy(templateSubmissions.status);

    // Get total approved templates
    const totalTemplates = await db
      .select({ count: count() })
      .from(templates)
      .where(eq(templates.isActive, true));

    // Get total downloads
    const totalDownloads = await db
      .select({ count: count() })
      .from(templateDownloads);

    // Get average rating
    const avgRatingResult = await db
      .select({
        avgRating: sql<number>`AVG(${templates.rating})`,
      })
      .from(templates)
      .where(and(eq(templates.isActive, true), sql`${templates.ratingCount} > 0`));

    return {
      success: true,
      data: {
        templateCounts,
        totalTemplates: totalTemplates[0]?.count || 0,
        totalDownloads: totalDownloads[0]?.count || 0,
        avgRating: avgRatingResult[0]?.avgRating || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching template stats:", error);
    return { success: false, error: "Failed to fetch template stats" };
  }
}

// Template Categories
export const TEMPLATE_CATEGORIES = [
  { value: "document", label: "Document Template" },
  { value: "prompt", label: "AI Prompt Template" },
  { value: "workflow", label: "Workflow Template" },
  { value: "integration", label: "Integration Template" },
  { value: "other", label: "Other" },
] as const;
