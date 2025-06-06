import { getChatSession } from "@/server/actions/chat";
import { requireAuth } from "@/server/actions/auth";
import { ChatInterface } from "@/components/chat/chat-interface";
import { redirect } from "next/navigation";

interface ChatSessionPageProps {
  params: Promise<{ tenantId: string; sessionId: string }>;
}

export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const { tenantId, sessionId } = await params;
  
  try {
    await requireAuth(tenantId, "viewer");
    
    // Get session details and messages
    const session = await getChatSession(sessionId);

    // Transform database messages to match component interface
    const messages = session.messages.map(msg => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.createdAt || new Date(),
    }));

    return (
      <div className="h-[calc(100vh-4rem)]">
        <ChatInterface 
          sessionId={sessionId}
          tenantId={tenantId}
          initialMessages={messages}
          initialTitle={session.title || "New Chat"}
        />
      </div>
    );
  } catch (error) {
    console.error("Chat session error:", error);
    redirect(`/t/${tenantId}/chat`);
  }
} 