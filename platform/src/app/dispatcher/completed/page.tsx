import { LoadBoard } from "@/components/LoadBoard";

export default function DispatcherCompletedPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Completed loads</h1>
      <LoadBoard basePath="/dispatcher" defaultStatus="COMPLETED" />
    </div>
  );
}
