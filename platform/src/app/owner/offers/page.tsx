import { LoadBoard } from "@/components/LoadBoard";

export default function OwnerOffersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Load offers</h1>
        <p className="text-sm text-slate-500">Open a load below to accept or reject an offer made to your company.</p>
      </div>
      <LoadBoard basePath="/owner" defaultStatus="OFFERED" />
    </div>
  );
}
