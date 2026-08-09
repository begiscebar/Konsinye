import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  DISPATCHER: "/dispatcher",
  TRUCK_OWNER: "/owner",
  DRIVER: "/driver",
  BROKER: "/broker",
};

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(ROLE_HOME[session.user.role] ?? "/login");
}
