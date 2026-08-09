import { LoadDetail } from "@/components/LoadDetail";

export default function AdminLoadDetailPage({ params }: { params: { id: string } }) {
  return <LoadDetail loadId={params.id} />;
}
