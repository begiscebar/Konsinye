"use client";

import { useSession } from "next-auth/react";
import { DocumentManager } from "@/components/DocumentManager";

export default function OwnerDocumentsPage() {
  const { data: session } = useSession();
  if (!session?.user?.companyId) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Company documents</h1>
      <DocumentManager
        ownerType="COMPANY"
        ownerId={session.user.companyId}
        allowedTypes={["INSURANCE_COI", "W9", "MC_AUTHORITY", "USDOT_REGISTRATION", "BOC3", "UCR", "VEHICLE_REGISTRATION", "OTHER"]}
      />
    </div>
  );
}
