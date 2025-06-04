import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { tenantId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userTenants = await getUserTenants();
  const currentTenant = userTenants.find(t => t.tenantId === tenantId);

  if (!currentTenant) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={session.user}
        userTenants={userTenants}
        currentTenantId={tenantId}
      />
      <SidebarInset>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 