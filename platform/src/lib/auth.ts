import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      status: UserStatus;
      companyId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    companyId: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Absolute JWT lifetime. Combined with the DB re-check below, this
    // bounds how long a suspended/deleted account's existing session can
    // keep working even in the worst case (e.g. if the re-check itself
    // were ever bypassed) to at most a day, not NextAuth's 30-day default.
    maxAge: 24 * 60 * 60,
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        // Throttle by account, independent of source IP (which an attacker
        // can rotate trivially) — blunts credential-stuffing/brute-force
        // against a single email without needing a shared cache in this
        // single-instance MVP.
        const rl = checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        if (!rl.allowed) {
          throw new Error("Too many sign-in attempts. Try again in a few minutes.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Fail closed: only an ACTIVE account may sign in. This used to be
        // a blocklist (reject SUSPENDED/REJECTED) which let PENDING users
        // sign in — every subsequent API call still correctly rejected
        // them (requireSession checks status === "ACTIVE"), but the
        // account shouldn't be issued a session at all before approval,
        // and a future status value must be denied by default, not
        // allowed by omission.
        if (user.status !== "ACTIVE") {
          throw new Error(
            user.status === "PENDING"
              ? "Your account is awaiting administrator approval."
              : "Your account is not active. Contact your administrator."
          );
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          companyId: user.companyId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: `authorize()` already checked status/credentials.
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.status = u.status;
        token.companyId = u.companyId;
        return token;
      }

      // Every subsequent request re-reads role/status/companyId from the
      // database instead of trusting the stale claims baked into the JWT at
      // login. Without this, an admin suspending a user (or changing their
      // role/company) has no effect until that user's token happens to
      // expire — up to `maxAge` later — because JWT sessions are otherwise
      // stateless and never consult the DB again after sign-in.
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, status: true, companyId: true },
        });
        if (current) {
          token.role = current.role;
          token.status = current.status;
          token.companyId = current.companyId;
        } else {
          // User no longer exists — force every subsequent authz check to fail closed.
          token.status = "SUSPENDED";
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.status = token.status;
      session.user.companyId = token.companyId;
      return session;
    },
  },
};

/** Server-side session helper for use in Route Handlers / Server Components. */
export function auth() {
  return getServerSession(authOptions);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

/**
 * Guards a role-scoped dashboard layout: not signed in -> /login; wrong
 * role -> home; signed in with the right role but not ACTIVE (pending
 * approval, suspended, rejected) -> /login. Every role layout must call
 * this rather than checking `role` alone — several pages under these
 * layouts are Server Components that query Prisma directly and have no
 * other gate (no requireSession call of their own), so this is the only
 * check standing between a suspended user and that page's data.
 */
export async function requireDashboardAccess(allowedRoles: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!allowedRoles.includes(session.user.role) && session.user.role !== "SUPER_ADMIN") redirect("/");
  if (session.user.status !== "ACTIVE") redirect("/login");
  return session;
}
