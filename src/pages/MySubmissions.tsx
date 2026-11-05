import AuthImage from "@/components/AuthImage";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listSubmissions, listDecisions, fetchObservationDocument, thumbnailUrlOf, type SubmissionRecord } from "@/lib/catalog";
import { deleteOwnObservation } from "@/lib/observations";
import { appConfig } from "@/config/appConfig";
import StatusBadge from "@/components/StatusBadge";

export default function MySubmissions() {
  const { state } = useAuth();
  const officialRoot = state?.officialRoot ?? null;
  const myWebId = state?.profile.webId ?? "";
  const [rows, setRows] = useState<Array<{ sub: SubmissionRecord; status: string; reason: string | null; thumb: string; localName: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!officialRoot || !myWebId) return;
    try {
      const [subs, decisions] = await Promise.all([
        listSubmissions(officialRoot),
        listDecisions(officialRoot),
      ]);
      const mine = subs.filter(
        (s) => s.ownerWebId.split("#")[0] === myWebId.split("#")[0],
      );
      const rows = await Promise.all(
        mine.map(async (sub) => {
          const dec = decisions.find((d) => d.submissionId === sub.id);
          const obs = await fetchObservationDocument(sub.observationUrl);
          return {
            sub,
            status: dec?.status ?? "Pending",
            reason: dec?.reason ?? null,
            thumb: obs ? thumbnailUrlOf(sub.observationUrl, obs) : "",
            localName: String(obs?.["dwc:vernacularName"] ?? sub.observationUrl.split("/").pop() ?? ""),
          };
        }),
      );
      setRows(rows);
    } catch {
      setError("Gagal memuat status kiriman.");
    }
  }, [officialRoot, myWebId]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
    const t = setInterval(load, appConfig.messagePollMs);
    return () => clearInterval(t);
  }, [load]);

  const remove = async (obsUrl: string) => {
    if (!state?.podPaths) return;
    if (!confirm("Hapus observasi ini dari Pod Anda?")) return;
    await deleteOwnObservation(obsUrl);
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold">Kirimanku</h1>
      <p className="mt-1 text-sm text-stone-500">
        Status unggahan Anda. Keputusan dibaca dari Official Pod.
      </p>
      {error && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <ul className="mt-4 space-y-3">
        {rows.map(({ sub, status, reason, thumb, localName }) => (
          <li key={sub.id} className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-sm">
            {thumb && <AuthImage src={thumb} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <div className="flex-1">
              <p className="font-semibold">{localName}</p>
              <p className="text-xs text-stone-400">{sub.observationUrl}</p>
              {reason && <p className="mt-1 text-xs text-red-600">Alasan: {reason}</p>}
            </div>
            <StatusBadge code={status === "Approved" ? "LC" : status === "Rejected" ? "CR" : "DD"} />
            <span className="w-20 text-center text-xs text-stone-500">
              {status === "Pending"
                ? "Menunggu"
                : status === "Approved"
                  ? "Disetujui"
                  : status === "Rejected"
                    ? "Ditolak"
                    : "Disembunyikan"}
            </span>
            <button onClick={() => remove(sub.observationUrl)} className="text-sm text-red-600 hover:underline">
              Hapus
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-lg bg-stone-100 p-4 text-stone-500">Belum ada kiriman.</li>
        )}
      </ul>
    </div>
  );
}
