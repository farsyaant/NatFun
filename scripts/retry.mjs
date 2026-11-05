/**
 * fetch dengan retry eksponensial untuk menghadapi rate-limit (HTTP 429)
 * dan error jaringan sementara. Menghormati header Retry-After bila ada.
 *
 * @param {string} url
 * @param {RequestInit} [init]  opsi fetch standar (method, headers, body, …)
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]   default: global fetch
 * @param {number} [opts.maxAttempts]       default: 4
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 * @returns {Promise<Response>} response terakhir (bisa saja masih 429 setelah maxAttempts)
 */
export async function fetchWithRetry(url, init = {}, opts = {}) {
  const { fetchImpl = fetch, maxAttempts = 4, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = opts;
  let lastRes = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchImpl(url, init);
      if (res.ok) return res;
      lastRes = res;
      // Rate limit / server error → retry; error klien lain (403/404) → berhenti
      if (res.status !== 429 && res.status < 500) return res;
    } catch (e) {
      lastErr = e;
      lastRes = null;
    }
    if (attempt < maxAttempts) {
      const retryAfter = Number(lastRes?.headers?.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1);
      await sleep(Math.min(delay, 15_000));
    }
  }
  if (lastRes) return lastRes;
  throw lastErr ?? new Error(`fetch gagal: ${url}`);
}