import { getTenant } from "@/server/actions/auth";
import { requireAuth } from "@/server/actions/auth";
import { TenantSettingsForm } from "@/components/tenant/tenant-settings-form";
import { Settings, Building2 } from "lucide-react";

interface TenantSettingsPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantSettingsPage({ params }: TenantSettingsPageProps) {
  const { tenantId } = await params;
  
  // Ensure user is admin of this tenant
  await requireAuth(tenantId, "admin");

  // Get tenant details
  const tenant = await getTenant(tenantId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage tenant configuration and details
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Tenant Details</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Update basic information about your tenant
          </p>
        </div>

        <TenantSettingsForm tenant={tenant} />
      </div>
    </div>
  );
} 