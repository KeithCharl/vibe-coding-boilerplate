import { getDocuments } from "@/server/actions/content";
import { requireAuth } from "@/server/actions/auth";
import { KnowledgeBaseAgent } from "@/components/agents/knowledge-base-agent";

interface KnowledgeBaseAgentPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function KnowledgeBaseAgentPage({ params }: KnowledgeBaseAgentPageProps) {
  const { tenantId } = await params;
  
  const user = await requireAuth(tenantId, "viewer");
  const documents = await getDocuments(tenantId);

  // Transform documents to match agent interface
  const agentDocuments = documents.map(doc => ({
    ...doc,
    summary: doc.content?.substring(0, 200) + "..." || undefined,
    tags: [], // Will be populated by AI tagging
    confidence: Math.floor(85 + Math.random() * 15), // Simulated AI confidence
    aiGenerated: false
  }));

  // Determine user role (simplified - in real implementation, get from user session)
  const userRole = user.id ? 'admin' : 'user'; // Placeholder logic

  return (
    <KnowledgeBaseAgent 
      tenantId={tenantId} 
      initialDocuments={agentDocuments}
      userRole={userRole as 'admin' | 'user'}
      agentConfig={{
        isEnabled: true,
        autoTagging: true,
        contentAnalysis: true,
        smartSuggestions: true,
        webScraping: true
      }}
    />
  );
} 