import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { TenantDashboard } from "@/components/tenant/tenant-dashboard";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userTenants = await getUserTenants();

  return (
    <TenantDashboard 
      userTenants={userTenants} 
      userEmail={session.user.email || ""} 
    />
  );
}
