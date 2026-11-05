/** fetch dengan retry eksponensial (B3): 429/5xx dan error jaringan dicoba
 *  ulang dengan backoff; menghormati header Retry-After. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: {
    fetchImpl?: typeof fetch;
    maxAttempts?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<Response> {
  const { fetchImpl = fetch, maxAttempts = 4, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = opts;
  let lastRes: Response | null = null;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchImpl(url, init);
      if (res.ok) return res;
      lastRes = res;
      if (res.status !== 429 && res.status < 500) return res;
    } catch (e) {
      lastErr = e;
      lastRes = null;
    }
    if (attempt < maxAttempts) {
      const retryAfter = Number(lastRes?.headers?.get?.("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1);
      await sleep(Math.min(delay, 15_000));
    }
  }
  if (lastRes) return lastRes;
  throw lastErr ?? new Error(`fetch gagal: ${url}`);
}