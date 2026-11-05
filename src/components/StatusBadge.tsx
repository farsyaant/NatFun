import { statusLabels } from "@/config/appConfig";

const colors: Record<string, string> = {
  EX: "bg-stone-700 text-white",
  EW: "bg-stone-600 text-white",
  CR: "bg-red-700 text-white",
  EN: "bg-red-500 text-white",
  VU: "bg-amber-500 text-white",
  NT: "bg-amber-300 text-stone-800",
  LC: "bg-leaf-500 text-white",
  DD: "bg-stone-300 text-stone-700",
  NE: "bg-stone-200 text-stone-500",
};

export default function StatusBadge({ code }: { code: string }) {
  return (
    <span
      title={statusLabels[code] ?? code}
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${colors[code] ?? "bg-stone-200 text-stone-600"}`}
    >
      {code}
    </span>
  );
}
