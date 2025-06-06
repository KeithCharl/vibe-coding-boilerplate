import { getChatSessions, createChatSession } from "@/server/actions/chat";
import { requireAuth } from "@/server/actions/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatSessionCard } from "@/components/chat/chat-session-card";
import { DeleteOldSessionsDialog } from "@/components/chat/delete-old-sessions-dialog";

interface ChatPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { tenantId } = await params;
  
  await requireAuth(tenantId, "viewer");
  const sessions = await getChatSessions(tenantId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Sessions</h1>
          <p className="text-muted-foreground">
            Start conversations with your AI knowledge base
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <DeleteOldSessionsDialog tenantId={tenantId} />
          )}
          <form action={async () => {
            "use server";
            const session = await createChatSession(tenantId);
            redirect(`/t/${tenantId}/chat/${session.id}`);
          }}>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </form>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No chat sessions yet</h3>
          <p className="text-muted-foreground mb-6">
            Start your first conversation with the AI assistant
          </p>
          <form action={async () => {
            "use server";
            const session = await createChatSession(tenantId);
            redirect(`/t/${tenantId}/chat/${session.id}`);
          }}>
            <Button type="submit" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Start Your First Chat
            </Button>
          </form>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <ChatSessionCard 
              key={session.id} 
              session={session}
              tenantId={tenantId}
            />
          ))}
        </div>
      )}
    </div>
  );
} 