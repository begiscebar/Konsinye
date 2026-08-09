import { requireDashboardAccess } from "@/lib/auth";
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
  await requireDashboardAccess(["SUPER_ADMIN"]);

  return (
    <DashboardShell navItems={NAV} roleLabel="Super Admin">
      {children}
    </DashboardShell>
  );
}
