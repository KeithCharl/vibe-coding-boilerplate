import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandIconProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "gradient" | "minimal";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

export function BrandIcon({ size = "md", variant = "default", className }: BrandIconProps) {
  const baseClasses = "rounded-xl flex items-center justify-center";
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    gradient: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg",
    minimal: "bg-primary/10 text-primary border border-primary/20",
  };

  return (
    <div className={cn(baseClasses, sizeClass, variantClasses[variant], className)}>
      <Building2 className={cn(iconSize)} />
    </div>
  );
}

export function BrandLogo({ size = "md", showText = true, className }: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}) {
  const textSizes = {
    sm: "text-lg",
    md: "text-xl", 
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandIcon size={size} variant="gradient" />
      {showText && (
        <div>
          <h1 className={cn("font-bold text-foreground tracking-tight", textSizes[size])}>
            bSmart Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-Powered Business Intelligence
          </p>
        </div>
      )}
    </div>
  );
} 