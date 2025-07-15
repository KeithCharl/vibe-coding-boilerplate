"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Globe, Loader2, FileText, Lock, Key, Cookie, Settings, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { uploadDocument, addWebContentToKnowledge } from "@/server/actions/content";

interface UploadDocumentDialogProps {
  tenantId: string;
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
}

interface AuthConfig {
  type: 'none' | 'cookies' | 'headers' | 'basic' | 'confluence-api';
  cookies?: string;
  headers?: string;
  username?: string;
  password?: string;
  token?: string;
}

export function UploadDocumentDialog({ 
  tenantId, 
  onUploadComplete,
  trigger 
}: UploadDocumentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScrapingWeb, setIsScrapingWeb] = useState(false);
  const [url, setUrl] = useState("");
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ type: 'none' });
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await uploadDocument(tenantId, formData);
      
      if (result.success) {
        toast.success("Document uploaded successfully!");
        setIsOpen(false);
        onUploadComplete?.();
        router.refresh();
      }
    } catch (error: any) {
      toast.error("Upload failed", {
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleWebScraping = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsScrapingWeb(true);

    try {
      // Prepare authentication options
      let authOptions: any = {
        waitForDynamic: false,
        generateSummary: true,
      };
      
      if (authConfig.type !== 'none') {
        switch (authConfig.type) {
          case 'cookies':
            if (authConfig.cookies) {
              try {
                // Parse cookies from string format "name=value; name2=value2"
                const cookies = authConfig.cookies.split(';').map(cookie => {
                  const [name, value] = cookie.trim().split('=');
                  return { name, value };
                }).filter(cookie => cookie.name && cookie.value);
                authOptions.auth = { type: 'cookies', cookies };
              } catch (error) {
                throw new Error('Invalid cookie format. Use: name=value; name2=value2');
              }
            }
            break;
          
          case 'headers':
            if (authConfig.headers) {
              try {
                const headers = JSON.parse(authConfig.headers);
                authOptions.auth = { type: 'headers', headers };
              } catch (error) {
                throw new Error('Invalid headers format. Use valid JSON.');
              }
            }
            break;
          
          case 'basic':
            if (authConfig.username && authConfig.password) {
              authOptions.auth = {
                type: 'basic',
                username: authConfig.username,
                password: authConfig.password
              };
            }
            break;
          
          case 'confluence-api':
            if (authConfig.token) {
              authOptions.auth = {
                type: 'confluence-api',
                token: authConfig.token
              };
            }
            break;
        }
      }

      const result = await addWebContentToKnowledge(tenantId, url, authOptions);
      
      if (result.success) {
        if (result.isNew) {
          toast.success("Web content added to knowledge base!", {
            description: `Added ${result.chunksCount} chunks from ${result.metadata?.domain || url}`,
          });
        } else {
          toast.info("Content already exists", {
            description: "This URL was recently added to your knowledge base",
          });
        }
        setIsOpen(false);
        setUrl("");
        setAuthConfig({ type: 'none' });
        onUploadComplete?.();
        router.refresh();
      }
    } catch (error: any) {
      toast.error("Failed to add web content", {
        description: error.message,
      });
    } finally {
      setIsScrapingWeb(false);
    }
  };

  const resetDialog = () => {
    setUrl("");
    setAuthConfig({ type: 'none' });
    setShowAuthOptions(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content to Knowledge Base</DialogTitle>
          <DialogDescription>
            Upload a document or add content from a website to your knowledge base.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="web" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              From Web
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4">
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Document File</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  required
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, DOC, DOCX, TXT, MD
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Document Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Auto-detected from filename"
                  disabled={isUploading}
                />
              </div>
              <Button type="submit" disabled={isUploading} variant="ghost" className="w-full btn-bancon-primary">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="web" className="space-y-4">
            <form onSubmit={handleWebScraping} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={isScrapingWeb}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of the webpage you want to add to your knowledge base
                </p>
              </div>

              {/* Authentication Options */}
              <Collapsible open={showAuthOptions} onOpenChange={setShowAuthOptions}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="w-full justify-between btn-bancon-outline">
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Authentication Options
                      {authConfig.type !== 'none' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {authConfig.type}
                        </span>
                      )}
                    </span>
                    <Settings className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Authentication Type</Label>
                    <Select value={authConfig.type} onValueChange={(value: any) => 
                      setAuthConfig({ type: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Authentication</SelectItem>
                        <SelectItem value="cookies">Session Cookies</SelectItem>
                        <SelectItem value="headers">Custom Headers</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="confluence-api">Confluence API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {authConfig.type === 'cookies' && (
                    <div className="space-y-2">
                      <Label htmlFor="cookies" className="flex items-center gap-2">
                        <Cookie className="h-4 w-4" />
                        Session Cookies
                      </Label>
                      <Textarea
                        id="cookies"
                        placeholder="JSESSIONID=abc123; ATLASSIAN_SESSION=xyz789"
                        value={authConfig.cookies || ''}
                        onChange={(e) => setAuthConfig(prev => ({ ...prev, cookies: e.target.value }))}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Copy cookies from your browser's developer tools (Format: name=value; name2=value2)
                      </p>
                    </div>
                  )}

                  {authConfig.type === 'headers' && (
                    <div className="space-y-2">
                      <Label htmlFor="headers" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Custom Headers
                      </Label>
                      <Textarea
                        id="headers"
                        placeholder='{"Authorization": "Bearer token", "X-API-Key": "key"}'
                        value={authConfig.headers || ''}
                        onChange={(e) => setAuthConfig(prev => ({ ...prev, headers: e.target.value }))}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        JSON format with custom headers for authentication
                      </p>
                    </div>
                  )}

                  {authConfig.type === 'basic' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          value={authConfig.username || ''}
                          onChange={(e) => setAuthConfig(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={authConfig.password || ''}
                          onChange={(e) => setAuthConfig(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                        />
                      </div>
                    </div>
                  )}

                  {authConfig.type === 'confluence-api' && (
                    <div className="space-y-2">
                      <Label htmlFor="token" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Confluence API Token
                      </Label>
                      <Input
                        id="token"
                        type="password"
                        value={authConfig.token || ''}
                        onChange={(e) => setAuthConfig(prev => ({ ...prev, token: e.target.value }))}
                        placeholder="Enter your Confluence API token"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API token from Confluence User Settings → API Tokens
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Button type="submit" disabled={isScrapingWeb || !url.trim()} variant="ghost" className="w-full btn-bancon-primary">
                {isScrapingWeb ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Content...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Add from Web
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 