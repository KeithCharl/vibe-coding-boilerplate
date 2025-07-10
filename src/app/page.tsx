import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserTenants } from "@/server/actions/auth";
import { getSerializableAgents, type SerializableAgent } from "@/server/actions/agents";
import { LandingPage } from "@/components/landing-page";

export default async function HomePage() {
  // Get session data on the server side
  const session = await getServerSession(authOptions);
  
  // Always show the agent subscription landing page as the main landing page
  // Pass session data as props instead of using useSession client-side
  return <LandingPage session={session} />;
}
