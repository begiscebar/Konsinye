import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["TRUCK_OWNER", "BROKER", "DISPATCHER"]),
  companyName: z.string().min(2),
  companyType: z.enum(["CARRIER", "BROKER", "DISPATCH_ORG"]),
});

/**
 * Public self-signup for Truck Owners, Brokers and Dispatchers. New users
 * (and their new company, if any) start PENDING and require Super Admin
 * approval before they can sign in — see /api/users/[id] for approval.
 *
 * Note: `role` is a closed zod enum of exactly these three values — there
 * is no code path here (or anywhere else reachable pre-auth) that can set
 * role to SUPER_ADMIN or DRIVER from a public request.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const user = await prisma.$transaction(async (tx) => {
      // Company + user are created together so a race between two
      // concurrent signups for the same email (both passing an initial
      // existence check before either commits) can't leave an orphaned
      // Company row behind — the unique constraint on User.email inside
      // this same transaction rejects the loser atomically.
      const company = await tx.company.create({
        data: { name: data.companyName, type: data.companyType, status: "PENDING" },
      });

      return tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash: await hashPassword(data.password),
          role: data.role,
          status: "PENDING",
          companyId: company.id,
        },
      });
    });

    await logAudit({
      actorUserId: user.id,
      action: "USER_SELF_REGISTERED",
      entityType: "User",
      entityId: user.id,
      metadata: { companyId: user.companyId, role: data.role },
    });

    return NextResponse.json({
      message: "Account created. An administrator must approve it before you can sign in.",
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
