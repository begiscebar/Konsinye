import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/loads", label: "Loads" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/trucks", label: "Trucks" },
  { href: "/admin/commissions", label: "Commissions" },
  { href: "/admin/compliance", label: "Compliance" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <DashboardShell navItems={NAV} roleLabel="Super Admin">
      {children}
    </DashboardShell>
  );
}
