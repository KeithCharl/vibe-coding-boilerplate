"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  TrendingUp, 
  Users,
  Calendar,
  Eye,
  BarChart3,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedbackItem {
  id: string;
  messageId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date | null;
  messageContent: string;
}

interface FeedbackStats {
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
  recentComments: Array<{
    rating: number;
    comment: string | null;
    createdAt: Date | null;
    messageContent: string;
  }>;
}

interface ChatAnalytic {
  eventData: any;
  createdAt: Date | null;
}

interface DocumentUsage {
  documentId: string;
  documentName: string;
  usageCount: number;
  lastUsed: Date | null;
  fileType?: string;
}

interface PopularQuery {
  query: string;
  count: number;
  lastUsed: Date;
}

interface UserActivity {
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage?: string | null;
  messagesCount: number;
  feedbackCount: number;
  lastActivity: Date;
}

interface AnalyticsOverview {
  totalQueries: number;
  totalFeedback: number;
  activeUsers: number;
  documentsReferenced: number;
  averageSessionLength: number;
}

interface AnalyticsDashboardProps {
  tenantId: string;
  feedbackStats: FeedbackStats;
  tenantFeedback: FeedbackItem[];
  chatAnalytics: ChatAnalytic[];
  documentUsage: DocumentUsage[];
  popularQueries: PopularQuery[];
  userActivity: UserActivity[];
  analyticsOverview: AnalyticsOverview;
}

export function AnalyticsDashboard({ 
  tenantId, 
  feedbackStats, 
  tenantFeedback, 
  chatAnalytics,
  documentUsage,
  popularQueries,
  userActivity,
  analyticsOverview
}: AnalyticsDashboardProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  const positiveFeedback = tenantFeedback.filter(f => f.rating > 0);
  const negativeFeedback = tenantFeedback.filter(f => f.rating < 0);
  const feedbackWithComments = tenantFeedback.filter(f => f.comment && f.comment.trim());

  const handleViewFeedback = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setShowFeedbackDialog(true);
  };

  const getRatingBadge = (rating: number) => {
    if (rating > 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800 gap-1">
        <ThumbsUp className="h-3 w-3" />
        Positive
      </Badge>;
    } else {
      return <Badge variant="destructive" className="gap-1">
        <ThumbsDown className="h-3 w-3" />
        Negative
      </Badge>;
    }
  };

  const getStarRating = (rating: number) => {
    const stars = Math.abs(rating);
    const color = rating > 0 ? "text-yellow-400" : "text-gray-300";
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < stars ? color : "text-gray-200"} ${i < stars ? "fill-current" : ""}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              {feedbackWithComments.length} with comments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.averageRating.toFixed(1)}</div>
            <div className="flex gap-1 mt-1">
              {getStarRating(Math.round(feedbackStats.averageRating))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{positiveFeedback.length}</div>
            <p className="text-xs text-muted-foreground">
              {feedbackStats.totalFeedback > 0 
                ? `${((positiveFeedback.length / feedbackStats.totalFeedback) * 100).toFixed(1)}%`
                : "0%"
              } of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Feedback</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{negativeFeedback.length}</div>
            <p className="text-xs text-muted-foreground">
              {feedbackStats.totalFeedback > 0 
                ? `${((negativeFeedback.length / feedbackStats.totalFeedback) * 100).toFixed(1)}%`
                : "0%"
              } of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">Feedback Management</TabsTrigger>
          <TabsTrigger value="comments">Comments Review</TabsTrigger>
          <TabsTrigger value="documents">Document Usage</TabsTrigger>
          <TabsTrigger value="queries">Popular Queries</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>
                Latest user feedback on AI responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenantFeedback.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No feedback yet</h3>
                  <p className="text-muted-foreground">
                    User feedback will appear here once they start rating responses.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {tenantFeedback.slice(0, 20).map((feedback) => (
                      <div key={feedback.id} className="border rounded-lg p-4 space-y-2">
                                                 <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             {getRatingBadge(feedback.rating)}
                             <div className="flex items-center gap-2">
                               {feedback.userImage && (
                                 <img 
                                   src={feedback.userImage} 
                                   alt={feedback.userName || 'User'} 
                                   className="h-6 w-6 rounded-full"
                                 />
                               )}
                               <div className="flex flex-col">
                                 <span className="text-sm font-medium">
                                   {feedback.userName || 'Anonymous User'}
                                 </span>
                                 <span className="text-xs text-muted-foreground">
                                   {feedback.userEmail}
                                 </span>
                               </div>
                             </div>
                           </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {feedback.createdAt ? formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true }) : 'Unknown date'}
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewFeedback(feedback)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                        
                        {feedback.comment && (
                          <div className="bg-muted p-3 rounded text-sm">
                            <strong>Comment:</strong> {feedback.comment}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          <strong>AI Response:</strong> {feedback.messageContent.substring(0, 150)}
                          {feedback.messageContent.length > 150 && "..."}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Comments</CardTitle>
              <CardDescription>
                Detailed feedback comments from users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackWithComments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No comments yet</h3>
                  <p className="text-muted-foreground">
                    User comments will appear here when they provide detailed feedback.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {feedbackWithComments.map((feedback) => (
                      <div key={feedback.id} className="border rounded-lg p-4">
                                                 <div className="flex items-start justify-between mb-2">
                           <div className="flex items-center gap-2">
                             {getRatingBadge(feedback.rating)}
                             <div className="flex items-center gap-2">
                               {feedback.userImage && (
                                 <img 
                                   src={feedback.userImage} 
                                   alt={feedback.userName || 'User'} 
                                   className="h-6 w-6 rounded-full"
                                 />
                               )}
                               <div>
                                 <span className="text-sm font-medium">
                                   {feedback.userName || 'Anonymous User'}
                                 </span>
                                 <div className="text-xs text-muted-foreground">
                                   <a 
                                     href={`mailto:${feedback.userEmail}`}
                                     className="text-blue-600 hover:underline"
                                   >
                                     {feedback.userEmail}
                                   </a>
                                 </div>
                               </div>
                             </div>
                           </div>
                           <span className="text-xs text-muted-foreground">
                             {feedback.createdAt ? formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true }) : 'Unknown date'}
                           </span>
                         </div>
                        
                        <div className="bg-blue-50 p-3 rounded mb-3">
                          <p className="text-sm">{feedback.comment}</p>
                        </div>
                        
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          <strong>Related to:</strong> {feedback.messageContent.substring(0, 100)}
                          {feedback.messageContent.length > 100 && "..."}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Usage Analytics</CardTitle>
              <CardDescription>
                Most referenced documents in AI responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentUsage.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No document usage data</h3>
                  <p className="text-muted-foreground">
                    Document usage analytics will appear here once users start querying the AI.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {documentUsage.map((doc, index) => (
                      <div key={doc.documentId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-primary">#{index + 1}</span>
                            <div>
                              <h4 className="font-medium">{doc.documentName}</h4>
                              <p className="text-sm text-muted-foreground">{doc.fileType}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{doc.usageCount}</div>
                            <p className="text-xs text-muted-foreground">references</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last used: {doc.lastUsed ? formatDistanceToNow(new Date(doc.lastUsed), { addSuffix: true }) : 'Never'}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Popular Queries</CardTitle>
              <CardDescription>
                Most frequently asked questions and prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {popularQueries.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No popular queries yet</h3>
                  <p className="text-muted-foreground">
                    Popular queries will appear here once users start asking similar questions.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {popularQueries.map((query, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-bold text-primary">#{index + 1}</span>
                              <Badge variant="secondary">{query.count} times</Badge>
                            </div>
                            <p className="text-sm">{query.query}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last asked: {formatDistanceToNow(new Date(query.lastUsed), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>
                Most active users and their engagement levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No user activity data</h3>
                  <p className="text-muted-foreground">
                    User activity will appear here once users start interacting with the system.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {userActivity.map((user, index) => (
                      <div key={user.userId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary">#{index + 1}</span>
                            {user.userImage && (
                              <img 
                                src={user.userImage} 
                                alt={user.userName || 'User'} 
                                className="h-8 w-8 rounded-full"
                              />
                            )}
                            <div>
                              <h4 className="font-medium">{user.userName || 'Anonymous User'}</h4>
                              <a 
                                href={`mailto:${user.userEmail}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {user.userEmail}
                              </a>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              <span className="font-semibold">{user.messagesCount}</span> messages
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold">{user.feedbackCount}</span> feedback
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last activity: {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>
                  How users are rating AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackStats.ratingDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rating data available</p>
                ) : (
                  <div className="space-y-2">
                    {feedbackStats.ratingDistribution.map((dist) => (
                      <div key={dist.rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-20">
                          {dist.rating > 0 ? <ThumbsUp className="h-3 w-3 text-green-500" /> : <ThumbsDown className="h-3 w-3 text-red-500" />}
                          <span className="text-sm">{dist.rating > 0 ? "+" : ""}{dist.rating}</span>
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${dist.rating > 0 ? "bg-green-500" : "bg-red-500"}`}
                            style={{ 
                              width: `${feedbackStats.totalFeedback > 0 ? (dist.count / feedbackStats.totalFeedback) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{dist.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Trends</CardTitle>
                <CardDescription>
                  Recent feedback patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Feedback Rate</span>
                    <span className="text-sm font-medium">
                      {feedbackStats.totalFeedback > 0 ? "Active" : "Low"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">User Engagement</span>
                    <span className="text-sm font-medium">
                      {((feedbackWithComments.length / Math.max(feedbackStats.totalFeedback, 1)) * 100).toFixed(0)}% leave comments
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Satisfaction</span>
                    <span className={`text-sm font-medium ${feedbackStats.averageRating >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {feedbackStats.averageRating >= 0 ? "Positive" : "Needs Improvement"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Feedback Detail Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-2xl">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getRatingBadge(selectedFeedback.rating)}
                  Feedback Details
                </DialogTitle>
                <DialogDescription>
                  Feedback from user regarding AI response
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {selectedFeedback.userImage && (
                    <img 
                      src={selectedFeedback.userImage} 
                      alt={selectedFeedback.userName || 'User'} 
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium">
                      {selectedFeedback.userName || 'Anonymous User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <a 
                        href={`mailto:${selectedFeedback.userEmail}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedFeedback.userEmail}
                      </a>
                      {" • "}
                      {selectedFeedback.createdAt ? formatDistanceToNow(new Date(selectedFeedback.createdAt), { addSuffix: true }) : 'Unknown date'}
                    </div>
                  </div>
                </div>
                
                {selectedFeedback.comment && (
                  <div>
                    <h4 className="font-semibold mb-2">User Comment</h4>
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      {selectedFeedback.comment}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">AI Response</h4>
                  <ScrollArea className="h-32 w-full border rounded p-3">
                    <div className="text-sm whitespace-pre-wrap">
                      {selectedFeedback.messageContent}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Message ID:</strong> {selectedFeedback.messageId}
                  </div>
                  <div>
                    <strong>Feedback ID:</strong> {selectedFeedback.id}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 