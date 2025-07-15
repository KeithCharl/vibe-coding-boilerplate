"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ClearSessionPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleClearSession = async () => {
    try {
      setIsClearing(true);
      
      // First, sign out from NextAuth
      await signOut({ redirect: false });
      
      // Then call our custom clear session endpoint
      const response = await fetch("/api/auth/clear-session", {
        method: "POST",
      });
      
      if (response.ok) {
        setIsComplete(true);
        toast.success("Session cleared successfully!");
        
        // Wait a moment, then redirect to home
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        throw new Error("Failed to clear session");
      }
      
    } catch (error) {
      console.error("Error clearing session:", error);
      toast.error("Failed to clear session. Please clear your browser cookies manually.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#F4F7FA] to-[#FFFFFF] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 mx-auto mb-4 flex items-center justify-center">
            {isComplete ? (
              <RefreshCw className="h-8 w-8 text-green-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            )}
          </div>
          <CardTitle className="text-2xl">Session Issue Detected</CardTitle>
          <CardDescription>
            {isComplete 
              ? "Your session has been cleared successfully!"
              : "We've detected a corrupted authentication session. This can happen after system updates."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isComplete ? (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Clearing your session will log you out and remove any corrupted authentication data.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">This will:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Clear all authentication cookies</li>
                  <li>• Sign you out of the current session</li>
                  <li>• Allow you to sign in fresh</li>
                </ul>
              </div>

              <Button 
                onClick={handleClearSession}
                disabled={isClearing}
                variant="ghost"
          className="w-full btn-bancon-primary"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing Session...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear Session & Sign In Again
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button variant="link" className="text-sm text-muted-foreground" asChild>
                  <a href="/">Cancel - Back to Home</a>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium">
                Session cleared successfully!
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to the home page...
              </p>
              <div className="animate-pulse">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-green-600" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 