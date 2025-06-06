"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteOldChatSessions } from "@/server/actions/chat";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteOldSessionsDialogProps {
  tenantId: string;
}

export function DeleteOldSessionsDialog({ tenantId }: DeleteOldSessionsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [timeframe, setTimeframe] = useState<string>("");
  const router = useRouter();

  const timeframes = [
    { value: "7", label: "Older than 7 days" },
    { value: "14", label: "Older than 14 days" },
    { value: "30", label: "Older than 30 days" },
    { value: "60", label: "Older than 60 days" },
    { value: "90", label: "Older than 90 days" },
  ];

  const handleDelete = async () => {
    if (!timeframe) {
      toast.error("Please select a timeframe");
      return;
    }

    try {
      setIsDeleting(true);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));

      const result = await deleteOldChatSessions(tenantId, cutoffDate);
      
      if (result.deletedCount === 0) {
        toast.success("No old conversations found to delete");
      } else {
        toast.success(`Successfully deleted ${result.deletedCount} old conversation${result.deletedCount === 1 ? '' : 's'}`);
      }
      
      setIsOpen(false);
      setTimeframe("");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete old sessions:", error);
      toast.error("Failed to delete old conversations");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Old
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Old Conversations
          </DialogTitle>
          <DialogDescription>
            Select how old conversations should be to delete them. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Delete conversations:</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will permanently delete all conversations and their messages that are older than the selected timeframe. This action cannot be undone.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !timeframe}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Old Conversations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 