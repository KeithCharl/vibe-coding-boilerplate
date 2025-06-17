"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, X, Info } from "lucide-react";

interface SSODetectionBannerProps {
  url: string;
  onDismiss?: () => void;
}

export function SSODetectionBanner({ url, onDismiss }: SSODetectionBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isInternalDomain, setIsInternalDomain] = useState(false);

  useEffect(() => {
    // Check if this is an internal domain
    const checkInternalDomain = async () => {
      try {
        const { isInternalDomain: checkInternal } = await import("@/lib/internal-sso-auth");
        const isInternal = checkInternal(url);
        setIsInternalDomain(isInternal);
        setIsVisible(isInternal);
      } catch (error) {
        console.error('Failed to check internal domain:', error);
      }
    };

    if (url) {
      checkInternalDomain();
    }
  }, [url]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !isInternalDomain) {
    return null;
  }

  const domain = new URL(url).hostname;

  return (
    <Card className="border-blue-200 bg-blue-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Automatic SSO Available
              </span>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              <strong>{domain}</strong> appears to be an internal website that supports 
              Single Sign-On (SSO). The system can automatically authenticate using your 
              current session without requiring manual credentials.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                ✅ Auto-authentication enabled
              </span>
              <span className="text-xs text-blue-600">
                Supports: Google SSO, Office 365, and other providers
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 