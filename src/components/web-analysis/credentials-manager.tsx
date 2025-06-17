"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Key, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Shield,
  User,
  Cookie,
  Code,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { 
  saveWebScrapingCredentials,
  getWebScrapingCredentials,
  deleteWebScrapingCredentials,
  type CredentialData
} from "@/server/actions/enhanced-web-scraping";

interface CredentialsManagerProps {
  tenantId: string;
  credentials: CredentialData[];
}

interface CredentialFormData {
  id?: string;
  name: string;
  domain: string;
  authType: 'basic' | 'form' | 'cookie' | 'header' | 'sso';
  credentials: {
    username?: string;
    password?: string;
    headers?: Record<string, string>;
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
    formSelector?: string;
    usernameField?: string;
    passwordField?: string;
    submitButton?: string;
    ssoProvider?: string;
    ssoToken?: string;
  };
}

export function CredentialsManager({ tenantId, credentials: initialCredentials }: CredentialsManagerProps) {
  const [credentials, setCredentials] = useState<CredentialData[]>(initialCredentials);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState<CredentialFormData>({
    name: "",
    domain: "",
    authType: "basic",
    credentials: {},
  });

  const handleOpenDialog = (credential?: CredentialData) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        id: credential.id,
        name: credential.name,
        domain: credential.domain,
        authType: credential.authType as any,
        credentials: {}, // Don't populate sensitive data
      });
    } else {
      setEditingCredential(null);
      setFormData({
        name: "",
        domain: "",
        authType: "basic",
        credentials: {},
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const result = await saveWebScrapingCredentials(tenantId, formData);
      
      if (result.success) {
        // Refresh credentials list
        const updatedCredentials = await getWebScrapingCredentials(tenantId);
        setCredentials(updatedCredentials);
        setIsDialogOpen(false);
        toast.success(editingCredential ? "Credential updated" : "Credential created");
      }
    } catch (error: any) {
      toast.error("Failed to save credential", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    if (!confirm("Are you sure you want to delete this credential?")) return;

    try {
      await deleteWebScrapingCredentials(tenantId, credentialId);
      const updatedCredentials = await getWebScrapingCredentials(tenantId);
      setCredentials(updatedCredentials);
      toast.success("Credential deleted");
    } catch (error: any) {
      toast.error("Failed to delete credential", {
        description: error.message,
      });
    }
  };

  const getAuthIcon = (authType: string) => {
    switch (authType) {
      case 'basic':
        return <User className="h-4 w-4" />;
      case 'form':
        return <Code className="h-4 w-4" />;
      case 'cookie':
        return <Cookie className="h-4 w-4" />;
      case 'header':
        return <Key className="h-4 w-4" />;
      case 'sso':
        return <Shield className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const renderCredentialForm = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Company Internal Portal"
            />
          </div>
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="e.g., portal.company.com"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="authType">Authentication Type</Label>
          <Select
            value={formData.authType}
            onValueChange={(value: any) => 
              setFormData({ ...formData, authType: value, credentials: {} })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">HTTP Basic Auth</SelectItem>
              <SelectItem value="form">Form-based Login</SelectItem>
              <SelectItem value="cookie">Cookie Authentication</SelectItem>
              <SelectItem value="header">Header Authentication</SelectItem>
              <SelectItem value="sso">SSO Token</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={formData.authType} className="w-full">
          <TabsContent value="basic">
            <div className="space-y-3">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.credentials.username || ""}
                  onChange={(e) => 
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, username: e.target.value }
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPasswords.basic ? "text" : "password"}
                    value={formData.credentials.password || ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, password: e.target.value }
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => 
                      setShowPasswords({ ...showPasswords, basic: !showPasswords.basic })
                    }
                  >
                    {showPasswords.basic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="form">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="formUsername">Username</Label>
                  <Input
                    id="formUsername"
                    value={formData.credentials.username || ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, username: e.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="formPassword">Password</Label>
                  <Input
                    id="formPassword"
                    type="password"
                    value={formData.credentials.password || ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, password: e.target.value }
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="formSelector">Form CSS Selector</Label>
                <Input
                  id="formSelector"
                  value={formData.credentials.formSelector || ""}
                  onChange={(e) => 
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, formSelector: e.target.value }
                    })
                  }
                  placeholder="e.g., #login-form"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="usernameField">Username Field</Label>
                  <Input
                    id="usernameField"
                    value={formData.credentials.usernameField || ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, usernameField: e.target.value }
                      })
                    }
                    placeholder="username"
                  />
                </div>
                <div>
                  <Label htmlFor="passwordField">Password Field</Label>
                  <Input
                    id="passwordField"
                    value={formData.credentials.passwordField || ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, passwordField: e.target.value }
                      })
                    }
                    placeholder="password"
                  />
                </div>
                <div>
                  <Label htmlFor="submitButton">Submit Button</Label>
                  <Input
                    id="submitButton"
                    value={formData.credentials.submitButton || ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, submitButton: e.target.value }
                      })
                    }
                    placeholder="button[type=submit]"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="header">
            <div>
              <Label htmlFor="headers">Headers (JSON format)</Label>
              <Textarea
                id="headers"
                value={JSON.stringify(formData.credentials.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, headers }
                    });
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder={`{
  "Authorization": "Bearer your-token",
  "X-API-Key": "your-api-key"
}`}
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="sso">
            <div className="space-y-3">
              <div>
                <Label htmlFor="ssoProvider">SSO Provider</Label>
                <Input
                  id="ssoProvider"
                  value={formData.credentials.ssoProvider || ""}
                  onChange={(e) => 
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, ssoProvider: e.target.value }
                    })
                  }
                  placeholder="e.g., google, azure, okta"
                />
              </div>
              <div>
                <Label htmlFor="ssoToken">SSO Token</Label>
                <Textarea
                  id="ssoToken"
                  value={formData.credentials.ssoToken || ""}
                  onChange={(e) => 
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, ssoToken: e.target.value }
                    })
                  }
                  placeholder="Paste your SSO token here"
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Authentication Credentials</h3>
          <p className="text-sm text-muted-foreground">
            Manage credentials for accessing protected websites
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCredential ? "Edit Credential" : "Add New Credential"}
              </DialogTitle>
              <DialogDescription>
                Configure authentication credentials for accessing protected websites
              </DialogDescription>
            </DialogHeader>
            
            {renderCredentialForm()}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCredential ? "Update" : "Create"} Credential
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {credentials.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No credentials configured</h3>
              <p className="text-muted-foreground mb-4">
                Add authentication credentials to access protected websites
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Credential
              </Button>
            </CardContent>
          </Card>
        ) : (
          credentials.map((credential) => (
            <Card key={credential.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getAuthIcon(credential.authType)}
                    <div>
                      <CardTitle className="text-base">{credential.name}</CardTitle>
                      <CardDescription>{credential.domain}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={credential.isActive ? "default" : "secondary"}>
                      {credential.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(credential)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(credential.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Type: {credential.authType.toUpperCase()}</span>
                  <span>Created: {credential.createdAt?.toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 