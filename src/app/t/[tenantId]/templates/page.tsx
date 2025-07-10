"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  getTemplates, 
  submitTemplate,
  downloadTemplate,
  rateTemplate 
} from "@/server/actions/templates";
import { TEMPLATE_CATEGORIES } from "@/lib/template-constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  FileText, 
  MessageSquare, 
  Workflow, 
  Plug, 
  Download,
  Star,
  Calendar,
  User,
  Search,
  Plus,
  Upload,
  Filter,
  SortAsc,
  Eye,
  Share,
  Loader2
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

// Extended categories for filtering
const FILTER_CATEGORIES = [
  { value: "all", label: "All Categories" },
  ...TEMPLATE_CATEGORIES,
];

// Template card component  
function TemplateCard({ template, onDownload, onRate }: { 
  template: any; 
  onDownload: (templateId: string) => void;
  onRate: (templateId: string, rating: number) => void;
}) {
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "document":
        return <FileText className="h-5 w-5" />;
      case "prompt":
        return <MessageSquare className="h-5 w-5" />;
      case "workflow":
        return <Workflow className="h-5 w-5" />;
      case "integration":
        return <Plug className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(template.id);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRating = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      await onRate(template.id, rating);
      setShowRatingDialog(false);
      setRating(0);
      setRatingComment("");
      toast.success("Rating submitted successfully");
    } catch (error) {
      toast.error("Failed to submit rating");
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              {getCategoryIcon(template.category)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {template.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                <span className="text-sm text-muted-foreground">v{template.version}</span>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>{template.downloadCount || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{template.rating ? template.rating.toFixed(1) : "0.0"}</span>
              <span>({template.ratingCount || 0})</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>{template.createdByUser?.name || template.createdByUser?.email}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button 
            className="flex-1" 
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
          
          <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rate Template</DialogTitle>
                <DialogDescription>
                  Rate "{template.name}" and leave a comment (optional)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Rating</Label>
                  <div className="flex space-x-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="sm"
                        onClick={() => setRating(star)}
                        className="p-1"
                      >
                        <Star 
                          className={`h-6 w-6 ${
                            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`} 
                        />
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Comment (Optional)</Label>
                  <Textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Share your thoughts about this template..."
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRating}>
                  Submit Rating
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// Template submission dialog
function TemplateSubmissionDialog({ onSubmissionComplete }: { onSubmissionComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "document",
    tags: "",
    submissionNotes: "",
    version: "1.0.0",
  });
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !content) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(Boolean);
      
      const result = await submitTemplate({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
        content: { text: content },
        file: file || undefined,
        submissionNotes: formData.submissionNotes,
        version: formData.version,
      });

      if (result.success) {
        toast.success("Template submitted successfully! It will be reviewed by admins.");
        setIsOpen(false);
        setFormData({
          name: "",
          description: "",
          category: "document",
          tags: "",
          submissionNotes: "",
          version: "1.0.0",
        });
        setFile(null);
        setContent("");
        onSubmissionComplete();
      } else {
        toast.error(`Submission failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Submit Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit a Template</DialogTitle>
          <DialogDescription>
            Share your template with the community. It will be reviewed before being published.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Template name"
              />
            </div>
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                placeholder="1.0.0"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this template does..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="content">Template Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your template content here..."
              className="min-h-[100px]"
            />
          </div>
          
          <div>
            <Label htmlFor="file">Optional File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.txt,.zip,.json"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Submission Notes</Label>
            <Textarea
              id="notes"
              value={formData.submissionNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, submissionNotes: e.target.value }))}
              placeholder="Additional notes for reviewers..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Submit Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "downloads" | "created">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [searchQuery, selectedCategory, sortBy, sortOrder, status]);

  async function loadData() {
    setIsLoading(true);
    try {
      const result = await getTemplates({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        limit: 50,
      });
      
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        toast.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = async (templateId: string) => {
    try {
      const result = await downloadTemplate(templateId);
      if (result.success) {
        toast.success("Template downloaded successfully");
        // Reload templates to update download count
        loadData();
      } else {
        toast.error(`Download failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download template");
    }
  };

  const handleRate = async (templateId: string, rating: number) => {
    try {
      const result = await rateTemplate(templateId, rating);
      if (result.success) {
        // Reload templates to update rating
        loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Rating error:", error);
      throw error;
    }
  };

  const handleSubmissionComplete = () => {
    toast.success("Thank you for your submission! An admin will review it soon.");
  };

  // Computed stats
  const totalTemplates = templates.length;
  const totalDownloads = templates.reduce((sum, t) => sum + (t.downloadCount || 0), 0);
  const avgRating = templates.length > 0 
    ? templates.reduce((sum, t) => sum + (t.rating || 0), 0) / templates.filter(t => t.rating > 0).length 
    : 0;
  const uniqueCategories = new Set(templates.map(t => t.category)).size;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Template Library</h2>
          <p className="text-muted-foreground">
            Discover and download templates to boost your productivity
          </p>
        </div>
        <TemplateSubmissionDialog onSubmissionComplete={handleSubmissionComplete} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Available templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDownloads}</div>
            <p className="text-xs text-muted-foreground">Community downloads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCategories}</div>
            <p className="text-xs text-muted-foreground">Template categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Newest</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          <SortAsc className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your search criteria." 
                : "No templates are available yet."}
            </p>
            <TemplateSubmissionDialog onSubmissionComplete={handleSubmissionComplete} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDownload={handleDownload}
              onRate={handleRate}
            />
          ))}
        </div>
      )}
    </div>
  );
} 