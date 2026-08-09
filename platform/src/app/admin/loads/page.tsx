import { LoadBoard } from "@/components/LoadBoard";

export default function AdminLoadsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">All loads</h1>
      <LoadBoard basePath="/admin" />
    </div>
  );
}
