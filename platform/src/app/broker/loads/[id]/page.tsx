import { LoadDetail } from "@/components/LoadDetail";

export default function BrokerLoadDetailPage({ params }: { params: { id: string } }) {
  return <LoadDetail loadId={params.id} />;
}
