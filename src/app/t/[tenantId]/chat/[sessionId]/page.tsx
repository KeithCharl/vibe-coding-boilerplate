import { getChatMessages } from "@/server/actions/chat";
import { requireAuth } from "@/server/actions/auth";
import { ChatInterface } from "@/components/chat/chat-interface";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { chatSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface ChatSessionPageProps {
  params: Promise<{ tenantId: string; sessionId: string }>;
}

export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const { tenantId, sessionId } = await params;
  
  try {
    const user = await requireAuth(tenantId, "viewer");
    
    // Get session details including title
    const [session] = await db
      .select({
        title: chatSessions.title,
        userId: chatSessions.userId,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session || session.userId !== user.id) {
      redirect(`/t/${tenantId}/chat`);
    }

    const dbMessages = await getChatMessages(sessionId);

    // Transform database messages to match component interface
    const messages = dbMessages.map(msg => ({
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