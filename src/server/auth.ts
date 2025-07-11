import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { type JWT } from "next-auth/jwt";

import { db } from "@/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  globalUserRoles,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Environment variable validation
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET must be set in production");
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️  NEXTAUTH_SECRET not set. Using development fallback. Please create a .env file with NEXTAUTH_SECRET for security.");
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      globalRole?: string;
    } & DefaultSession["user"];
  }

  interface User {
    globalRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    globalRole?: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      try {
        // If this is a sign-in, get the user's global role
        if (user) {
          const userRole = await db
            .select({ role: globalUserRoles.role })
            .from(globalUserRoles)
            .where(eq(globalUserRoles.userId, user.id))
            .limit(1);

          token.globalRole = userRole[0]?.role || "user";
        }

        // If session is being updated, refresh the role
        if (trigger === "update" && token.sub) {
          const userRole = await db
            .select({ role: globalUserRoles.role })
            .from(globalUserRoles)
            .where(eq(globalUserRoles.userId, token.sub))
            .limit(1);

          token.globalRole = userRole[0]?.role || "user";
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        // On JWT error, return a minimal valid token
        return {
          sub: token.sub || user?.id || "unknown",
          email: token.email || user?.email,
          name: token.name || user?.name,
          globalRole: "user",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
        };
      }
    },
    session: ({ session, token }) => {
      try {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub!,
            globalRole: token.globalRole || "user",
          },
        };
      } catch (error) {
        console.error("Session callback error:", error);
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub || session.user?.email || "unknown",
            globalRole: "user",
          },
        };
      }
    },
    redirect({ url, baseUrl }) {
      // If the callback URL is relative, prepend the base URL
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If the url is absolute but on the same site, leave it as is
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Otherwise, redirect to the home page
      return baseUrl;
    },
  },
  events: {
    signIn: async ({ user, account, profile }) => {
      // Log successful sign-in for audit purposes
      console.log(`User ${user.email} signed in via ${account?.provider}`);
    },
    createUser: async ({ user }) => {
      // Assign default global role to new users
      try {
        const existingRole = await db
          .select()
          .from(globalUserRoles)
          .where(eq(globalUserRoles.userId, user.id))
          .limit(1);

        if (existingRole.length === 0) {
          await db.insert(globalUserRoles).values({
            userId: user.id,
            role: "user", // Default role for new users
          });
          
          console.log(`Assigned default role 'user' to new user ${user.email}`);
        }
      } catch (error) {
        console.error("Failed to assign global role to new user:", error);
      }
    },
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
