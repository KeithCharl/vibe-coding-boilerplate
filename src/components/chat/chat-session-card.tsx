"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2, Check, X, Trash2 } from "lucide-react";
import { updateChatSessionTitle, deleteChatSession } from "@/server/actions/chat";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatSession {
  id: string;
  title: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ChatSessionCardProps {
  session: ChatSession;
  tenantId: string;
}

export function ChatSessionCard({ session, tenantId }: ChatSessionCardProps) {
  const [title, setTitle] = useState(session.title || "Untitled Chat");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(session.title || "Untitled Chat");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleEditTitle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitleValue(title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (editTitleValue.trim() === title) {
      setIsEditingTitle(false);
      return;
    }

    if (!editTitleValue.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      setIsUpdatingTitle(true);
      await updateChatSessionTitle(session.id, editTitleValue.trim());
      setTitle(editTitleValue.trim());
      setIsEditingTitle(false);
      toast.success("Title updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Failed to update title:", error);
      toast.error("Failed to update title");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleCancelEditTitle = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditTitleValue(title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditTitle();
    }
  };

  const handleDeleteSession = async () => {
    console.log("🗑️ Attempting to delete session:", session.id);
    try {
      setIsDeleting(true);
      const result = await deleteChatSession(session.id);
      console.log("✅ Delete result:", result);
      toast.success("Chat session deleted");
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("❌ Failed to delete session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow`}>
      <CardHeader>
        {isEditingTitle ? (
          <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
            <Input
              ref={titleInputRef}
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-semibold"
              disabled={isUpdatingTitle}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              onClick={handleSaveTitle}
              disabled={isUpdatingTitle}
              variant="ghost"
              className="shrink-0 btn-bancon-primary"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEditTitle}
              disabled={isUpdatingTitle}
              className="shrink-0 btn-bancon-outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate pr-2">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEditTitle}
                className="h-8 w-8 p-0"
                title="Edit title"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete session"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{title}"? This action cannot be undone and will permanently delete all messages in this conversation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSession}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
        <CardDescription>
          {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : 'No date'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="ghost" className="w-full btn-bancon-primary">
          <Link href={`/t/${tenantId}/chat/${session.id}`}>
            Continue Chat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
} 