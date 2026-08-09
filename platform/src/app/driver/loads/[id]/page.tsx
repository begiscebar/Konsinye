import { DriverLoadDetail } from "@/components/DriverLoadDetail";

export default function DriverLoadDetailPage({ params }: { params: { id: string } }) {
  return <DriverLoadDetail loadId={params.id} />;
}
