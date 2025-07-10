import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { getSerializableAgents, type SerializableAgent } from "@/server/actions/agents";
import { TenantSelector } from "@/components/agents/tenant-selector";
import { redirect } from "next/navigation";

export default async function WorkspacesPage() {
  const session = await getServerSession(authOptions);

  // Redirect to home if not authenticated
  if (!session?.user) {
    redirect("/");
  }

  // Get user's tenants and available agents
  const userTenants = await getUserTenants();
  let availableAgents: SerializableAgent[] = [];
  
  try {
    availableAgents = await getSerializableAgents();
  } catch (error) {
    console.error("Failed to get available agents:", error);
    availableAgents = [];
  }

  // If user has no tenants, redirect to tenant creation
  if (userTenants.length === 0) {
    redirect("/create-tenant");
  }

  // If user has only one tenant, redirect directly to it
  if (userTenants.length === 1) {
    redirect(`/t/${userTenants[0].tenantId}`);
  }

  // Show tenant selector for multiple tenants
  return (
    <TenantSelector
      userTenants={userTenants}
      availableAgents={availableAgents}
      userEmail={session.user.email || ""}
    />
  );
} 