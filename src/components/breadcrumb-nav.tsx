"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/" className="flex items-center gap-1 hover:text-foreground">
          <Home className="h-4 w-4" />
          <span>All Tenants</span>
        </Link>
      </Button>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {item.href ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            </Button>
          ) : (
            <span className="text-foreground font-medium px-2 py-1">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
} 