import { requireDashboardAccess } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/dispatcher", label: "Load Board" },
  { href: "/dispatcher/active", label: "My Active Loads" },
  { href: "/dispatcher/completed", label: "Completed" },
];

export default async function DispatcherLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess(["DISPATCHER"]);

  return (
    <DashboardShell navItems={NAV} roleLabel="Dispatcher">
      {children}
    </DashboardShell>
  );
}
