"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  Calendar,
  Weight,
  Target,
  Filter
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  getPendingReferenceRequests,
  approveReferenceRequest,
  rejectReferenceRequest 
} from "@/server/actions/kb-references";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default function ReferenceRequestsPage({ params }: PageProps) {
  const { tenantId } = use(params);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [tenantId]);

  const loadRequests = async () => {
    try {
      const requests = await getPendingReferenceRequests(tenantId);
      
      // Separate incoming and outgoing requests
      const incoming = requests.filter(req => req.targetTenantId === tenantId);
      const outgoing = requests.filter(req => req.sourceTenantId === tenantId);
      
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      toast.error("Failed to load requests");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await approveReferenceRequest(requestId, tenantId);
      toast.success("Request approved successfully!");
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectReferenceRequest(requestId, tenantId);
      toast.success("Request rejected");
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject request");
    }
  };

  const RequestCard = ({ request, isIncoming }: { request: any; isIncoming: boolean }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{request.name}</h3>
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            
            <div className="text-muted-foreground">
              {isIncoming ? (
                <p>
                  <strong>{request.sourceTenant?.name}</strong> wants to access your knowledge base
                </p>
              ) : (
                <p>
                  Request to access <strong>{request.targetTenant?.name}</strong>
                </p>
              )}
            </div>

            {request.description && (
              <p className="text-sm text-muted-foreground">{request.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(request.createdAt).toLocaleDateString()}
              </div>
              {request.customConfig && (
                <>
                  <div className="flex items-center gap-1">
                    <Weight className="w-4 h-4" />
                    Weight: {request.customConfig.weight || 1.0}
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Max: {request.customConfig.maxResults || 5}
                  </div>
                </>
              )}
            </div>

            {request.customConfig && (request.customConfig.includeTags || request.customConfig.excludeTags) && (
              <div className="space-y-2">
                {request.customConfig.includeTags && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Include:</span>
                    <div className="flex gap-1">
                      {request.customConfig.includeTags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {request.customConfig.excludeTags && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-red-600" />
                    <span className="text-sm">Exclude:</span>
                    <div className="flex gap-1">
                      {request.customConfig.excludeTags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isIncoming && (
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleApprove(request.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.id)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/t/${tenantId}/kb/references`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to References
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reference Requests</h1>
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/t/${tenantId}/kb/references`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to References
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Reference Requests</h1>
          <p className="text-muted-foreground">
            Manage incoming and outgoing knowledge base access requests.
          </p>
        </div>
      </div>

      <Tabs defaultValue="incoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="incoming">
            Incoming Requests ({incomingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            Outgoing Requests ({outgoingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          {incomingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">No incoming requests</h3>
                <p className="text-muted-foreground">
                  No other knowledge bases have requested access to your data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((request) => (
                <RequestCard key={request.id} request={request} isIncoming={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          {outgoingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">No outgoing requests</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't requested access to any other knowledge bases.
                </p>
                <Button asChild>
                  <Link href={`/t/${tenantId}/kb/references/request`}>
                    Request Access
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {outgoingRequests.map((request) => (
                <RequestCard key={request.id} request={request} isIncoming={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 