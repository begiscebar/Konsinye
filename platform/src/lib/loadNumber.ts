import { prisma } from "@/lib/prisma";

/** Generates a unique, human-readable load number like KF-104821. */
export async function generateLoadNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `KF-${Math.floor(100000 + Math.random() * 899999)}`;
    const existing = await prisma.load.findUnique({ where: { loadNumber: candidate } });
    if (!existing) return candidate;
  }
  return `KF-${Date.now()}`;
}
