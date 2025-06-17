"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp,
  Shield,
  Calendar,
  FileText
} from "lucide-react";

interface EnhancedWebAnalysisDashboardProps {
  stats: {
    totalCredentials: number;
    activeCredentials: number;
    totalJobs: number;
    activeJobs: number;
    runningJobs: number;
    totalChanges: number;
    majorChanges: number;
  };
  credentials: Array<{
    id: string;
    domain: string;
    name: string;
    authType: string;
    isActive: boolean;
  }>;
  changes: Array<{
    id: string;
    documentTitle: string | null;
    changeType: string;
    detectedAt: Date | null;
  }>;
}

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  targetTab: string;
}

function QuickActionCard({ icon, title, description, targetTab }: QuickActionCardProps) {
  const handleClick = () => {
    // Find the tab trigger and click it - try multiple selectors
    let tabTrigger = document.querySelector(`[value="${targetTab}"]`) as HTMLButtonElement;
    
    if (!tabTrigger) {
      // Try alternative selectors
      tabTrigger = document.querySelector(`[data-value="${targetTab}"]`) as HTMLButtonElement;
    }
    
    if (!tabTrigger) {
      // Try with role attribute
      tabTrigger = document.querySelector(`[role="tab"][value="${targetTab}"]`) as HTMLButtonElement;
    }
    
    if (tabTrigger) {
      tabTrigger.click();
    } else {
      console.warn(`Could not find tab trigger for: ${targetTab}`);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardContent className="p-4 text-center">
        {icon}
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function EnhancedWebAnalysisDashboard({ 
  stats, 
  credentials, 
  changes 
}: EnhancedWebAnalysisDashboardProps) {
  return (
    <div className="grid gap-6">
      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Overview
          </CardTitle>
          <CardDescription>
            Quick overview of your enhanced web analysis setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Authentication</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Credentials:</span>
                  <span className="font-medium">{stats.totalCredentials}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Credentials:</span>
                  <span className="font-medium">{stats.activeCredentials}</span>
                </div>
                <div className="flex justify-between">
                  <span>Protected Sites:</span>
                  <span className="font-medium">
                    {credentials.map(c => c.domain).filter((domain, index, self) => self.indexOf(domain) === index).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Automation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Jobs:</span>
                  <span className="font-medium">{stats.totalJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Jobs:</span>
                  <span className="font-medium">{stats.activeJobs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Currently Running:</span>
                  <span className="font-medium">{stats.runningJobs}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Recent Activity</h4>
            <div className="space-y-2">
              {changes.slice(0, 5).map((change) => (
                <div key={change.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>{change.documentTitle || 'Untitled'}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-muted-foreground capitalize">{change.changeType}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {change.detectedAt ? new Date(change.detectedAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              ))}
              {changes.length === 0 && (
                <div className="text-sm text-muted-foreground">No recent changes detected</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to get you started with enhanced web analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              icon={<Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />}
              title="Add Credentials"
              description="Set up authentication for protected sites"
              targetTab="credentials"
            />
            
            <QuickActionCard
              icon={<Calendar className="h-8 w-8 mx-auto mb-2 text-green-500" />}
              title="Create Job"
              description="Schedule automated content monitoring"
              targetTab="jobs"
            />
            
            <QuickActionCard
              icon={<FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />}
              title="View Changes"
              description="Monitor content updates and changes"
              targetTab="changes"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 