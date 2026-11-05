/** Cache blob gambar (B2/B3): dedupe in-flight + cache hasil sesi, retry
 *  429/5xx. Blob dibagi antar consumer; object URL dibuat per consumer di
 *  AuthImage (masing-masing mencabut miliknya sendiri). */
import { fetch } from "@/lib/auth";
import { fetchWithRetry } from "@/lib/fetchRetry";

const blobCache = new Map<string, Blob>();
const inflight = new Map<string, Promise<Blob>>();

export async function fetchImageBlob(url: string): Promise<Blob> {
  const hit = blobCache.get(url);
  if (hit) return hit;
  const running = inflight.get(url);
  if (running) return running;
  const p = (async () => {
    try {
      // session fetch (bukan global fetch) — resource Pod butuh kredensial
      const res = await fetchWithRetry(url, { headers: { Accept: "image/*" } }, { fetchImpl: fetch });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      blobCache.set(url, blob);
      return blob;
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

export function clearImageCache(): void {
  blobCache.clear();
  inflight.clear();
}