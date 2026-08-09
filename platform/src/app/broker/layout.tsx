import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/broker", label: "My Loads" },
  { href: "/broker/post", label: "Post a Load" },
  { href: "/broker/invoices", label: "Invoices" },
];

export default async function BrokerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "BROKER" && session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <DashboardShell navItems={NAV} roleLabel="Broker">
      {children}
    </DashboardShell>
  );
}
