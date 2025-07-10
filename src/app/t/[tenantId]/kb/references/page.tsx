import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  getKnowledgeBaseReferences, 
  getPendingReferenceRequests,
  getAvailableTenants 
} from "@/server/actions/kb-references";
import { Plus, ExternalLink, Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function ReferencesPage({ params }: PageProps) {
  const { tenantId } = await params;

  // Get data in parallel
  const [references, pendingRequests, availableTenants] = await Promise.all([
    getKnowledgeBaseReferences(tenantId),
    getPendingReferenceRequests(tenantId),
    getAvailableTenants(tenantId),
  ]);

  const getStatusBadge = (status: string, isActive: boolean | null) => {
    if (status === "active" && isActive) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Knowledge Base References</h1>
        <p className="text-muted-foreground">
          Connect to other knowledge bases to enhance your responses with broader context.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active References</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {references.filter(ref => ref.status === "active" && ref.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {references.filter(ref => ref.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Incoming Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available KBs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTenants.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button asChild>
          <Link href={`/t/${tenantId}/kb/references/request`}>
            <Plus className="w-4 h-4 mr-2" />
            Request Reference
          </Link>
        </Button>
        {pendingRequests.length > 0 && (
          <Button variant="outline" asChild>
            <Link href={`/t/${tenantId}/kb/references/requests`}>
              <Clock className="w-4 h-4 mr-2" />
              Review Requests ({pendingRequests.length})
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/t/${tenantId}/kb/references/analytics`}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Link>
        </Button>
      </div>

      {/* Outgoing References */}
      <Card>
        <CardHeader>
          <CardTitle>Your References</CardTitle>
          <CardDescription>
            Knowledge bases that this tenant references for enhanced responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {references.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No knowledge base references configured.</p>
              <p className="text-sm">Request access to other knowledge bases to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {references.map((reference) => (
                <div
                  key={reference.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{reference.name}</h3>
                      {getStatusBadge(reference.status, reference.isActive)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Target: {reference.targetTenant?.name}
                    </p>
                    {reference.description && (
                      <p className="text-sm text-muted-foreground">
                        {reference.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Weight: {reference.weight}</span>
                      <span>Max Results: {reference.maxResults}</span>
                      <span>Created: {reference.createdAt ? new Date(reference.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/t/${tenantId}/kb/references/${reference.id}`}>
                        Configure
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions for Available Tenants */}
      {availableTenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Knowledge Bases</CardTitle>
            <CardDescription>
              Knowledge bases you can request access to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTenants.slice(0, 6).map((tenant) => (
                <div key={tenant.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{tenant.name}</h3>
                  {tenant.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tenant.description}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href={`/t/${tenantId}/kb/references/request?target=${tenant.id}`}>
                      Request Access
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            {availableTenants.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href={`/t/${tenantId}/kb/references/browse`}>
                    View All ({availableTenants.length})
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 