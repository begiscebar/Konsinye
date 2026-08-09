import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/dispatcher", label: "Load Board" },
  { href: "/dispatcher/active", label: "My Active Loads" },
  { href: "/dispatcher/completed", label: "Completed" },
];

export default async function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DISPATCHER" && session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <DashboardShell navItems={NAV} roleLabel="Dispatcher">
      {children}
    </DashboardShell>
  );
}
