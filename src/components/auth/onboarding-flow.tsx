"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, Users, Shield, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
  availableTenants?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-bancon-navy mx-auto mb-4 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Welcome to bAxis!</CardTitle>
        <CardDescription>
          Let's get you set up with the right access and permissions for your role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Your account has been created successfully</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>You've been assigned a default user role</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-gray-300" />
            <span className="text-muted-foreground">Next: Choose your workspace access</span>
          </div>
        </div>
        
        <div className="text-center">
          <Button onClick={onNext} className="btn-bancon">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleExplanationStep({ onNext }: { onNext: () => void }) {
  const roles = [
    {
      name: "Viewer",
      icon: Eye,
      color: "bg-blue-50 border-blue-200 text-blue-700",
      description: "Read-only access to content and basic features",
      permissions: ["View documents", "Read conversations", "Use AI features"]
    },
    {
      name: "Contributor", 
      icon: Users,
      color: "bg-green-50 border-green-200 text-green-700",
      description: "Create and edit content, collaborate with others",
      permissions: ["All Viewer permissions", "Upload documents", "Create content", "Manage personas"]
    },
    {
      name: "Administrator",
      icon: Shield,
      color: "bg-purple-50 border-purple-200 text-purple-700",
      description: "Full control over workspace and user management",
      permissions: ["All Contributor permissions", "Manage users", "Configure settings", "Advanced analytics"]
    }
  ];

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Understanding Roles & Permissions</CardTitle>
        <CardDescription>
          Here's what each role can do within bAxis workspaces
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.name} className="border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <Badge className={role.color}>
                    {role.name.toLowerCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {role.description}
                  </p>
                  <div className="space-y-1">
                    {role.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="text-center">
          <Button onClick={onNext} className="btn-bancon">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionStep() {
  const router = useRouter();

  const handleComplete = () => {
    toast.success("Welcome to bAxis! Redirecting to your dashboard...");
    setTimeout(() => {
      router.push("/workspaces");
    }, 1500);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">You're All Set!</CardTitle>
        <CardDescription>
          Your account is ready and you can start using bAxis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You've been assigned the default <Badge variant="secondary">User</Badge> role.
            </p>
            <p className="text-sm text-muted-foreground">
              Workspace administrators can upgrade your permissions as needed.
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <Button onClick={handleComplete} className="btn-bancon">
            Enter bAxis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingFlow({ userId, userEmail }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome",
      description: "Get started with bAxis",
      component: WelcomeStep,
    },
    {
      id: "roles",
      title: "Roles & Permissions",
      description: "Understand access levels",
      component: RoleExplanationStep,
    },
    {
      id: "complete",
      title: "Complete",
      description: "You're ready to go!",
      component: CompletionStep,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#F4F7FA] to-[#FFFFFF] py-8">
      <div className="container mx-auto px-4">
        {/* Progress Header */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-bancon-navy mb-2">Setup Your Account</h1>
            <p className="text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            {steps.map((step, index) => (
              <span 
                key={step.id}
                className={index <= currentStep ? "text-primary font-medium" : ""}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Current Step */}
        <CurrentStepComponent onNext={handleNext} />
      </div>
    </div>
  );
} 