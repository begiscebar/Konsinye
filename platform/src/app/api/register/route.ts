import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const company = await prisma.company.create({
    data: { name: data.companyName, type: data.companyType, status: "PENDING" },
  });

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: data.role,
      status: "PENDING",
      companyId: company.id,
    },
  });

  await logAudit({
    actorUserId: user.id,
    action: "USER_SELF_REGISTERED",
    entityType: "User",
    entityId: user.id,
    metadata: { companyId: company.id, role: data.role },
  });

  return NextResponse.json({
    message: "Account created. An administrator must approve it before you can sign in.",
  });
}
