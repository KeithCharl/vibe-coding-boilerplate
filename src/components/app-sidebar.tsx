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
  LayoutDashboard,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
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
import { ModeToggle } from "@/components/mode-toggle";

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
  globalRole?: "super_admin" | "tenant_admin" | "user";
}

export function AppSidebar({ user, userTenants = [], currentTenantId, globalRole }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['knowledge-repository']) // Knowledge Repository starts expanded
  );

  const currentTenant = userTenants.find(t => t.tenantId === currentTenantId);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  interface NavigationItem {
    title: string;
    icon: any;
    href: string;
    roles: string[];
    isMainDashboard?: boolean;
    sectionId?: string; // For collapsible sections
    subItems?: Array<{
      title: string;
      href: string;
      roles: string[];
    }>;
  }

  const navigationItems: NavigationItem[] = [
    {
      title: "All Workspaces",
      icon: Building2,
      href: "/",
      roles: ["viewer", "contributor", "admin"],
      isMainDashboard: true,
    },
    {
      title: "Workspace Overview",
      icon: LayoutDashboard,
      href: `/t/${currentTenantId}`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "AI Assistant",
      icon: MessageSquare,
      href: `/t/${currentTenantId}/chat`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "bSmart Agents",
      icon: Shield,
      href: `/t/${currentTenantId}/agents`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "Knowledge Repository",
      icon: BookOpen,
      href: `/t/${currentTenantId}/kb`,
      roles: ["viewer", "contributor", "admin"],
      sectionId: "knowledge-repository",
      subItems: [
        {
          title: "Document Library",
          href: `/t/${currentTenantId}/kb`,
          roles: ["viewer", "contributor", "admin"],
        },
        {
          title: "AI Knowledge Agent",
          href: `/t/${currentTenantId}/kb/agent`,
          roles: ["viewer", "contributor", "admin"],
        },
        {
          title: "Reference Management",
          href: `/t/${currentTenantId}/kb/references`,
          roles: ["contributor", "admin"],
        },
      ],
    },
    {
      title: "Web Intelligence",
      icon: Globe,
      href: `/t/${currentTenantId}/web-analysis`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "AI Personas",
      icon: UserCog,
      href: `/t/${currentTenantId}/personas`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "Prompt Templates",
      icon: FileText,
      href: `/t/${currentTenantId}/prompts`,
      roles: ["viewer", "contributor", "admin"],
    },
    {
      title: "User Management",
      icon: Users,
      href: `/t/${currentTenantId}/users`,
      roles: ["admin"],
    },
    {
      title: "Business Analytics",
      icon: BarChart3,
      href: `/t/${currentTenantId}/analytics`,
      roles: ["contributor", "admin"],
    },
    {
      title: "System Configuration",
      icon: Settings,
      href: `/t/${currentTenantId}/settings`,
      roles: ["admin"],
    },
  ];

  const hasPermission = (requiredRoles: string[]) => {
    return currentTenant?.role && requiredRoles.includes(currentTenant.role);
  };

  return (
    <Sidebar collapsible="icon" className="border-r" style={{ backgroundColor: '#F4F7FA' }}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  className="w-full justify-between rounded-xl font-bold"
                  style={{ color: '#002C54' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#002C54' }}
                    >
                      <div className="text-white font-bold text-sm">b</div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold" style={{ color: '#002C54' }}>bSmart</span>
                      <span className="text-xs text-gray-500">by bancon</span>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 rounded-xl border-2" 
                align="start"
                style={{ borderColor: '#00B3B0' }}
              >
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="text-sm font-bold" style={{ color: '#002C54' }}>
                    {currentTenant?.tenantName || "Select Workspace"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentTenant?.role && `Role: ${currentTenant.role}`}
                  </p>
                </div>
                
                {userTenants.map((tenant) => (
                  <DropdownMenuItem 
                    key={tenant.tenantId} 
                    asChild
                    className="rounded-lg m-1 transition-colors hover:bg-bancon-teal/10"
                  >
                    <Link 
                      href={`/t/${tenant.tenantId}`}
                      className="flex items-center gap-2 p-2"
                    >
                      <Building2 className="h-4 w-4" style={{ color: '#00B3B0' }} />
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: '#002C54' }}>
                          {tenant.tenantName}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {tenant.role}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  asChild
                  className="rounded-lg m-1 transition-colors hover:bg-bancon-orange/10"
                >
                  <Link href="/create-tenant" className="flex items-center gap-2 p-2">
                    <Plus className="h-4 w-4" style={{ color: '#FF6B00' }} />
                    <span className="font-bold" style={{ color: '#FF6B00' }}>
                      Create New Workspace
                    </span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item: NavigationItem) => {
            if (!hasPermission(item.roles) && !item.isMainDashboard) {
              return null;
            }

            const isActive = pathname === item.href;
            const isExpanded = item.sectionId ? expandedSections.has(item.sectionId) : false;
            const Icon = item.icon;

            if (item.subItems) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => item.sectionId && toggleSection(item.sectionId)}
                    className="w-full rounded-lg transition-colors hover:bg-bancon-teal/10"
                    style={{ 
                      backgroundColor: isActive ? 'rgba(0, 179, 176, 0.1)' : 'transparent',
                      color: isActive ? '#00B3B0' : '#002C54'
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-bold">{item.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </SidebarMenuButton>
                  
                  {isExpanded && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem: { title: string; href: string; roles: string[] }) => {
                        if (!hasPermission(subItem.roles)) return null;
                        
                        const isSubActive = pathname === subItem.href;
                        
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton 
                              asChild
                              className="rounded-lg transition-colors hover:bg-bancon-teal/10"
                              style={{ 
                                backgroundColor: isSubActive ? 'rgba(0, 179, 176, 0.1)' : 'transparent',
                                color: isSubActive ? '#00B3B0' : '#002C54'
                              }}
                            >
                              <Link href={subItem.href}>
                                <span className="font-bold">{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild
                  className="rounded-lg transition-colors hover:bg-bancon-teal/10"
                  style={{ 
                    backgroundColor: isActive ? 'rgba(0, 179, 176, 0.1)' : 'transparent',
                    color: isActive ? '#00B3B0' : '#002C54'
                  }}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span className="font-bold">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }).filter(Boolean)}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  className="rounded-lg transition-colors hover:bg-bancon-teal/10"
                  style={{ color: '#002C54' }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback 
                      className="text-white font-bold text-xs"
                      style={{ backgroundColor: '#002C54' }}
                    >
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-bold truncate">
                    {user?.name || user?.email || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 rounded-xl border-2" 
                align="end"
                style={{ borderColor: '#00B3B0' }}
              >
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="text-sm font-bold" style={{ color: '#002C54' }}>
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email}
                  </p>
                </div>
                
                <DropdownMenuItem 
                  className="rounded-lg m-1 transition-colors hover:bg-bancon-teal/10"
                  disabled
                >
                  <UserCog className="h-4 w-4 mr-2" style={{ color: '#00B3B0' }} />
                  <span className="font-bold" style={{ color: '#002C54' }}>Account Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="rounded-lg m-1 transition-colors hover:bg-bancon-teal/10">
                  <ModeToggle />
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg m-1 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="font-bold">Sign Out</span>
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