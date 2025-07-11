"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect, useState } from "react";

interface SidebarLayoutProps {
  children: React.ReactNode;
  user: any;
  userTenants: any[];
  currentTenantId: string;
  globalRole: "super_admin" | "tenant_admin" | "user" | undefined;
}

export function SidebarLayout({
  children,
  user,
  userTenants,
  currentTenantId,
  globalRole,
}: SidebarLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering during SSR
  if (!mounted) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r" style={{ backgroundColor: '#F4F7FA' }}>
          {/* Placeholder for sidebar during SSR */}
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        userTenants={userTenants}
        currentTenantId={currentTenantId}
        globalRole={globalRole}
      />
      <SidebarInset>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 