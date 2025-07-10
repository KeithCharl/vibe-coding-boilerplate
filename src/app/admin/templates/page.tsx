import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Crown, 
  Copy,
  Shield,
  Save,
  ArrowLeft,
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
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { 
  getConnectionTemplates,
  createConnectionTemplate,
  updateConnectionTemplate,
  deleteConnectionTemplate
} from "@/server/actions/kb-references";
import Link from "next/link";
import { getCurrentUserRole } from "@/server/actions/user-management";
import { getTemplateSubmissions } from "@/server/actions/templates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectionTemplate {
  id: string;
  name: string;
  description?: string;
  isSystemTemplate: boolean;
  defaultWeight: number;
  includeTags?: string[];
  excludeTags?: string[];
  includeDocumentTypes?: string[];
  excludeDocumentTypes?: string[];
  createdAt: Date;
  usageCount: number;
}

// Template Submission Review Component
async function TemplateSubmissionCard({ submission }: { submission: any }) {
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
              <Button size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Review
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminTemplatesPage() {
  const currentUserRole = await getCurrentUserRole();
  
  if (!currentUserRole || (currentUserRole.globalRole !== "super_admin" && currentUserRole.globalRole !== "tenant_admin")) {
    redirect("/admin");
  }

  // Fetch template submissions
  const submissionsResult = await getTemplateSubmissions();
  const submissions = submissionsResult.success ? submissionsResult.data : [];

  // Group submissions by status
  const pendingSubmissions = submissions.filter(s => s.status === "pending");
  const approvedSubmissions = submissions.filter(s => s.status === "approved");
  const rejectedSubmissions = submissions.filter(s => s.status === "rejected");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Template Management</h2>
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
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">Templates approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedSubmissions.length}</div>
            <p className="text-xs text-muted-foreground">Templates rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">All time submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingSubmissions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Approved ({approvedSubmissions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>Rejected ({rejectedSubmissions.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending submissions to review.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingSubmissions.map((submission) => (
                <TemplateSubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No approved templates yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvedSubmissions.map((submission) => (
                <TemplateSubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rejected templates.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rejectedSubmissions.map((submission) => (
                <TemplateSubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 