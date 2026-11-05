import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { fetch } from "@/lib/auth";
import { readJson } from "@/lib/ldp";

const fetchMock = fetch as unknown as Mock;

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("readJson — retry kegagalan sementara (bug katalog #1)", () => {
  it("ECONNRESET (fetch throw) 2× lalu sukses → nilai tetap terbaca, 3 panggilan", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonRes({ items: [1, 2] }));
    const out = await readJson<{ items: number[] }>("https://pod.example/x.jsonld");
    expect(out).toEqual({ items: [1, 2] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("429/502 → dicoba ulang lalu sukses", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("rate", { status: 429 }))
      .mockResolvedValueOnce(new Response("boom", { status: 502 }))
      .mockResolvedValueOnce(jsonRes({ ok: true }));
    const out = await readJson("https://pod.example/x.jsonld");
    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("404 → null SEGERA tanpa retry (entri memang hilang)", async () => {
    fetchMock.mockResolvedValue(new Response("nf", { status: 404 }));
    const out = await readJson("https://pod.example/hilang.jsonld");
    expect(out).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gagal menetap setelah maxAttempts → null (tidak throw ke pemanggil)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const out = await readJson("https://pod.example/x.jsonld");
    expect(out).toBeNull();
  });
});