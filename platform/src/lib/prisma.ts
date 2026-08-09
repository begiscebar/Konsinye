import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Fields safe to serialize back to a client. Always select this explicitly
 * (or spread it into a `select`) instead of returning a raw `User` record —
 * a bare `prisma.user.findMany()`/`.create()` result includes `passwordHash`
 * (a bcrypt hash, but still a credential) and must never reach an API
 * response or log line.
 */
export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  companyId: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;
