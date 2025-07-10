"use client";

import { useState, useEffect } from "react";
import { 
  getTemplateSubmissions, 
  reviewTemplateSubmission,
  getTemplateStats,
  TEMPLATE_CATEGORIES 
} from "@/server/actions/templates";
import { getCurrentUserRole } from "@/server/actions/user-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  MessageSquare, 
  Workflow, 
  Plug, 
  Download,
  Star,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Types
type TemplateSubmissionWithDetails = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[] | null;
  content: any;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  version: string;
  status: string;
  submissionNotes: string | null;
  reviewNotes: string | null;
  submittedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  updatedAt: Date | null;
  submittedByUser: { id: string; name: string | null; email: string };
  reviewedByUser: { id: string; name: string | null; email: string } | null;
};

// Template Submission Review Component
function TemplateSubmissionCard({ submission, onReviewComplete }: { 
  submission: TemplateSubmissionWithDetails;
  onReviewComplete: () => void;
}) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "prompt":
        return <MessageSquare className="h-4 w-4" />;
      case "workflow":
        return <Workflow className="h-4 w-4" />;
      case "integration":
        return <Plug className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  async function handleReview(action: "approve" | "reject") {
    setIsSubmitting(true);
    try {
      const result = await reviewTemplateSubmission(submission.id, action, reviewNotes);
      if (result.success) {
        setIsReviewDialogOpen(false);
        setReviewNotes("");
        toast.success(`Template ${action}d successfully`);
        onReviewComplete();
      } else {
        toast.error(`Failed to ${action} template: ${result.error}`);
      }
    } catch (error) {
      console.error("Review error:", error);
      toast.error(`Error occurred while ${action}ing template`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(submission.category)}
            <CardTitle className="text-lg">{submission.name}</CardTitle>
          </div>
          {getStatusBadge(submission.status)}
        </div>
        <CardDescription>{submission.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Submitted by: {submission.submittedByUser?.name || submission.submittedByUser?.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Category and Version */}
          <div className="flex items-center space-x-4">
            <Badge variant="outline">{submission.category}</Badge>
            <span className="text-sm text-muted-foreground">Version: {submission.version}</span>
          </div>

          {/* Tags */}
          {submission.tags && submission.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Submission Notes */}
          {submission.submissionNotes && (
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm font-medium">Submission Notes:</p>
              <p className="text-sm text-muted-foreground">{submission.submissionNotes}</p>
            </div>
          )}

          {/* Review Notes (if reviewed) */}
          {submission.reviewNotes && (
            <div className="border-l-4 border-gray-500 pl-4">
              <p className="text-sm font-medium">Review Notes:</p>
              <p className="text-sm text-muted-foreground">{submission.reviewNotes}</p>
            </div>
          )}

          {/* File Download */}
          {submission.fileUrl && (
            <div className="flex items-center space-x-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <a 
                href={submission.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Download File ({submission.fileType})
              </a>
            </div>
          )}

          {/* Action Buttons */}
          {submission.status === "pending" && (
            <div className="flex space-x-2 pt-4">
              <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Review Template Submission</DialogTitle>
                    <DialogDescription>
                      Review and approve or reject the template submission: {submission.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Review Notes (Optional)</label>
                      <Textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add any notes about your review decision..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsReviewDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview("reject")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleReview("approve")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTemplateSubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<TemplateSubmissionWithDetails[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      // Check user permissions
      const roleResult = await getCurrentUserRole();
      setUserRole(roleResult);
      
      if (!roleResult || (roleResult.globalRole !== "super_admin" && roleResult.globalRole !== "tenant_admin")) {
        router.push("/admin");
        return;
      }

      // Fetch template submissions and stats
      const [submissionsResult, statsResult] = await Promise.all([
        getTemplateSubmissions(),
        getTemplateStats()
      ]);
      
      if (submissionsResult.success && submissionsResult.data) {
        setSubmissions(submissionsResult.data as TemplateSubmissionWithDetails[]);
      }
      
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load template submissions");
    } finally {
      setIsLoading(false);
    }
  }

  const handleReviewComplete = () => {
    loadData(); // Reload data after review
  };

  // Group submissions by status
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const approvedSubmissions = submissions.filter(s => s.status === "approved");
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userRole || (userRole.globalRole !== "super_admin" && userRole.globalRole !== "tenant_admin")) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Template Submissions</h2>
        <p className="text-muted-foreground">
          Review and approve user-submitted templates for the knowledge base.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">Templates awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">Templates approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">Templates rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTemplates || 0}</div>
            <p className="text-xs text-muted-foreground">Active in library</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedSubmissions.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Pending Submissions</h3>
                <p className="text-muted-foreground">
                  All template submissions have been reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingSubmissions.map((submission) => (
              <TemplateSubmissionCard 
                key={submission.id} 
                submission={submission} 
                onReviewComplete={handleReviewComplete}
              />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="space-y-4">
          {approvedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Approved Submissions</h3>
                <p className="text-muted-foreground">
                  No templates have been approved yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            approvedSubmissions.map((submission) => (
              <TemplateSubmissionCard 
                key={submission.id} 
                submission={submission} 
                onReviewComplete={handleReviewComplete}
              />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="rejected" className="space-y-4">
          {rejectedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Rejected Submissions</h3>
                <p className="text-muted-foreground">
                  No templates have been rejected.
                </p>
              </CardContent>
            </Card>
          ) : (
            rejectedSubmissions.map((submission) => (
              <TemplateSubmissionCard 
                key={submission.id} 
                submission={submission} 
                onReviewComplete={handleReviewComplete}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 