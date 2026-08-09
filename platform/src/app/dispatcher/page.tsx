import { LoadBoard } from "@/components/LoadBoard";

export default function DispatcherBoardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Load board</h1>
        <p className="text-sm text-slate-500">Available loads waiting to be matched and offered to a carrier.</p>
      </div>
      <LoadBoard basePath="/dispatcher" defaultStatus="AVAILABLE" />
    </div>
  );
}
