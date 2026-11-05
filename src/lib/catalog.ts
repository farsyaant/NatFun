import { putJson, readJson, postJsonToContainer, jsonLdContext, listContainer, deleteResource } from "@/lib/ldp";
import { fetch } from "@/lib/auth";
import { mapLimit } from "@/lib/concurrency";
import { statusEnum, type CatalogIndex, type CatalogEntry } from "@/lib/vocab";

export interface DecisionRecord {
  submissionId: string;
  status: string;
  reason: string | null;
  observationUrl?: string;
  created: string;
}

export interface SubmissionRecord {
  id: string;
  observationUrl: string;
  ownerWebId: string;
  created: string;
}

/** FR-CAT-01/06 + FR-BRW-08: baca observasi; null saat hilang/tak berizin.
 *  (Implementasi + cache ada di bawah, bersama loadValidEntries.) */
export function thumbnailUrlOf(observationUrl: string, obs: Record<string, unknown>): string {
  const t = obs["schema:thumbnailUrl"] ?? obs["schema:image"];
  return typeof t === "string" ? new URL(t, observationUrl).toString() : "";
}

/** FR-BRW-08: buang entri yang observasinya tak bisa di-fetch lagi.
 *  Tahan kegagalan jaringan per-entri: satu fetch yang throw tidak boleh
 *  membatalkan seluruh katalog (FR-BRW-03).
 *  B1: observasi diambil paralel (batas 6). B2: cache TTL pendek agar
 *  navigasi bolak-balik tidak menembak ulang seluruh Pod. */
const OBS_TTL_MS = 60_000;
const obsCache = new Map<string, { doc: Record<string, unknown>; at: number }>();
const obsInflight = new Map<string, Promise<Record<string, unknown> | null>>();

export function clearObservationCache(): void {
  obsCache.clear();
  obsInflight.clear();
}

export async function fetchObservationDocument(
  url: string,
): Promise<Record<string, unknown> | null> {
  const hit = obsCache.get(url);
  if (hit && Date.now() - hit.at < OBS_TTL_MS) return hit.doc;
  const running = obsInflight.get(url);
  if (running) return running;
  const p = (async () => {
    try {
      const res = await fetch(url, { headers: { Accept: "application/ld+json, application/json" } });
      if (!res.ok) return null;
      const doc = (await res.json()) as Record<string, unknown>;
      obsCache.set(url, { doc, at: Date.now() });
      return doc;
    } finally {
      obsInflight.delete(url);
    }
  })();
  obsInflight.set(url, p);
  return p;
}

export async function loadValidEntries(catalog: CatalogIndex): Promise<CatalogEntry[]> {
  const valid: CatalogEntry[] = [];
  await mapLimit(catalog.items, 6, async (entry) => {
    try {
      const obs = await fetchObservationDocument(entry.observationUrl);
      if (!obs) return;
      valid.push({ ...entry, thumbnailUrl: thumbnailUrlOf(entry.observationUrl, obs) || entry.thumbnailUrl });
    } catch (e) {
      console.warn(`[NatFun] Observasi dilewati (${entry.observationUrl}):`, e instanceof Error ? e.message : e);
    }
  });
  return valid;
}

/** FR-MOD-02 / FR-UPL-10: tambah entri ke catalog/index.jsonld (Admin). */
export async function addCatalogEntry(
  officialRoot: string,
  catalog: CatalogIndex,
  entry: CatalogEntry,
): Promise<void> {
  const next: CatalogIndex = {
    ...catalog,
    items: [...catalog.items.filter((e) => e.observationUrl !== entry.observationUrl), entry],
  };
  await putJson(`${officialRoot}catalog/index.jsonld`, next);
}

/** FR-MOD-05: unlist entri dari index. */
export async function removeCatalogEntry(
  officialRoot: string,
  catalog: CatalogIndex,
  observationUrl: string,
): Promise<void> {
  const next: CatalogIndex = {
    ...catalog,
    items: catalog.items.filter((e) => e.observationUrl !== observationUrl),
  };
  await putJson(`${officialRoot}catalog/index.jsonld`, next);
}

/** FR-MOD-02/03/05: tulis decision record. */
export async function writeDecision(
  officialRoot: string,
  submissionId: string,
  status: keyof typeof statusEnum,
  reason?: string,
): Promise<void> {
  await putJson(`${officialRoot}decisions/${submissionId}.jsonld`, {
    "@context": jsonLdContext(),
    "@type": "natfun:Decision",
    "natfun:submissionId": submissionId,
    "natfun:status": statusEnum[status],
    "natfun:reason": reason ?? null,
    "dcterms:created": new Date().toISOString(),
  });
}

/** FR-UPL-08: semua decision di Official Pod. */
export async function listDecisions(officialRoot: string): Promise<DecisionRecord[]> {
  const urls = await listContainer(`${officialRoot}decisions/`).catch(() => [] as string[]);
  const out: DecisionRecord[] = [];
  for (const url of urls) {
    const d = await readJson<Record<string, unknown>>(url);
    if (!d) continue;
    out.push({
      submissionId: String(d["natfun:submissionId"] ?? ""),
      status: String(d["natfun:status"] ?? ""),
      reason: (d["natfun:reason"] as string) ?? null,
      observationUrl: d["natfun:observationUrl"] as string | undefined,
      created: String(d["dcterms:created"] ?? ""),
    });
  }
  return out;
}

/** FR-MOD-01: daftar submission pending (Admin queue). */
export async function listSubmissions(officialRoot: string): Promise<SubmissionRecord[]> {
  const urls = await listContainer(`${officialRoot}submissions/`).catch(() => [] as string[]);
  const out: SubmissionRecord[] = [];
  for (const url of urls) {
    const s = await readJson<Record<string, unknown>>(url);
    if (!s) continue;
    out.push({
      id: url.split("/").pop()?.replace(".jsonld", "") ?? "",
      observationUrl: String(s["natfun:observationUrl"] ?? ""),
      ownerWebId: String(s["natfun:ownerWebId"] ?? ""),
      created: String(s["dcterms:created"] ?? ""),
    });
  }
  return out;
}

/** FR-REP-01 (S): kirim laporan ke Official Pod. */
export async function submitReport(
  officialRoot: string,
  observationUrl: string,
  reporterWebId: string,
  reason: string,
): Promise<void> {
  await postJsonToContainer(`${officialRoot}reports/`, {
    "@context": jsonLdContext(),
    "@type": "natfun:Report",
    "natfun:observationUrl": observationUrl,
    "natfun:reporterWebId": reporterWebId,
    "natfun:reason": reason,
    "dcterms:created": new Date().toISOString(),
  });
}

export { postJsonToContainer, deleteResource };
export type { CatalogEntry };
