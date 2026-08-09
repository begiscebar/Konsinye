import type { LoadStatus, UserRole } from "@prisma/client";

/** Legal next-states from a given status. Terminal states have none. */
export const LOAD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  AVAILABLE: ["OFFERED", "CANCELLED"],
  OFFERED: ["ACCEPTED", "REJECTED", "AVAILABLE", "CANCELLED"],
  ACCEPTED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["DRIVER_CONFIRMED", "CANCELLED"],
  DRIVER_CONFIRMED: ["AT_PICKUP", "DELAYED", "CANCELLED"],
  AT_PICKUP: ["LOADED", "DELAYED"],
  LOADED: ["IN_TRANSIT", "DELAYED"],
  IN_TRANSIT: ["AT_DELIVERY", "DELAYED", "DISPUTED"],
  AT_DELIVERY: ["DELIVERED", "DELAYED"],
  DELIVERED: ["POD_UPLOADED", "DISPUTED"],
  POD_UPLOADED: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAID", "DISPUTED"],
  PAID: [],
  CANCELLED: [],
  REJECTED: ["AVAILABLE"],
  DISPUTED: ["IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"],
  DELAYED: ["AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DELIVERY"],
};

/** Which roles are allowed to move a load INTO a given status. Super Admin can always do it. */
export const STATUS_SET_BY_ROLE: Partial<Record<LoadStatus, UserRole[]>> = {
  AVAILABLE: ["BROKER", "DISPATCHER"],
  OFFERED: ["DISPATCHER"],
  ACCEPTED: ["TRUCK_OWNER"],
  REJECTED: ["TRUCK_OWNER"],
  ASSIGNED: ["TRUCK_OWNER"],
  DRIVER_CONFIRMED: ["DRIVER"],
  AT_PICKUP: ["DRIVER"],
  LOADED: ["DRIVER"],
  IN_TRANSIT: ["DRIVER"],
  AT_DELIVERY: ["DRIVER"],
  DELIVERED: ["DRIVER"],
  POD_UPLOADED: ["DRIVER", "TRUCK_OWNER"],
  COMPLETED: ["DISPATCHER"],
  PAYMENT_PENDING: ["SUPER_ADMIN"],
  PAID: ["SUPER_ADMIN"],
  CANCELLED: ["DISPATCHER", "BROKER"],
  DISPUTED: ["DISPATCHER", "BROKER", "TRUCK_OWNER"],
  DELAYED: ["DRIVER", "DISPATCHER"],
};

export class InvalidTransitionError extends Error {}

export function assertValidTransition(current: LoadStatus, target: LoadStatus, role: UserRole) {
  // No same-status shortcut: re-submitting the current status must be
  // rejected, not silently accepted, because several targets (PAID,
  // COMPLETED) have side effects (payment timestamps, commission
  // recomputation) that must never re-run, and a same-status no-op would
  // otherwise skip the STATUS_SET_BY_ROLE check below entirely.
  const allowedNext = LOAD_TRANSITIONS[current] ?? [];
  if (!allowedNext.includes(target)) {
    throw new InvalidTransitionError(`Cannot move a load from ${current} to ${target}`);
  }
  if (role === "SUPER_ADMIN") return;
  const allowedRoles = STATUS_SET_BY_ROLE[target];
  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new InvalidTransitionError(`Role ${role} may not set status ${target}`);
  }
}

/**
 * These transitions have side effects (setting carrierCompanyId, resolving
 * a LoadOffer, assigning truck/driver) that only their dedicated endpoints
 * perform — /api/loads/[id]/offers, /api/offers/[id]/respond and
 * /api/loads/[id]/assign. The generic status endpoint must reject them so
 * a load can't reach ACCEPTED/ASSIGNED without those side effects running.
 */
export const STATUSES_REQUIRING_DEDICATED_ENDPOINT: LoadStatus[] = ["ACCEPTED", "REJECTED", "ASSIGNED"];

export const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  "OFFERED",
  "ACCEPTED",
  "ASSIGNED",
  "DRIVER_CONFIRMED",
  "AT_PICKUP",
  "LOADED",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
  "POD_UPLOADED",
];

export const CLOSED_LOAD_STATUSES: LoadStatus[] = [
  "COMPLETED",
  "PAYMENT_PENDING",
  "PAID",
  "CANCELLED",
  "REJECTED",
];
