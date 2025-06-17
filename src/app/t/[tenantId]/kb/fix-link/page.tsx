import { use } from "react";
import { linkKnowledgeBasesSimple } from "@/server/actions/simple-link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function FixLinkPage({ params }: PageProps) {
  const { tenantId } = use(params);

  try {
    // Fix the existing link using simple approach
    const result = await linkKnowledgeBasesSimple(
      tenantId, // From: current KB 
      "49cf0bc2-fc36-4107-b879-5bac34c5dbf3" // To: Project Delivery (PMC) KB
    );
    
    console.log("✅ Link fixed:", result);
  } catch (error) {
    console.error("❌ Error fixing link:", error);
  }

  // Redirect back to chat to test
  redirect(`/t/${tenantId}/chat/6a3314fa-5486-429d-a8b9-3daea3b2abef`);
} 