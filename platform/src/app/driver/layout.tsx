import { requireDashboardAccess } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/driver", label: "My Loads" },
  { href: "/driver/profile", label: "Profile" },
];

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess(["DRIVER"]);

  return (
    <DashboardShell navItems={NAV} roleLabel="Driver">
      {children}
    </DashboardShell>
  );
}
