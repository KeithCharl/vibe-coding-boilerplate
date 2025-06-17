import { use } from "react";
import { fixExistingReference } from "@/server/actions/fix-reference";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function SimpleFixPage({ params }: PageProps) {
  const { tenantId } = use(params);

  try {
    const result = await fixExistingReference();
    console.log("Reference fixed:", result);
  } catch (error) {
    console.error("Error:", error);
  }

  // Redirect back to references page
  redirect(`/t/${tenantId}/kb/references`);
} 