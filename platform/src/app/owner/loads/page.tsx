import { LoadBoard } from "@/components/LoadBoard";

export default function OwnerLoadsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Loads</h1>
      <LoadBoard basePath="/owner" />
    </div>
  );
}
