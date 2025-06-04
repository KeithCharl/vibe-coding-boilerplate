import { getDocuments } from "@/server/actions/content";
import { requireAuth } from "@/server/actions/auth";
import { KnowledgeBaseClient } from "@/components/knowledge-base-client";

interface KnowledgeBasePageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function KnowledgeBasePage({ params }: KnowledgeBasePageProps) {
  const { tenantId } = await params;
  
  await requireAuth(tenantId, "viewer");
  const documents = await getDocuments(tenantId);

  return <KnowledgeBaseClient tenantId={tenantId} initialDocuments={documents} />;
} 