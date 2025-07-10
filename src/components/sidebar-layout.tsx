"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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