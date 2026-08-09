import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/driver", label: "My Loads" },
  { href: "/driver/profile", label: "Profile" },
];

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DRIVER" && session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <DashboardShell navItems={NAV} roleLabel="Driver">
      {children}
    </DashboardShell>
  );
}
