"use client";

import { useSession } from "next-auth/react";
import { DocumentManager } from "@/components/DocumentManager";

export default function DriverProfilePage() {
  const { data: session } = useSession();
  if (!session?.user?.id) return null;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">My documents</h1>
        <p className="text-sm text-slate-500">{session.user.name}</p>
      </div>
      <DocumentManager
        ownerType="USER"
        ownerId={session.user.id}
        allowedTypes={["CDL", "DRIVER_LICENSE", "MEDICAL_CARD", "DRUG_ALCOHOL_COMPLIANCE"]}
      />
    </div>
  );
}
