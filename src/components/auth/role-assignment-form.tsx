"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Users, Eye, Settings, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { assignTenantRole, type TenantRole } from "@/server/actions/user-management";

interface RoleOption {
  value: TenantRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  permissions: string[];
}

const roleOptions: RoleOption[] = [
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access to content and basic features",
    icon: Eye,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    permissions: [
      "View documents and knowledge base",
      "Read chat conversations",
      "Access basic analytics",
      "Use AI features for queries"
    ]
  },
  {
    value: "contributor",
    label: "Contributor", 
    description: "Can create and edit content, collaborate with team",
    icon: Users,
    color: "bg-green-50 border-green-200 text-green-700",
    permissions: [
      "All Viewer permissions",
      "Upload and edit documents",
      "Create and manage personas",
      "Manage prompts and templates",
      "Collaborate in teams"
    ]
  },
  {
    value: "admin",
    label: "Administrator",
    description: "Full control over workspace and user management",
    icon: Shield,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    permissions: [
      "All Contributor permissions",
      "Manage users and roles",
      "Configure workspace settings",
      "Access advanced analytics",
      "Manage integrations and agents"
    ]
  }
];

interface RoleAssignmentFormProps {
  tenantId: string;
  userId: string;
  currentRole?: TenantRole;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RoleAssignmentForm({
  tenantId,
  userId,
  currentRole,
  onSuccess,
  onCancel,
}: RoleAssignmentFormProps) {
  const [selectedRole, setSelectedRole] = useState<TenantRole>(currentRole || "viewer");
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    try {
      setIsSubmitting(true);
      
      await assignTenantRole({
        userId,
        tenantId,
        role: selectedRole,
      });

      toast.success(`Role ${currentRole ? 'updated' : 'assigned'} successfully`);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      toast.error("Failed to assign role", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          {currentRole ? 'Update User Role' : 'Assign User Role'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Select the appropriate role for this user within this workspace.
        </p>
      </div>

      <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as TenantRole)}>
        <div className="space-y-3">
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.value;
            
            return (
              <div key={option.value} className="relative">
                <Label
                  htmlFor={option.value}
                  className={`cursor-pointer block p-4 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{option.label}</span>
                        <Badge className={option.color}>
                          {option.value}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Permissions:
                        </span>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {option.permissions.map((permission, index) => (
                            <li key={index} className="flex items-center space-x-1">
                              <ChevronRight className="h-3 w-3" />
                              <span>{permission}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>

      {(selectedRole === "admin" || currentRole === "admin") && (
        <div className="space-y-2">
          <Label htmlFor="justification">Justification (Optional)</Label>
          <Textarea
            id="justification"
            placeholder="Provide a reason for this role assignment..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
                      variant="ghost"
            className="btn-bancon-primary"
        >
          {isSubmitting ? "Assigning..." : (currentRole ? "Update Role" : "Assign Role")}
        </Button>
      </div>
    </div>
  );
} 