export const TEMPLATE_CATEGORIES = [
  { value: "document", label: "Document Template" },
  { value: "prompt", label: "Prompt Template" },
  { value: "workflow", label: "Workflow Template" },
  { value: "integration", label: "Integration Template" },
  { value: "other", label: "Other Template" },
];

export const TEMPLATE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export const TEMPLATE_ACCESS_LEVELS = [
  { value: "public", label: "Public Access" },
  { value: "tenant_only", label: "Tenant Only" },
  { value: "creator_only", label: "Creator Only" },
  { value: "admin_only", label: "Admin Only" },
];

// Type definitions for better type safety
export type TemplateCategory = "document" | "prompt" | "workflow" | "integration" | "other";
export type TemplateStatus = "draft" | "pending" | "approved" | "rejected" | "archived";
export type TemplateAccess = "public" | "tenant_only" | "creator_only" | "admin_only"; 