import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

const NAV = [
  { href: "/owner", label: "Company Profile" },
  { href: "/owner/trucks", label: "Trucks" },
  { href: "/owner/drivers", label: "Drivers" },
  { href: "/owner/offers", label: "Load Offers" },
  { href: "/owner/loads", label: "Loads" },
  { href: "/owner/documents", label: "Documents" },
  { href: "/owner/revenue", label: "Revenue" },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TRUCK_OWNER" && session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <DashboardShell navItems={NAV} roleLabel="Truck Owner">
      {children}
    </DashboardShell>
  );
}
