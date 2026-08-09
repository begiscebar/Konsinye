import { LoadBoard } from "@/components/LoadBoard";

export default function BrokerLoadsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My loads</h1>
        <p className="text-sm text-slate-500">Loads you've posted and their current status.</p>
      </div>
      <LoadBoard basePath="/broker" />
    </div>
  );
}
