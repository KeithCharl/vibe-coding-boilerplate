"use client";

import { KBTreeNavigation } from "./kb-tree-navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KBSimpleLayoutProps {
  children: React.ReactNode;
  tenantId: string;
  documentCount?: number;
  referenceCount?: number;
  className?: string;
}

export function KBSimpleLayout({
  children,
  tenantId,
  documentCount = 0,
  referenceCount = 0,
  className
}: KBSimpleLayoutProps) {
  return (
    <div className={cn("flex h-screen bg-gray-50 dark:bg-gray-950", className)}>
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="h-full overflow-y-auto">
          <KBTreeNavigation
            tenantId={tenantId}
            documentCount={documentCount}
            referenceCount={referenceCount}
            className="p-4"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
} 