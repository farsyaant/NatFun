import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./fetchRetry";

const sleepless = () => Promise.resolve();

afterEach(() => vi.restoreAllMocks());

describe("fetchWithRetry (B3 — tahan rate-limit 429/5xx)", () => {
  it("mengembalikan response langsung saat OK", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers() });
    const out = await fetchWithRetry("https://x.example", {}, { fetchImpl: f as typeof fetch, sleep: sleepless });
    expect(out.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retry saat 429 lalu sukses", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers() });
    const out = await fetchWithRetry("https://x.example", {}, { fetchImpl: f as typeof fetch, sleep: sleepless });
    expect(out.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("berhenti setelah maxAttempts saat selalu 429", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 429, headers: new Headers() });
    const out = await fetchWithRetry("https://x.example", {}, { fetchImpl: f as typeof fetch, maxAttempts: 3, sleep: sleepless });
    expect(out.status).toBe(429);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("tidak retry error klien non-rate-limit (404)", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() });
    await fetchWithRetry("https://x.example", {}, { fetchImpl: f as typeof fetch, sleep: sleepless });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retry saat error jaringan (fetch throw)", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers() });
    const out = await fetchWithRetry("https://x.example", {}, { fetchImpl: f as typeof fetch, sleep: sleepless });
    expect(out.ok).toBe(true);
  });
});