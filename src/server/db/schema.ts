import { relations, sql, type SQL } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  primaryKey,
  real,
  vector, // Add vector import for pgvector support
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

export const users = pgTable("user", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar("image", { length: 255 }),
});

export const accounts = pgTable(
  "account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    index("account_user_id_idx").on(account.userId),
  ]
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (session) => [index("session_user_id_idx").on(session.userId)]
);

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Knowledge Base Tables

// Role enum for RBAC
export const roleEnum = pgEnum("role", ["viewer", "contributor", "admin"]);

// Global role enum for system-wide permissions
export const globalRoleEnum = pgEnum("global_role", ["super_admin", "tenant_admin", "user"]);

// Global user roles table for system-wide permissions
export const globalUserRoles = pgTable(
  "global_user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(), // One global role per user
    role: globalRoleEnum("role").notNull().default("user"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("global_user_roles_user_id_idx").on(table.userId),
  ]
);

// User management audit log
export const userAuditLog = pgTable(
  "user_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performedBy: varchar("performed_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    targetUserId: varchar("target_user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(), // 'created', 'updated', 'deleted', 'role_changed', etc.
    details: jsonb("details"), // Store additional context about the action
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("user_audit_log_performed_by_idx").on(table.performedBy),
    index("user_audit_log_target_user_idx").on(table.targetUserId),
    index("user_audit_log_action_idx").on(table.action),
    index("user_audit_log_created_at_idx").on(table.createdAt),
  ]
);

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  systemPrompt: text("system_prompt").default("You are a helpful AI assistant with access to the knowledge base."),
  tokenCap: integer("token_cap").default(2000000),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles within tenants
export const userTenantRoles = pgTable(
  "user_tenant_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("user_tenant_roles_user_id_idx").on(table.userId),
    index("user_tenant_roles_tenant_id_idx").on(table.tenantId),
  ]
);

// Documents table with embeddings
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    fileUrl: text("file_url"),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"),
    chunkIndex: integer("chunk_index").default(0),
    embedding: vector("embedding", { dimensions: 1536 }), // OpenAI embeddings are 1536 dimensions
    version: integer("version").default(1),
    isActive: boolean("is_active").default(true),
    uploadedBy: varchar("uploaded_by", { length: 255 })
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("documents_tenant_id_idx").on(table.tenantId),
    index("documents_uploaded_by_idx").on(table.uploadedBy),
    index("documents_is_active_idx").on(table.isActive),
    // Add vector similarity index for fast similarity search
    index("documents_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ]
);

// Personas table for AI personalities
export const personas = pgTable(
  "personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("personas_tenant_id_idx").on(table.tenantId),
    index("personas_created_by_idx").on(table.createdBy),
    index("personas_is_active_idx").on(table.isActive),
  ]
);

// Chat sessions
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    isBookmarked: boolean("is_bookmarked").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("chat_sessions_tenant_id_idx").on(table.tenantId),
    index("chat_sessions_user_id_idx").on(table.userId),
    index("chat_sessions_is_bookmarked_idx").on(table.isBookmarked),
  ]
);

// Junction table for chat sessions and personas (many-to-many)
export const chatSessionPersonas = pgTable(
  "chat_session_personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    personaId: uuid("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("chat_session_personas_session_id_idx").on(table.sessionId),
    index("chat_session_personas_persona_id_idx").on(table.personaId),
  ]
);

// Chat messages
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
    content: text("content").notNull(),
    metadata: jsonb("metadata"), // Store context docs, tokens used, etc.
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("chat_messages_session_id_idx").on(table.sessionId),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ]
);

// Feedback for improving responses
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5 or thumbs up/down
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("feedback_message_id_idx").on(table.messageId),
    index("feedback_user_id_idx").on(table.userId),
  ]
);

// Analytics table
export const analytics = pgTable(
  "analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 50 }).notNull(), // 'query', 'upload', 'feedback'
    eventData: jsonb("event_data"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("analytics_tenant_id_idx").on(table.tenantId),
    index("analytics_event_type_idx").on(table.eventType),
    index("analytics_created_at_idx").on(table.createdAt),
  ]
);

// Web analysis results table
export const webAnalysis = pgTable(
  "web_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    summary: text("summary"),
    metadata: jsonb("metadata"), // Store additional data like domain, links, images, etc.
    embedding: vector("embedding", { dimensions: 1536 }), // pgvector instead of text
    status: varchar("status", { length: 50 }).notNull().default("success"), // 'success', 'failed', 'processing'
    errorMessage: text("error_message"),
    analyzedBy: varchar("analyzed_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("web_analysis_tenant_id_idx").on(table.tenantId),
    index("web_analysis_url_idx").on(table.url),
    index("web_analysis_analyzed_by_idx").on(table.analyzedBy),
    index("web_analysis_status_idx").on(table.status),
    index("web_analysis_created_at_idx").on(table.createdAt),
    // Add vector similarity index
    index("web_analysis_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ]
);

// Prompts table for prompt management
export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    category: varchar("category", { length: 100 }).default("general"),
    tags: text("tags").array(), // Array of tags for filtering
    isPublic: boolean("is_public").default(false), // Whether prompt is available to all users in tenant
    isActive: boolean("is_active").default(true),
    usageCount: integer("usage_count").default(0),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("prompts_tenant_id_idx").on(table.tenantId),
    index("prompts_created_by_idx").on(table.createdBy),
    index("prompts_category_idx").on(table.category),
    index("prompts_is_public_idx").on(table.isPublic),
    index("prompts_is_active_idx").on(table.isActive),
  ]
);

// Templates Tables

// Template status enum
export const templateStatusEnum = pgEnum("template_status", ["draft", "pending", "approved", "rejected", "archived"]);

// Template categories enum  
export const templateCategoryEnum = pgEnum("template_category", ["document", "prompt", "workflow", "integration", "other"]);

// Template access level enum for fine-grained permissions
export const templateAccessEnum = pgEnum("template_access", ["public", "tenant_only", "creator_only", "admin_only"]);

// Templates table for storing approved templates (base template info)
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: templateCategoryEnum("category").notNull().default("document"),
    tags: text("tags").array(), // Array of tags for filtering
    
    // Current version info (references latest approved version)
    currentVersionId: uuid("current_version_id"), // Will reference template_versions table
    currentVersion: varchar("current_version", { length: 20 }).notNull().default("1.0.0"),
    
    // Stats and metadata
    downloadCount: integer("download_count").default(0),
    rating: real("rating").default(0), // Average rating 1-5
    ratingCount: integer("rating_count").default(0), // Number of ratings
    
    // Access control
    accessLevel: templateAccessEnum("access_level").notNull().default("public"),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // If tenant-specific
    isActive: boolean("is_active").default(true),
    
    // Ownership and approval
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar("approved_by", { length: 255 })
      .references(() => users.id),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("templates_category_idx").on(table.category),
    index("templates_created_by_idx").on(table.createdBy),
    index("templates_approved_by_idx").on(table.approvedBy),
    index("templates_access_level_idx").on(table.accessLevel),
    index("templates_tenant_id_idx").on(table.tenantId),
    index("templates_is_active_idx").on(table.isActive),
    index("templates_rating_idx").on(table.rating),
    index("templates_created_at_idx").on(table.createdAt),
  ]
);

// Template versions table for storing all versions of templates
export const templateVersions = pgTable(
  "template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    
    // Version specific data
    version: varchar("version", { length: 20 }).notNull(),
    versionNotes: text("version_notes"), // What changed in this version
    content: jsonb("content").notNull(), // Template content (can be document, prompt, etc.)
    
    // File information
    fileUrl: text("file_url"), // Optional file download URL
    fileType: varchar("file_type", { length: 50 }), // e.g., "pdf", "docx", "json", "pptx", "xlsx"
    fileSize: integer("file_size"), // File size in bytes
    fileName: text("file_name"), // Original file name
    
    // Status and approval for this version
    status: templateStatusEnum("status").notNull().default("pending"),
    isCurrentVersion: boolean("is_current_version").default(false), // Only one current version per template
    
    // Version metadata
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar("approved_by", { length: 255 })
      .references(() => users.id),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("template_versions_template_id_idx").on(table.templateId),
    index("template_versions_version_idx").on(table.version),
    index("template_versions_status_idx").on(table.status),
    index("template_versions_is_current_idx").on(table.isCurrentVersion),
    index("template_versions_created_by_idx").on(table.createdBy),
    index("template_versions_created_at_idx").on(table.createdAt),
    // Unique constraint: one current version per template
    index("template_versions_template_current_idx").on(table.templateId, table.isCurrentVersion),
  ]
);

// Template submissions table for user-submitted templates awaiting approval
export const templateSubmissions = pgTable(
  "template_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id").references(() => templates.id), // Link to existing template for new versions
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: templateCategoryEnum("category").notNull().default("document"),
    tags: text("tags").array(),
    content: jsonb("content").notNull(),
    fileUrl: text("file_url"),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"),
    fileName: text("file_name"),
    version: varchar("version", { length: 20 }).notNull().default("1.0.0"),
    versionNotes: text("version_notes"), // What's new in this version
    accessLevel: templateAccessEnum("access_level").notNull().default("public"),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    status: templateStatusEnum("status").notNull().default("pending"),
    submissionNotes: text("submission_notes"), // User's notes when submitting
    reviewNotes: text("review_notes"), // Admin's notes when reviewing
    submittedBy: varchar("submitted_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    reviewedBy: varchar("reviewed_by", { length: 255 })
      .references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    submittedAt: timestamp("submitted_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("template_submissions_template_id_idx").on(table.templateId),
    index("template_submissions_status_idx").on(table.status),
    index("template_submissions_category_idx").on(table.category),
    index("template_submissions_submitted_by_idx").on(table.submittedBy),
    index("template_submissions_reviewed_by_idx").on(table.reviewedBy),
    index("template_submissions_submitted_at_idx").on(table.submittedAt),
  ]
);

// Template ratings table for user ratings
export const templateRatings = pgTable(
  "template_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5 stars
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("template_ratings_template_id_idx").on(table.templateId),
    index("template_ratings_user_id_idx").on(table.userId),
    // Unique constraint: one rating per user per template
    index("template_ratings_unique_idx").on(table.templateId, table.userId),
  ]
);

// Template downloads table for tracking usage
export const templateDownloads = pgTable(
  "template_downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .references(() => users.id, { onDelete: "set null" }), // Allow anonymous downloads
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "set null" }), // Track which tenant if applicable
    ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
    userAgent: text("user_agent"),
    downloadedAt: timestamp("downloaded_at").defaultNow(),
  },
  (table) => [
    index("template_downloads_template_id_idx").on(table.templateId),
    index("template_downloads_user_id_idx").on(table.userId),
    index("template_downloads_tenant_id_idx").on(table.tenantId),
    index("template_downloads_downloaded_at_idx").on(table.downloadedAt),
  ]
);

// Enhanced Web Scraping Tables

// Authentication credentials for web scraping
export const webScrapingCredentials = pgTable(
  "web_scraping_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // User-friendly name for the credential
    domain: text("domain").notNull(), // Domain or site these credentials are for
    authType: varchar("auth_type", { length: 50 }).notNull(), // 'basic', 'form', 'cookie', 'header', 'sso'
    credentials: jsonb("credentials").notNull(), // Encrypted credential data
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("web_scraping_credentials_tenant_id_idx").on(table.tenantId),
    index("web_scraping_credentials_domain_idx").on(table.domain),
    index("web_scraping_credentials_auth_type_idx").on(table.authType),
  ]
);

// Scheduled web scraping jobs
export const webScrapingJobs = pgTable(
  "web_scraping_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    scrapeChildren: boolean("scrape_children").default(true),
    maxDepth: integer("max_depth").default(2), // How deep to crawl
    includePatterns: jsonb("include_patterns"), // URL patterns to include
    excludePatterns: jsonb("exclude_patterns"), // URL patterns to exclude
    credentialId: uuid("credential_id")
      .references(() => webScrapingCredentials.id, { onDelete: "set null" }),
    schedule: text("schedule").notNull(), // Cron expression
    isActive: boolean("is_active").default(true),
    lastRun: timestamp("last_run"),
    nextRun: timestamp("next_run"),
    status: varchar("status", { length: 50 }).default("idle"), // 'idle', 'running', 'completed', 'failed'
    options: jsonb("options"), // Additional scraping options
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("web_scraping_jobs_tenant_id_idx").on(table.tenantId),
    index("web_scraping_jobs_base_url_idx").on(table.baseUrl),
    index("web_scraping_jobs_status_idx").on(table.status),
    index("web_scraping_jobs_next_run_idx").on(table.nextRun),
    index("web_scraping_jobs_is_active_idx").on(table.isActive),
  ]
);

// Enhanced web analysis with versioning and relationships
export const webAnalysisDocuments = pgTable(
  "web_analysis_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .references(() => webScrapingJobs.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    parentUrl: text("parent_url"), // URL of parent page if this is a child
    title: text("title"),
    content: text("content").notNull(),
    summary: text("summary"),
    metadata: jsonb("metadata"),
    embedding: vector("embedding", { dimensions: 1536 }),
    contentHash: text("content_hash").notNull(), // Hash of content for change detection
    version: integer("version").default(1),
    status: varchar("status", { length: 50 }).notNull().default("success"),
    errorMessage: text("error_message"),
    depth: integer("depth").default(0), // Crawl depth from base URL
    isActive: boolean("is_active").default(true),
    analyzedBy: varchar("analyzed_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("web_analysis_documents_tenant_id_idx").on(table.tenantId),
    index("web_analysis_documents_job_id_idx").on(table.jobId),
    index("web_analysis_documents_url_idx").on(table.url),
    index("web_analysis_documents_parent_url_idx").on(table.parentUrl),
    index("web_analysis_documents_content_hash_idx").on(table.contentHash),
    index("web_analysis_documents_version_idx").on(table.version),
    index("web_analysis_documents_is_active_idx").on(table.isActive),
    index("web_analysis_documents_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ]
);

// Change log for tracking content updates
export const webAnalysisChanges = pgTable(
  "web_analysis_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => webAnalysisDocuments.id, { onDelete: "cascade" }),
    jobRunId: uuid("job_run_id"), // References a specific job run
    changeType: varchar("change_type", { length: 50 }).notNull(), // 'created', 'updated', 'deleted', 'title_changed', 'content_changed'
    oldContent: text("old_content"),
    newContent: text("new_content"),
    oldContentHash: text("old_content_hash"),
    newContentHash: text("new_content_hash"),
    changePercentage: real("change_percentage"), // Percentage of content that changed
    changeSummary: text("change_summary"), // AI-generated summary of changes
    metadata: jsonb("metadata"), // Additional change metadata
    detectedAt: timestamp("detected_at").defaultNow(),
  },
  (table) => [
    index("web_analysis_changes_tenant_id_idx").on(table.tenantId),
    index("web_analysis_changes_document_id_idx").on(table.documentId),
    index("web_analysis_changes_job_run_id_idx").on(table.jobRunId),
    index("web_analysis_changes_change_type_idx").on(table.changeType),
    index("web_analysis_changes_detected_at_idx").on(table.detectedAt),
  ]
);

// Job execution history and logs
export const webScrapingJobRuns = pgTable(
  "web_scraping_job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => webScrapingJobs.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull().default("running"), // 'running', 'completed', 'failed', 'cancelled'
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    urlsProcessed: integer("urls_processed").default(0),
    urlsSuccessful: integer("urls_successful").default(0),
    urlsFailed: integer("urls_failed").default(0),
    documentsCreated: integer("documents_created").default(0),
    documentsUpdated: integer("documents_updated").default(0),
    changesDetected: integer("changes_detected").default(0),
    errorMessage: text("error_message"),
    logs: jsonb("logs"), // Detailed execution logs
    metadata: jsonb("metadata"), // Additional run metadata
  },
  (table) => [
    index("web_scraping_job_runs_tenant_id_idx").on(table.tenantId),
    index("web_scraping_job_runs_job_id_idx").on(table.jobId),
    index("web_scraping_job_runs_status_idx").on(table.status),
    index("web_scraping_job_runs_started_at_idx").on(table.startedAt),
  ]
);

// Cross-Knowledge Base Reference System Tables

// Knowledge Base Connection Templates (for reusable configurations)
export const kbConnectionTemplates = pgTable(
  "kb_connection_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    // Template configuration
    defaultWeight: real("default_weight").default(1.0),
    defaultAccessLevel: varchar("default_access_level", { length: 20 }).default("read"),
    includeTags: text("include_tags").array(),
    excludeTags: text("exclude_tags").array(),
    // Admin settings
    isSystemTemplate: boolean("is_system_template").default(false), // Created by super admin
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("kb_templates_name_idx").on(table.name),
    index("kb_templates_created_by_idx").on(table.createdBy),
  ]
);

// Enhanced Knowledge Base References with admin controls
export const knowledgeBaseReferences = pgTable(
  "knowledge_base_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceTenantId: uuid("source_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    targetTenantId: uuid("target_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    
    // Basic configuration
    name: text("name").notNull(),
    description: text("description"),
    
    // Access and filtering controls
    accessLevel: varchar("access_level", { length: 20 }).notNull().default("read"), // 'read', 'search_only'
    includeTags: text("include_tags").array(),
    excludeTags: text("exclude_tags").array(),
    includeDocumentTypes: text("include_document_types").array(), // ['pdf', 'txt', 'web']
    excludeDocumentTypes: text("exclude_document_types").array(),
    
    // Performance controls
    weight: real("weight").default(1.0),
    maxResults: integer("max_results").default(5), // Limit results from this KB
    minSimilarity: real("min_similarity").default(0.1),
    
    // Status and approval
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'active', 'suspended', 'rejected'
    isActive: boolean("is_active").default(false),
    
    // Admin controls
    autoApprove: boolean("auto_approve").default(false), // For trusted relationships
    requiresReview: boolean("requires_review").default(true),
    expiresAt: timestamp("expires_at"), // Optional expiration
    
    // Template reference
    templateId: uuid("template_id").references(() => kbConnectionTemplates.id),
    
    // Audit trail
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    approvedBy: varchar("approved_by", { length: 255 })
      .references(() => users.id),
    rejectedBy: varchar("rejected_by", { length: 255 })
      .references(() => users.id),
    rejectionReason: text("rejection_reason"),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    approvedAt: timestamp("approved_at"),
  },
  (table) => [
    index("kb_refs_source_tenant_idx").on(table.sourceTenantId),
    index("kb_refs_target_tenant_idx").on(table.targetTenantId),
    index("kb_refs_status_idx").on(table.status),
    index("kb_refs_template_idx").on(table.templateId),
    // Prevent duplicate active references
    index("kb_refs_unique_active").on(table.sourceTenantId, table.targetTenantId, table.status),
  ]
);

// Bulk operations for admin management
export const kbBulkOperations = pgTable(
  "kb_bulk_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationType: varchar("operation_type", { length: 50 }).notNull(), // 'bulk_approve', 'bulk_create', 'bulk_suspend'
    tenantIds: text("tenant_ids").array(), // Target tenants
    templateId: uuid("template_id").references(() => kbConnectionTemplates.id),
    configuration: jsonb("configuration"), // Operation-specific config
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
    processedCount: integer("processed_count").default(0),
    totalCount: integer("total_count").default(0),
    errorLog: jsonb("error_log"),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("kb_bulk_ops_status_idx").on(table.status),
    index("kb_bulk_ops_created_by_idx").on(table.createdBy),
    index("kb_bulk_ops_created_at_idx").on(table.createdAt),
  ]
);

// Enhanced analytics with admin insights
export const referenceUsageAnalytics = pgTable(
  "reference_usage_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => knowledgeBaseReferences.id, { onDelete: "cascade" }),
    querySessionId: uuid("query_session_id")
      .references(() => chatSessions.id, { onDelete: "set null" }),
    
    // Usage metrics
    documentsRetrieved: integer("documents_retrieved").default(0),
    relevanceScore: real("relevance_score"),
    usedInResponse: boolean("used_in_response").default(false),
    responseQuality: integer("response_quality"), // 1-5 rating if available
    
    // Performance metrics
    queryTimeMs: integer("query_time_ms"),
    cacheHit: boolean("cache_hit").default(false),
    
    // Context
    queryText: text("query_text"), // For analysis (anonymized if needed)
    userId: varchar("user_id", { length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("ref_usage_reference_id_idx").on(table.referenceId),
    index("ref_usage_created_at_idx").on(table.createdAt),
    index("ref_usage_response_quality_idx").on(table.responseQuality),
  ]
);

// Document tags for better filtering
export const documentTags = pgTable(
  "document_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("doc_tags_document_id_idx").on(table.documentId),
    index("doc_tags_tag_idx").on(table.tag),
    // Prevent duplicate tags per document
    index("doc_tags_unique").on(table.documentId, table.tag),
  ]
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  userTenantRoles: many(userTenantRoles),
  globalRole: one(globalUserRoles, {
    fields: [users.id],
    references: [globalUserRoles.userId],
  }),
  chatSessions: many(chatSessions),
  documents: many(documents),
  feedback: many(feedback),
  webAnalysis: many(webAnalysis),
  prompts: many(prompts),
  auditLogsPerformed: many(userAuditLog, { relationName: "performedAudits" }),
  auditLogsTarget: many(userAuditLog, { relationName: "targetAudits" }),
  createdTemplates: many(kbConnectionTemplates),
  createdReferences: many(knowledgeBaseReferences, { relationName: "createdReferences" }),
  approvedReferences: many(knowledgeBaseReferences, { relationName: "approvedReferences" }),
  rejectedReferences: many(knowledgeBaseReferences, { relationName: "rejectedReferences" }),
  bulkOperations: many(kbBulkOperations),
  usageAnalytics: many(referenceUsageAnalytics),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenantRoles: many(userTenantRoles),
  documents: many(documents),
  chatSessions: many(chatSessions),
  analytics: many(analytics),
  personas: many(personas),
  webAnalysis: many(webAnalysis),
  prompts: many(prompts),
  sourceReferences: many(knowledgeBaseReferences, { relationName: "sourceReferences" }),
  targetReferences: many(knowledgeBaseReferences, { relationName: "targetReferences" }),
}));

export const userTenantRolesRelations = relations(userTenantRoles, ({ one }) => ({
  user: one(users, {
    fields: [userTenantRoles.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenantRoles.tenantId],
    references: [tenants.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  tags: many(documentTags),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chatSessions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
  sessionPersonas: many(chatSessionPersonas),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  feedback: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  message: one(chatMessages, {
    fields: [feedback.messageId],
    references: [chatMessages.id],
  }),
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

export const personasRelations = relations(personas, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [personas.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [personas.createdBy],
    references: [users.id],
  }),
  sessionPersonas: many(chatSessionPersonas),
}));

export const chatSessionPersonasRelations = relations(chatSessionPersonas, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatSessionPersonas.sessionId],
    references: [chatSessions.id],
  }),
  persona: one(personas, {
    fields: [chatSessionPersonas.personaId],
    references: [personas.id],
  }),
}));

export const webAnalysisRelations = relations(webAnalysis, ({ one }) => ({
  tenant: one(tenants, {
    fields: [webAnalysis.tenantId],
    references: [tenants.id],
  }),
  analyzedByUser: one(users, {
    fields: [webAnalysis.analyzedBy],
    references: [users.id],
  }),
}));

export const promptsRelations = relations(prompts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [prompts.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [prompts.createdBy],
    references: [users.id],
  }),
}));

export const globalUserRolesRelations = relations(globalUserRoles, ({ one }) => ({
  user: one(users, {
    fields: [globalUserRoles.userId],
    references: [users.id],
  }),
}));

export const userAuditLogRelations = relations(userAuditLog, ({ one }) => ({
  performedByUser: one(users, {
    fields: [userAuditLog.performedBy],
    references: [users.id],
    relationName: "performedAudits",
  }),
  targetUser: one(users, {
    fields: [userAuditLog.targetUserId],
    references: [users.id],
    relationName: "targetAudits",
  }),
}));

// Cross-KB Reference Relations
export const kbConnectionTemplatesRelations = relations(kbConnectionTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [kbConnectionTemplates.createdBy],
    references: [users.id],
  }),
  references: many(knowledgeBaseReferences),
  bulkOperations: many(kbBulkOperations),
}));

export const knowledgeBaseReferencesRelations = relations(knowledgeBaseReferences, ({ one, many }) => ({
  sourceTenant: one(tenants, {
    fields: [knowledgeBaseReferences.sourceTenantId],
    references: [tenants.id],
    relationName: "sourceReferences",
  }),
  targetTenant: one(tenants, {
    fields: [knowledgeBaseReferences.targetTenantId],
    references: [tenants.id],
    relationName: "targetReferences",
  }),
  template: one(kbConnectionTemplates, {
    fields: [knowledgeBaseReferences.templateId],
    references: [kbConnectionTemplates.id],
  }),
  createdByUser: one(users, {
    fields: [knowledgeBaseReferences.createdBy],
    references: [users.id],
    relationName: "createdReferences",
  }),
  approvedByUser: one(users, {
    fields: [knowledgeBaseReferences.approvedBy],
    references: [users.id],
    relationName: "approvedReferences",
  }),
  rejectedByUser: one(users, {
    fields: [knowledgeBaseReferences.rejectedBy],
    references: [users.id],
    relationName: "rejectedReferences",
  }),
  usageAnalytics: many(referenceUsageAnalytics),
}));

export const kbBulkOperationsRelations = relations(kbBulkOperations, ({ one }) => ({
  template: one(kbConnectionTemplates, {
    fields: [kbBulkOperations.templateId],
    references: [kbConnectionTemplates.id],
  }),
  createdByUser: one(users, {
    fields: [kbBulkOperations.createdBy],
    references: [users.id],
  }),
}));

export const referenceUsageAnalyticsRelations = relations(referenceUsageAnalytics, ({ one }) => ({
  reference: one(knowledgeBaseReferences, {
    fields: [referenceUsageAnalytics.referenceId],
    references: [knowledgeBaseReferences.id],
  }),
  querySession: one(chatSessions, {
    fields: [referenceUsageAnalytics.querySessionId],
    references: [chatSessions.id],
  }),
  user: one(users, {
    fields: [referenceUsageAnalytics.userId],
    references: [users.id],
  }),
}));

export const documentTagsRelations = relations(documentTags, ({ one }) => ({
  document: one(documents, {
    fields: [documentTags.documentId],
    references: [documents.id],
  }),
}));

// Template Relations
export const templatesRelations = relations(templates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
    relationName: "createdTemplates",
  }),
  approvedByUser: one(users, {
    fields: [templates.approvedBy],
    references: [users.id],
    relationName: "approvedTemplates",
  }),
  tenant: one(tenants, {
    fields: [templates.tenantId],
    references: [tenants.id],
  }),
  currentVersionRef: one(templateVersions, {
    fields: [templates.currentVersionId],
    references: [templateVersions.id],
    relationName: "currentVersion",
  }),
  versions: many(templateVersions),
  ratings: many(templateRatings),
  downloads: many(templateDownloads),
  submissions: many(templateSubmissions),
}));

export const templateVersionsRelations = relations(templateVersions, ({ one }) => ({
  template: one(templates, {
    fields: [templateVersions.templateId],
    references: [templates.id],
  }),
  createdByUser: one(users, {
    fields: [templateVersions.createdBy],
    references: [users.id],
    relationName: "createdTemplateVersions",
  }),
  approvedByUser: one(users, {
    fields: [templateVersions.approvedBy],
    references: [users.id],
    relationName: "approvedTemplateVersions",
  }),
}));

export const templateSubmissionsRelations = relations(templateSubmissions, ({ one }) => ({
  template: one(templates, {
    fields: [templateSubmissions.templateId],
    references: [templates.id],
  }),
  tenant: one(tenants, {
    fields: [templateSubmissions.tenantId],
    references: [tenants.id],
  }),
  submittedByUser: one(users, {
    fields: [templateSubmissions.submittedBy],
    references: [users.id],
    relationName: "submittedTemplates",
  }),
  reviewedByUser: one(users, {
    fields: [templateSubmissions.reviewedBy],
    references: [users.id],
    relationName: "reviewedTemplates",
  }),
}));

export const templateRatingsRelations = relations(templateRatings, ({ one }) => ({
  template: one(templates, {
    fields: [templateRatings.templateId],
    references: [templates.id],
  }),
  user: one(users, {
    fields: [templateRatings.userId],
    references: [users.id],
  }),
}));

export const templateDownloadsRelations = relations(templateDownloads, ({ one }) => ({
  template: one(templates, {
    fields: [templateDownloads.templateId],
    references: [templates.id],
  }),
  user: one(users, {
    fields: [templateDownloads.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [templateDownloads.tenantId],
    references: [tenants.id],
  }),
}));
