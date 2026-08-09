import { LoadDetail } from "@/components/LoadDetail";

export default function DispatcherLoadDetailPage({ params }: { params: { id: string } }) {
  return <LoadDetail loadId={params.id} />;
}
