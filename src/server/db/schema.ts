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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userTenantRoles: many(userTenantRoles),
  chatSessions: many(chatSessions),
  documents: many(documents),
  feedback: many(feedback),
  webAnalysis: many(webAnalysis),
  prompts: many(prompts),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenantRoles: many(userTenantRoles),
  documents: many(documents),
  chatSessions: many(chatSessions),
  analytics: many(analytics),
  personas: many(personas),
  webAnalysis: many(webAnalysis),
  prompts: many(prompts),
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

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
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
