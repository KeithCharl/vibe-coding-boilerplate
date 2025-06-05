"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Building2,
  Plus,
  LogOut,
  Menu,
  UserCog,
  Globe,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppSidebarProps {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userTenants?: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: "viewer" | "contributor" | "admin";
  }>;
  currentTenantId?: string;
}

export function AppSidebar({ user, userTenants = [], currentTenantId }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const currentTenant = userTenants.find(t => t.tenantId === currentTenantId);

  const navigationItems = [
    {
      title: "Chat",
      icon: MessageSquare,
      href: `/t/${currentTenantId}/chat`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "Knowledge Base",
      icon: BookOpen,
      href: `/t/${currentTenantId}/kb`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "Web Analysis",
      icon: Globe,
      href: `/t/${currentTenantId}/web-analysis`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "Personas",
      icon: UserCog,
      href: `/t/${currentTenantId}/personas`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "Users",
      icon: Users,
      href: `/t/${currentTenantId}/users`,
      roles: ["admin"],
    },
    {
      title: "Analytics",
      icon: BarChart3,
      href: `/t/${currentTenantId}/analytics`,
      roles: ["contributor", "admin"],
    },
    {
      title: "Settings",
      icon: Settings,
      href: `/t/${currentTenantId}/settings`,
      roles: ["admin"],
    },
  ];

  const hasPermission = (requiredRoles: string[]) => {
    return currentTenant?.role && requiredRoles.includes(currentTenant.role);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">
                      {currentTenant?.tenantName || "Select Tenant"}
                    </span>
                  </div>
                  <Menu className="h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Building2 className="h-4 w-4 mr-2" />
                    View All Tenants
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {userTenants.map((tenant) => (
                  <DropdownMenuItem key={tenant.tenantId} asChild>
                    <Link href={`/t/${tenant.tenantId}`}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tenant.tenantName}</span>
                        <span className="text-xs text-muted-foreground">
                          {tenant.role}
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/create-tenant">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigationItems
            .filter(item => hasPermission(item.roles))
            .map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback>
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.name || user?.email}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
} 