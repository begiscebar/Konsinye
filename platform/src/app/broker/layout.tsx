import { requireDashboardAccess } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/broker", label: "My Loads" },
  { href: "/broker/post", label: "Post a Load" },
  { href: "/broker/invoices", label: "Invoices" },
];

export default async function BrokerLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess(["BROKER"]);

  return (
    <DashboardShell navItems={NAV} roleLabel="Broker">
      {children}
    </DashboardShell>
  );
}
