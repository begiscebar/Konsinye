import { LoadDetail } from "@/components/LoadDetail";

export default function OwnerLoadDetailPage({ params }: { params: { id: string } }) {
  return <LoadDetail loadId={params.id} />;
}
