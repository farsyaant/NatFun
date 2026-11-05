import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./retry.mjs";

function sleepless() {
  return Promise.resolve();
}

describe("fetchWithRetry", () => {
  it("mengembalikan response langsung saat status OK (2xx)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const res = await fetchWithRetry("https://contoh.org", {}, { fetchImpl: fetchMock, sleep: sleepless });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mencoba ulang saat 429 dan berhasil pada percobaan berikutnya", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const res = await fetchWithRetry("https://contoh.org", {}, { fetchImpl: fetchMock, sleep: sleepless });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gagal setelah maxAttempts ketika selalu 429", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const res = await fetchWithRetry("https://contoh.org", {}, {
      fetchImpl: fetchMock,
      maxAttempts: 3,
      sleep: sleepless,
    });
    expect(res.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("mencoba ulang saat fetch melempar error jaringan, lalu berhasil", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const res = await fetchWithRetry("https://contoh.org", {}, { fetchImpl: fetchMock, sleep: sleepless });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("meneruskan init (method/headers/body) ke fetchImpl", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await fetchWithRetry(
      "https://contoh.org",
      { headers: { "User-Agent": "Test/1.0" } },
      { fetchImpl: fetchMock, sleep: sleepless },
    );
    expect(fetchMock).toHaveBeenCalledWith("https://contoh.org", { headers: { "User-Agent": "Test/1.0" } });
  });

  it("tidak mencoba ulang error klien non-rate-limit seperti 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await fetchWithRetry("https://contoh.org", {}, { fetchImpl: fetchMock, sleep: sleepless });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});