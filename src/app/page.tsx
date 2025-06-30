import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { TenantDashboard } from "@/components/tenant/tenant-dashboard";
import { LandingPage } from "@/components/landing-page";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, show the dashboard
  if (session?.user) {
    const userTenants = await getUserTenants();
    return (
      <TenantDashboard 
        userTenants={userTenants} 
        userEmail={session.user.email || ""} 
      />
    );
  }

  // If user is not authenticated, show the landing page
  return <LandingPage />;
}
