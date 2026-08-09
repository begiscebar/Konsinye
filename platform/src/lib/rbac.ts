import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { InvalidTransitionError } from "@/lib/loadStateMachine";

export class ForbiddenError extends Error {}
export class UnauthorizedError extends Error {}
/** Thrown when a concurrent/stale write loses a race (e.g. an offer already
 * resolved, a truck/driver already booked). Maps to HTTP 409. */
export class ConflictError extends Error {}

/** Throws if there is no session, or the session's role isn't in `roles`. */
export function requireRole(session: Session | null, roles: Session["user"]["role"][]) {
  if (!session?.user) throw new UnauthorizedError("Not signed in");
  if (session.user.status !== "ACTIVE") throw new ForbiddenError("Account not active");
  if (!roles.includes(session.user.role)) throw new ForbiddenError("Insufficient role");
  return session.user;
}

/** Throws if there is no session at all (any active role is fine). */
export function requireSession(session: Session | null) {
  if (!session?.user) throw new UnauthorizedError("Not signed in");
  if (session.user.status !== "ACTIVE") throw new ForbiddenError("Account not active");
  return session.user;
}

export const isSuperAdmin = (user: Session["user"]) => user.role === "SUPER_ADMIN";

/**
 * Tenancy guard: Super Admin sees everything. Every other role is scoped to
 * their own companyId. Call this to build a `where` clause fragment for any
 * company-owned table (Truck, Document w/ ownerCompanyId, etc.) — never trust
 * a client-supplied companyId.
 */
export function companyScope(user: Session["user"]) {
  if (isSuperAdmin(user)) return {};
  if (!user.companyId) return { id: "__no_company__" }; // no company => sees nothing
  return { companyId: user.companyId };
}

export function handleApiError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof ConflictError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  if (err instanceof InvalidTransitionError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
