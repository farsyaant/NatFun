import { getSolidDataset, getThingAll, getUrl } from "@inrupt/solid-client";
import { fetch } from "@/lib/auth";
import { fetchWithRetry } from "@/lib/fetchRetry";
import { ns } from "@/lib/vocab";

/** Daftar URL resource di dalam container (LDP ldp:contains). */
export async function listContainer(containerUrl: string): Promise<string[]> {
  const cUrl = containerUrl.endsWith("/") ? containerUrl : `${containerUrl}/`;
  const dataset = await getSolidDataset(cUrl, { fetch });
  const things = getThingAll(dataset);
  const out: string[] = [];
  for (const t of things) {
    const contains = getUrl(t, `${ns.ldp}contains`);
    if (contains) out.push(contains);
  }
  return out;
}

/** Baca satu dokumen JSON-LD dari Pod.
 *  Tahan kegagalan sementara (ECONNRESET/429/5xx) dengan retry — kegagalan
 *  jaringan Nyata terjadi pada solidcommunity (bukti: ronde pengukuran).
 *  404 → null segera (resource memang hilang, bukan gagal sementara). */
export async function readJson<T>(url: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetchWithRetry(
      url,
      { headers: { Accept: "application/ld+json, application/json" } },
      { fetchImpl: fetch, maxAttempts: 3 },
    );
  } catch {
    return null; // gagal menetap (mis. ECONNRESET terus) → null, bukan throw
  }
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Tulis (PUT) dokumen JSON-LD. */
export async function putJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/ld+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gagal menulis ${url}: ${res.status}`);
}

/** Tulis (POST) dokumen JSON-LD baru ke container (untuk container append-only). */
export async function postJsonToContainer(containerUrl: string, body: unknown): Promise<string> {
  const cUrl = containerUrl.endsWith("/") ? containerUrl : `${containerUrl}/`;
  const res = await fetch(cUrl, {
    method: "POST",
    headers: { "Content-Type": "application/ld+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gagal append ke ${cUrl}: ${res.status}`);
  const location = res.headers.get("Location");
  return location ? new URL(location, cUrl).toString() : `${cUrl}${Date.now()}.jsonld`;
}

/** Hapus resource (PUT owner). */
export async function deleteResource(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal menghapus ${url}: ${res.status}`);
  }
}

function uuid(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function jsonLdContext(extra: Record<string, string> = {}) {
  return {
    as: ns.as.replace(/#$/, ""),
    schema: ns.schema,
    dwc: ns.dwc,
    dcterms: ns.dcterms,
    natfun: ns.natfun,
    ...extra,
  };
}

export { uuid };
