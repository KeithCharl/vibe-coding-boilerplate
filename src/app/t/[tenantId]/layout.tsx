import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { getCurrentUserRole } from "@/server/actions/user-management";
import { redirect } from "next/navigation";
import { SidebarLayout } from "@/components/sidebar-layout";

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
  const currentUserRole = await getCurrentUserRole();

  if (!currentTenant) {
    redirect("/");
  }

  return (
    <SidebarLayout
      user={session.user}
      userTenants={userTenants}
      currentTenantId={tenantId}
      globalRole={currentUserRole?.globalRole}
    >
      {children}
    </SidebarLayout>
  );
} 