const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-slate-100 text-slate-700",
  OFFERED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  DRIVER_CONFIRMED: "bg-indigo-100 text-indigo-800",
  AT_PICKUP: "bg-indigo-100 text-indigo-800",
  LOADED: "bg-indigo-100 text-indigo-800",
  IN_TRANSIT: "bg-brand-100 text-brand-700",
  AT_DELIVERY: "bg-brand-100 text-brand-700",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  POD_UPLOADED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PAYMENT_PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
  DISPUTED: "bg-red-100 text-red-700",
  DELAYED: "bg-orange-100 text-orange-800",
  PENDING: "bg-amber-100 text-amber-800",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  SUSPENDED: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
