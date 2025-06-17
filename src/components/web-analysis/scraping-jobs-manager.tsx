"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Calendar, 
  Edit, 
  Trash2, 
  Play,
  Pause,
  RotateCcw,
  Clock,
  Globe,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Copy,
  Building,
  ExternalLink,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  saveScrapingJob,
  getScrapingJobs,
  runScrapingJob,
  toggleJobStatus,
  deleteScrapingJob,
  type ScrapingJobData,
  type CredentialData
} from "@/server/actions/enhanced-web-scraping";

interface ScrapingJobsManagerProps {
  tenantId: string;
  jobs: ScrapingJobData[];
  credentials: CredentialData[];
}

interface JobFormData {
  id?: string;
  name: string;
  baseUrl: string;
  scrapeChildren: boolean;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  credentialId?: string;
  schedule: string;
  options: {
    maxPages: number;
    delayBetweenRequests: number;
    waitForDynamic: boolean;
  };
}

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *", description: "Runs every hour on the hour" },
  { label: "Every 6 hours", value: "0 */6 * * *", description: "Runs every 6 hours starting at midnight" },
  { label: "Daily at 2 AM", value: "0 2 * * *", description: "Runs once daily at 2:00 AM" },
  { label: "Weekly (Sunday 2 AM)", value: "0 2 * * 0", description: "Runs every Sunday at 2:00 AM" },
  { label: "Monthly (1st, 2 AM)", value: "0 2 1 * *", description: "Runs on the 1st of every month at 2:00 AM" },
  { label: "Custom", value: "custom", description: "Set your own cron expression" },
];

// Predefined site templates for common scraping scenarios
const SITE_TEMPLATES = [
  {
    name: "SAP Support Portal",
    baseUrl: "https://support.sap.com",
    includePatterns: ["/en/", "/note/", "/kba/", "/community/"],
    excludePatterns: ["/search", "/download", "/profile"],
    maxDepth: 3,
    description: "Scrape SAP support documentation and knowledge base articles"
  },
  {
    name: "Company Intranet",
    baseUrl: "https://intranet.company.com",
    includePatterns: ["/docs/", "/policies/", "/news/"],
    excludePatterns: ["/admin/", "/private/", "/temp/"],
    maxDepth: 2,
    description: "Scrape internal company documentation and policies"
  },
  {
    name: "Knowledge Base",
    baseUrl: "https://kb.example.com",
    includePatterns: ["/articles/", "/guides/", "/faq/"],
    excludePatterns: ["/admin/", "/api/", "/assets/"],
    maxDepth: 4,
    description: "Scrape knowledge base articles and guides"
  },
  {
    name: "Documentation Site",
    baseUrl: "https://docs.example.com",
    includePatterns: ["/docs/", "/guides/", "/reference/"],
    excludePatterns: ["/api/", "/blog/", "/downloads/"],
    maxDepth: 5,
    description: "Scrape technical documentation"
  },
];

export function ScrapingJobsManager({ tenantId, jobs: initialJobs, credentials }: ScrapingJobsManagerProps) {
  const [jobs, setJobs] = useState<ScrapingJobData[]>(initialJobs);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ScrapingJobData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("0 2 * * *");

  const [formData, setFormData] = useState<JobFormData>({
    name: "",
    baseUrl: "",
    scrapeChildren: true,
    maxDepth: 2,
    includePatterns: [],
    excludePatterns: [],
    schedule: "0 2 * * *", // Daily at 2 AM
    options: {
      maxPages: 100,
      delayBetweenRequests: 1000,
      waitForDynamic: true,
    },
  });

  const handleOpenDialog = (job?: ScrapingJobData) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        id: job.id,
        name: job.name,
        baseUrl: job.baseUrl,
        scrapeChildren: job.scrapeChildren,
        maxDepth: job.maxDepth,
        includePatterns: [],
        excludePatterns: [],
        schedule: job.schedule,
        options: {
          maxPages: 100,
          delayBetweenRequests: 1000,
          waitForDynamic: true,
        },
      });
      setSelectedPreset(job.schedule);
    } else {
      setEditingJob(null);
      setFormData({
        name: "",
        baseUrl: "",
        scrapeChildren: true,
        maxDepth: 2,
        includePatterns: [],
        excludePatterns: [],
        schedule: "0 2 * * *",
        options: {
          maxPages: 100,
          delayBetweenRequests: 1000,
          waitForDynamic: true,
        },
      });
      setSelectedTemplate("");
      setSelectedPreset("0 2 * * *");
    }
    setIsDialogOpen(true);
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = SITE_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setFormData({
        ...formData,
        name: template.name,
        baseUrl: template.baseUrl,
        maxDepth: template.maxDepth,
        includePatterns: template.includePatterns,
        excludePatterns: template.excludePatterns,
      });
      setSelectedTemplate(templateName);
    }
  };

  const handlePresetSelect = (preset: string) => {
    if (preset !== "custom") {
      setFormData({ ...formData, schedule: preset });
    }
    setSelectedPreset(preset);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name for this scraping job");
      return;
    }
    if (!formData.baseUrl.trim()) {
      toast.error("Please enter a base URL to scrape");
      return;
    }
    
    try {
      const url = new URL(formData.baseUrl);
      // Valid URL
    } catch (error) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      setIsLoading(true);

      const result = await saveScrapingJob(tenantId, formData);
      
      if (result.success) {
        // Refresh jobs list
        const updatedJobs = await getScrapingJobs(tenantId);
        setJobs(updatedJobs);
        setIsDialogOpen(false);
        toast.success(editingJob ? "Scraping job updated successfully" : "Scraping job created successfully");
      }
    } catch (error: any) {
      toast.error("Failed to save scraping job", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunJob = async (jobId: string, jobName: string) => {
    try {
      setRunningJobs(prev => new Set([...prev, jobId]));
      
      const result = await runScrapingJob(tenantId, jobId);
      
      if (result.success) {
        // Refresh jobs list
        const updatedJobs = await getScrapingJobs(tenantId);
        setJobs(updatedJobs);
        toast.success(`"${jobName}" completed successfully`, {
          description: `Created: ${result.result.documentsCreated}, Updated: ${result.result.documentsUpdated}, Changes: ${result.result.changesDetected}`,
        });
      }
    } catch (error: any) {
      toast.error(`"${jobName}" failed`, {
        description: error.message,
      });
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleToggleStatus = async (jobId: string, jobName: string, currentStatus: boolean) => {
    try {
      await toggleJobStatus(tenantId, jobId);
      const updatedJobs = await getScrapingJobs(tenantId);
      setJobs(updatedJobs);
      toast.success(`"${jobName}" ${currentStatus ? "disabled" : "enabled"} successfully`);
    } catch (error: any) {
      toast.error("Failed to update job status", {
        description: error.message,
      });
    }
  };

  const handleDelete = async (jobId: string, jobName: string) => {
    try {
      await deleteScrapingJob(tenantId, jobId);
      const updatedJobs = await getScrapingJobs(tenantId);
      setJobs(updatedJobs);
      toast.success(`"${jobName}" deleted successfully`);
    } catch (error: any) {
      toast.error("Failed to delete scraping job", {
        description: error.message,
      });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const getCleanUrl = (url: string): { domain: string; path: string; cleanDisplay: string; isLongUrl: boolean } => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      let path = urlObj.pathname;
      const isLongUrl = url.length > 80 || url.includes('%') || url.includes('?');
      
      // Truncate very long paths
      if (path.length > 50) {
        path = path.substring(0, 47) + '...';
      }
      
      // Create a clean display version
      let cleanDisplay = domain;
      if (path && path !== '/' && path !== '' && !isLongUrl) {
        cleanDisplay += path;
      }
      
      // For very long URLs, just show domain
      if (isLongUrl || cleanDisplay.length > 60) {
        cleanDisplay = domain;
        if (isLongUrl) {
          path = '(encoded URL)';
        }
      }
      
      return { domain, path, cleanDisplay, isLongUrl };
    } catch (error) {
      // Handle invalid URLs gracefully
      const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const domain = cleanUrl.split('/')[0] || url;
      return { domain, path: '', cleanDisplay: domain, isLongUrl: url.length > 80 };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Running</Badge>;
      default:
        return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  const addPattern = (type: 'include' | 'exclude', pattern: string) => {
    if (!pattern.trim()) return;
    
    const currentPatterns = type === 'include' ? formData.includePatterns : formData.excludePatterns;
    const newPatterns = [...currentPatterns, pattern.trim()];
    
    if (type === 'include') {
      setFormData({
        ...formData,
        includePatterns: newPatterns
      });
    } else {
      setFormData({
        ...formData,
        excludePatterns: newPatterns
      });
    }
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    const currentPatterns = type === 'include' ? formData.includePatterns : formData.excludePatterns;
    const newPatterns = currentPatterns.filter((_, i) => i !== index);
    
    if (type === 'include') {
      setFormData({
        ...formData,
        includePatterns: newPatterns
      });
    } else {
      setFormData({
        ...formData,
        excludePatterns: newPatterns
      });
    }
  };

  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    const urlInfo = getCleanUrl(job.baseUrl);
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.baseUrl.toLowerCase().includes(searchLower) ||
      urlInfo.domain.toLowerCase().includes(searchLower) ||
      urlInfo.cleanDisplay.toLowerCase().includes(searchLower)
    );
  });

  const renderJobForm = () => {
    return (
      <div className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-3">
          <Label>Quick Setup Templates (Optional)</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template for common scraping scenarios" />
            </SelectTrigger>
            <SelectContent>
              {SITE_TEMPLATES.map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground">{template.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select a template to auto-fill common scraping configurations
          </p>
        </div>

        <Separator />

        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="jobName">Job Name *</Label>
            <Input
              id="jobName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SAP Support Documentation, Company Knowledge Base"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Give this scraping job a descriptive name for easy identification
            </p>
          </div>

          <div>
            <Label htmlFor="baseUrl">Base URL *</Label>
            <Input
              id="baseUrl"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="e.g., https://support.sap.com, https://docs.company.com"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the complete URL including https:// where scraping should start
            </p>
          </div>

          <div>
            <Label htmlFor="credentialId">Authentication (Optional)</Label>
            <Select
              value={formData.credentialId || "none"}
              onValueChange={(value) => 
                setFormData({ ...formData, credentialId: value === "none" ? undefined : value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No authentication required</SelectItem>
                {credentials.map((credential) => (
                  <SelectItem key={credential.id} value={credential.id}>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>{credential.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {credential.domain}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {credentials.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No credentials configured. Add credentials first if this site requires authentication.
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Crawling Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">Crawling Configuration</h4>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="scrapeChildren"
              checked={formData.scrapeChildren}
              onCheckedChange={(checked) => setFormData({ ...formData, scrapeChildren: checked })}
            />
            <Label htmlFor="scrapeChildren">Scrape child pages (recursive crawling)</Label>
          </div>

          {formData.scrapeChildren && (
            <div>
              <Label htmlFor="maxDepth">Maximum Crawl Depth</Label>
              <Select
                value={formData.maxDepth.toString()}
                onValueChange={(value) => setFormData({ ...formData, maxDepth: parseInt(value) })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 level (start page only)</SelectItem>
                  <SelectItem value="2">2 levels (start page + direct links)</SelectItem>
                  <SelectItem value="3">3 levels (recommended for most sites)</SelectItem>
                  <SelectItem value="4">4 levels (comprehensive crawling)</SelectItem>
                  <SelectItem value="5">5 levels (very deep crawling)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Higher depths find more content but take longer and may include irrelevant pages
              </p>
            </div>
          )}

          {/* URL Pattern Filters */}
          <div className="space-y-4">
            <div>
              <Label>Include URL Patterns (Optional)</Label>
              <div className="space-y-2 mt-1">
                {formData.includePatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={pattern} readOnly className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePattern('include', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g., /docs/, /articles/, /knowledge-base/"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addPattern('include', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addPattern('include', input.value);
                      input.value = '';
                    }}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only crawl URLs that contain these patterns. Leave empty to crawl all URLs.
                </p>
              </div>
            </div>

            <div>
              <Label>Exclude URL Patterns (Optional)</Label>
              <div className="space-y-2 mt-1">
                {formData.excludePatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={pattern} readOnly className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePattern('exclude', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g., /admin/, /private/, /temp/, /search"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addPattern('exclude', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addPattern('exclude', input.value);
                      input.value = '';
                    }}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Skip URLs that contain these patterns. Use to avoid admin pages, downloads, etc.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Schedule Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">Schedule Configuration</h4>
          
          <div>
            <Label>Schedule Preset</Label>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPreset === "custom" && (
            <div>
              <Label htmlFor="customCron">Custom Cron Expression</Label>
              <Input
                id="customCron"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="0 2 * * *"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use cron syntax: minute hour day month day-of-week
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Advanced Options */}
        <div className="space-y-4">
          <h4 className="font-medium">Advanced Options</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxPages">Maximum Pages</Label>
              <Input
                id="maxPages"
                type="number"
                value={formData.options.maxPages}
                onChange={(e) => setFormData({
                  ...formData,
                  options: { ...formData.options, maxPages: parseInt(e.target.value) || 100 }
                })}
                min="1"
                max="1000"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Limit the total number of pages to crawl
              </p>
            </div>

            <div>
              <Label htmlFor="delay">Delay Between Requests (ms)</Label>
              <Input
                id="delay"
                type="number"
                value={formData.options.delayBetweenRequests}
                onChange={(e) => setFormData({
                  ...formData,
                  options: { ...formData.options, delayBetweenRequests: parseInt(e.target.value) || 1000 }
                })}
                min="100"
                max="10000"
                step="100"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delay between requests to be respectful to the target site
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="waitForDynamic"
              checked={formData.options.waitForDynamic}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                options: { ...formData.options, waitForDynamic: checked }
              })}
            />
            <Label htmlFor="waitForDynamic">Wait for dynamic content to load</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Enable for sites with JavaScript-generated content (slower but more complete)
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scraping Jobs</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage automated web scraping jobs with scheduling
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingJob ? "Edit Scraping Job" : "Create New Scraping Job"}
              </DialogTitle>
              <DialogDescription>
                Configure an automated web scraping job with scheduling, authentication, and crawling options.
                Use templates for quick setup of common scenarios.
              </DialogDescription>
            </DialogHeader>
            
            {renderJobForm()}

            <div className="flex justify-end gap-2 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingJob ? "Update" : "Create"} Job
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

             {/* Search and Filter */}
       {jobs.length > 0 && (
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
           <div className="relative flex-1 w-full sm:max-w-sm">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search jobs by name or URL..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10"
             />
           </div>
           <div className="flex items-center gap-2">
             <Badge variant="outline">
               {filteredJobs.length} of {jobs.length} jobs
             </Badge>
             {searchTerm && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setSearchTerm("")}
                 className="h-8 px-2 text-xs"
               >
                 Clear
               </Button>
             )}
           </div>
         </div>
       )}

      {/* Jobs List */}
      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No scraping jobs configured</h3>
              <p className="text-muted-foreground mb-6">
                Create automated scraping jobs to regularly update your knowledge base
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Job
              </Button>
            </CardContent>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground">
                No jobs match your search term "{searchTerm}"
              </p>
            </CardContent>
          </Card>
        ) : (
                     filteredJobs.map((job) => (
             <Card key={job.id} className="hover:shadow-md transition-shadow">
               <CardHeader className="pb-3">
                 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                   <div className="flex items-start gap-3 min-w-0 flex-1">
                     <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                       <Calendar className="h-5 w-5" />
                     </div>
                     <div className="min-w-0 flex-1">
                       <CardTitle className="text-base break-words">{job.name}</CardTitle>
                       <CardDescription className="space-y-2 mt-1">
                         <div className="flex items-center gap-2 min-w-0">
                           <Globe className="h-3 w-3 flex-shrink-0" />
                           <span className="font-medium text-foreground truncate">
                             {getCleanUrl(job.baseUrl).domain}
                           </span>
                           {getCleanUrl(job.baseUrl).path && getCleanUrl(job.baseUrl).path !== '/' && (
                             <span className="text-xs text-muted-foreground truncate">
                               {getCleanUrl(job.baseUrl).path}
                             </span>
                           )}
                           {getCleanUrl(job.baseUrl).isLongUrl && (
                             <Badge variant="outline" className="text-xs">
                               Long URL
                             </Badge>
                           )}
                         </div>
                         <div className="flex flex-wrap items-center gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                             onClick={() => copyUrl(job.baseUrl)}
                           >
                             <Copy className="h-3 w-3 mr-1" />
                             <span className="hidden sm:inline">Copy URL</span>
                             <span className="sm:hidden">Copy</span>
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                             onClick={() => window.open(job.baseUrl, '_blank')}
                           >
                             <ExternalLink className="h-3 w-3 mr-1" />
                             <span className="hidden sm:inline">Open</span>
                             <span className="sm:hidden">View</span>
                           </Button>
                         </div>
                       </CardDescription>
                     </div>
                   </div>
                   <div className="flex flex-wrap items-center gap-2 justify-end">
                     {getStatusBadge(job.status, job.isActive)}
                     <div className="flex items-center gap-1">
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleRunJob(job.id, job.name)}
                         disabled={runningJobs.has(job.id)}
                         className="text-muted-foreground hover:text-foreground"
                         title="Run job now"
                       >
                         {runningJobs.has(job.id) ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <Play className="h-4 w-4" />
                         )}
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleToggleStatus(job.id, job.name, job.isActive)}
                         className="text-muted-foreground hover:text-foreground"
                         title={job.isActive ? "Disable job" : "Enable job"}
                       >
                         {job.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                       </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleOpenDialog(job)}
                         className="text-muted-foreground hover:text-foreground"
                         title="Edit job"
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button
                             variant="ghost"
                             size="sm"
                             className="text-muted-foreground hover:text-destructive"
                             title="Delete job"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Delete Scraping Job</AlertDialogTitle>
                             <AlertDialogDescription>
                               Are you sure you want to delete "{job.name}"? This action cannot be undone.
                               All scheduled runs will be cancelled.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <AlertDialogAction
                               onClick={() => handleDelete(job.id, job.name)}
                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                             >
                               Delete Job
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                     </div>
                   </div>
                 </div>
               </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(job.status)}
                    <span>Status: {job.status || 'Scheduled'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    <span>Depth: {job.maxDepth}</span>
                  </div>
                  {job.lastRun && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last run: {formatDistanceToNow(job.lastRun)} ago</span>
                    </div>
                  )}
                  {job.credentialName && (
                    <div className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      <span>Using: {job.credentialName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 