import AuthImage from "@/components/AuthImage";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listSubmissions,
  listDecisions,
  fetchObservationDocument,
  thumbnailUrlOf,
  addCatalogEntry,
  removeCatalogEntry,
  writeDecision,
  type SubmissionRecord,
} from "@/lib/catalog";
import { listContainer, readJson } from "@/lib/ldp";
import { toCatalogEntry } from "@/lib/observations";
import StatusBadge from "@/components/StatusBadge";

export default function AdminQueue() {
  const { state, refreshCatalog } = useAuth();
  const [pending, setPending] = useState<Array<{ sub: SubmissionRecord; obs: Record<string, unknown> | null }>>([]);
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const officialRoot = state?.officialRoot ?? null;
  const load = useCallback(async () => {
    if (!officialRoot) return;
    try {
      const subs = await listSubmissions(officialRoot);
      const decisions = await listDecisions(officialRoot);
      const map: Record<string, string> = {};
      for (const d of decisions) map[d.submissionId] = d.status;
      const rows = await Promise.all(
        subs
          .filter((s) => !map[s.id] || map[s.id] === "Unlisted")
          .map(async (sub) => ({ sub, obs: await fetchObservationDocument(sub.observationUrl) })),
      );
      setPending(rows);
      // reports (FR-MOD-07, S-02)
      const urls = await listContainer(`${officialRoot}reports/`).catch(() => [] as string[]);
      const rpts: Array<Record<string, unknown>> = [];
      for (const u of urls) {
        const r = await readJson<Record<string, unknown>>(u);
        if (r) rpts.push(r);
      }
      setReports(rpts);
    } catch {
      setError("Gagal memuat antrean moderasi.");
    }
  }, [officialRoot]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
  }, [load]);

  const approve = async (row: { sub: SubmissionRecord; obs: Record<string, unknown> | null }) => {
    if (!state?.officialRoot || !state.catalog) return;
    const officialRoot = state.officialRoot;
    setBusy(true);
    setError(null);
    try {
      const obs = row.obs ?? (await fetchObservationDocument(row.sub.observationUrl));
      if (!obs) {
        setError("Observasi tidak dapat dibaca.");
        return;
      }
      const entry = toCatalogEntry(obs, row.sub.observationUrl, row.sub.ownerWebId, "community");
      await addCatalogEntry(officialRoot, state.catalog, entry);
      await writeDecision(officialRoot, row.sub.id, "approved");
      refreshCatalog({
        ...state.catalog,
        items: [...state.catalog.items, entry],
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyetujui.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async (row: { sub: SubmissionRecord }) => {
    if (!state?.officialRoot) return;
    const officialRoot = state.officialRoot;
    const reason = prompt("Alasan penolakan (maks 200 karakter):");
    if (reason === null) return;
    setBusy(true);
    try {
      await writeDecision(officialRoot, row.sub.id, "rejected", reason.slice(0, 200));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const unlist = async (obsUrl: string) => {
    if (!state?.officialRoot) return;
    const entry = state.catalog.items.find((e) => e.observationUrl === obsUrl);
    setBusy(true);
    try {
      await removeCatalogEntry(state.officialRoot, state.catalog, obsUrl);
      await writeDecision(
        state.officialRoot,
        entry?.id ?? obsUrl.split("/").pop()?.replace(".jsonld", "") ?? "",
        "unlisted",
      );
      refreshCatalog({
        ...state.catalog,
        items: state.catalog.items.filter((e) => e.observationUrl !== obsUrl),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyembunyikan.");
    } finally {
      setBusy(false);
    }
  };

  const approvedEntries = state?.catalog.items.filter((e) => e.source === "community") ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-xl font-bold">Antrean Moderasi</h1>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-3">
        <h2 className="font-semibold">Menunggu keputusan ({pending.length})</h2>
        {pending.map(({ sub, obs }) => (
          <div key={sub.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              {obs && (
                <AuthImage
                  src={thumbnailUrlOf(sub.observationUrl, obs)}
                  alt=""
                  className="h-24 w-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 text-sm">
                <p className="font-semibold">
                  {String(obs?.["dwc:vernacularName"] ?? "?")}{" "}
                  <span className="italic text-stone-500">{String(obs?.["dwc:scientificName"] ?? "")}</span>
                </p>
                <p className="text-stone-500">
                  {String(obs?.["natfun:province"] ?? "")} · {String(obs?.["natfun:habitat"] ?? "")} ·{" "}
                  <StatusBadge code={String(obs?.["natfun:conservationStatus"] ?? "NE")} />
                </p>
                <p className="mt-1 break-all text-xs text-stone-400">
                  Pemilik: {sub.ownerWebId}
                </p>
                <p className="break-all text-xs text-stone-400">{sub.observationUrl}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  disabled={busy}
                  onClick={() => approve({ sub, obs })}
                  className="rounded-md bg-leaf-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Setujui
                </button>
                <button
                  disabled={busy}
                  onClick={() => reject({ sub })}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                >
                  Tolak
                </button>
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="rounded-lg bg-stone-100 p-4 text-stone-500">Kosong.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Entri komunitas terpublikasi ({approvedEntries.length})</h2>
        <ul className="space-y-2">
          {approvedEntries.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
              <div>
                <p className="font-semibold">{e.localName}</p>
                <p className="text-xs text-stone-400">{e.ownerWebId}</p>
              </div>
              <button
                disabled={busy}
                onClick={() => unlist(e.observationUrl)}
                className="rounded-md border border-amber-300 px-3 py-1.5 text-xs text-amber-700"
              >
                Sembunyikan (unlist)
              </button>
            </li>
          ))}
          {approvedEntries.length === 0 && (
            <li className="rounded-lg bg-stone-100 p-4 text-stone-500">Belum ada.</li>
          )}
        </ul>
      </section>

      {reports.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Laporan ({reports.length})</h2>
          <ul className="space-y-2 text-sm">
            {reports.map((r, i) => (
              <li key={i} className="rounded-xl bg-amber-50 p-3">
                <p className="break-all">{String(r["natfun:reason"] ?? "")}</p>
                <p className="text-xs text-stone-400">
                  {String(r["natfun:observationUrl"] ?? "")} — {String(r["natfun:reporterWebId"] ?? "")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
