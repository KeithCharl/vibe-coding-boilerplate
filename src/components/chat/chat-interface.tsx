"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Bot, User, ThumbsUp, ThumbsDown, Edit2, Check, X } from "lucide-react";
import { sendMessage, updateChatSessionTitle } from "@/server/actions/chat";
import { submitFeedback } from "@/server/actions/feedback";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PersonaSelector } from "./persona-selector";
import { Markdown } from "@/components/ui/markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: any;
  createdAt: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
  tenantId: string;
  initialMessages: Message[];
  initialTitle: string;
}

export function ChatInterface({ sessionId, tenantId, initialMessages, initialTitle }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // Title editing state
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(initialTitle);
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    const isFirstMessage = messages.length === 0;
    const currentInput = input;

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await sendMessage(sessionId, currentInput);
      
      const assistantMessage: Message = {
        id: result.id,
        role: "assistant",
        content: result.content,
        metadata: result.metadata,
        createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // If this was the first message and title was auto-generated, update the display
      if (isFirstMessage && title === "New Chat") {
        // Refresh the page to get the updated title
        // We could also make an API call to get just the title, but a full refresh is simpler
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTitle = () => {
    setEditTitleValue(title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
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
      await updateChatSessionTitle(sessionId, editTitleValue.trim());
      setTitle(editTitleValue.trim());
      setIsEditingTitle(false);
      toast.success("Title updated successfully");
    } catch (error) {
      console.error("Failed to update title:", error);
      toast.error("Failed to update title");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleCancelEditTitle = () => {
    setEditTitleValue(title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEditTitle();
    }
  };

  const handleFeedback = async (messageId: string, rating: number) => {
    setSelectedMessageId(messageId);
    setFeedbackRating(rating);
    setShowFeedbackDialog(true);
  };

  const submitFeedbackWithComment = async () => {
    if (!selectedMessageId) return;

    try {
      setIsSubmittingFeedback(true);
      await submitFeedback({ 
        messageId: selectedMessageId, 
        rating: feedbackRating,
        comment: feedbackComment.trim() || undefined
      });
      
      const feedbackType = feedbackRating > 0 ? "positive" : "negative";
      toast.success(`${feedbackType} feedback submitted${feedbackComment.trim() ? " with comment" : ""}`);
      
      // Reset state
      setShowFeedbackDialog(false);
      setFeedbackComment("");
      setSelectedMessageId("");
      setFeedbackRating(0);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const cancelFeedback = () => {
    setShowFeedbackDialog(false);
    setFeedbackComment("");
    setSelectedMessageId("");
    setFeedbackRating(0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          {/* Editable Title */}
          <div className="flex items-center gap-2 flex-1 mr-4">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  ref={titleInputRef}
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className="text-xl font-semibold"
                  disabled={isUpdatingTitle}
                />
                <Button
                  size="sm"
                  onClick={handleSaveTitle}
                  disabled={isUpdatingTitle}
                  className="shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEditTitle}
                  disabled={isUpdatingTitle}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h1 className="text-xl font-semibold truncate">{title}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditTitle}
                  className="shrink-0 h-8 w-8 p-0"
                  title="Edit title"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <PersonaSelector tenantId={tenantId} sessionId={sessionId} />
            <Button 
              variant="outline" 
              onClick={() => router.push(`/t/${tenantId}/chat`)}
            >
              Back to Sessions
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <Card className={`max-w-[80%] ${
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              }`}>
                <CardContent className="p-3">
                  {message.role === "assistant" ? (
                    <Markdown className="text-sm">
                      {message.content}
                    </Markdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                  
                  {message.role === "assistant" && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFeedback(message.id, 1)}
                        className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700"
                        title="Thumbs up"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFeedback(message.id, -1)}
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-700"
                        title="Thumbs down"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {message.role === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {feedbackRating > 0 ? (
                <ThumbsUp className="h-5 w-5 text-green-600" />
              ) : (
                <ThumbsDown className="h-5 w-5 text-red-600" />
              )}
              Provide Feedback
            </DialogTitle>
            <DialogDescription>
              {feedbackRating > 0 
                ? "What did you like about this response?" 
                : "What could be improved about this response?"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback-comment">
                Comment (optional)
              </Label>
              <Textarea
                id="feedback-comment"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder={feedbackRating > 0 
                  ? "Tell us what worked well..." 
                  : "Tell us what could be better..."
                }
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={cancelFeedback}
              disabled={isSubmittingFeedback}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitFeedbackWithComment}
              disabled={isSubmittingFeedback}
              className={feedbackRating > 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 