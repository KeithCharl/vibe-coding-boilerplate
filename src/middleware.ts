import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes protection
    if (pathname.startsWith("/admin")) {
      const globalRole = token?.globalRole as string;
      
      if (!globalRole || !["super_admin", "tenant_admin"].includes(globalRole)) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Super admin only routes
      if (pathname.includes("/admin/users") || pathname.includes("/admin/settings")) {
        if (globalRole !== "super_admin") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      }
    }

    // Tenant routes protection
    if (pathname.startsWith("/t/")) {
      // Extract tenant ID from path
      const tenantId = pathname.split("/")[2];
      
      if (!tenantId) {
        return NextResponse.redirect(new URL("/workspaces", req.url));
      }

      // Additional tenant-specific checks could be added here
      // For now, we rely on server-side checks in the page components
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages and API routes
        if (
          pathname.startsWith("/auth") ||
          pathname.startsWith("/api/auth") ||
          pathname === "/"
        ) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 