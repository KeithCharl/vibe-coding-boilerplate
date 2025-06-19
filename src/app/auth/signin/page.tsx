"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Building2, Shield, CheckCircle, Globe } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export default function SignIn() {
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-6 relative">
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggleButton />
      </div>
      
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Professional Branding Section */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <div className="h-14 w-14 bg-primary rounded-xl flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-foreground">
                  Enterprise Knowledge Platform
                </h1>
                <p className="text-lg text-muted-foreground">
                  AI-Powered Business Intelligence
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Transform Your Organization's Knowledge Management
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Access enterprise-grade knowledge management with AI-powered analytics, 
              secure collaboration tools, and intelligent document processing designed 
              for modern businesses.
            </p>
          </div>

          {/* Enterprise Features */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">
                  Bank-grade encryption and compliance
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Global Scale</h3>
                <p className="text-sm text-muted-foreground">
                  Multi-tenant architecture for teams
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">AI-Powered</h3>
                <p className="text-sm text-muted-foreground">
                  Intelligent insights and automation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Sign-In Form */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md shadow-xl border-border/50">
            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Secure Access Portal
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Authenticate with your organizational credentials to access the platform
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 btn-executive flex items-center justify-center gap-3 text-base"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    width="20"
                    height="20"
                    className="flex-shrink-0"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                  </svg>
                  Continue with Google Workspace
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">
                    Secure Authentication
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Enterprise-Grade Security
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your authentication is protected by industry-standard security protocols 
                      and enterprise-level data encryption.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-0">
              <p className="text-xs text-center w-full text-muted-foreground leading-relaxed">
                By accessing this platform, you acknowledge compliance with your organization's 
                security policies and agree to our{" "}
                <span className="font-medium text-foreground">Terms of Service</span> and{" "}
                <span className="font-medium text-foreground">Privacy Policy</span>.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
