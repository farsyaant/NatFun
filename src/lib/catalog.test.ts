import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { CatalogIndex } from "@/lib/vocab";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { fetch } from "@/lib/auth";
import { clearObservationCache, loadValidEntries } from "@/lib/catalog";

const fetchMock = fetch as unknown as Mock;

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function makeCatalog(n: number): CatalogIndex {
  return {
    "@context": {},
    "@type": "Collection",
    items: Array.from({ length: n }, (_, i) => ({
      id: `e${i}`,
      source: "official" as const,
      observationUrl: `https://pod.example/obs/${i}.jsonld`,
      ownerWebId: "https://pod.example/card#me",
      localName: `Entri ${i}`,
      scientificName: `Species ${i}`,
      kingdom: "Animalia",
      taxonClass: "Aves",
      family: "X",
      province: "Aceh",
      habitat: "Sabana",
      conservationStatus: "LC",
      thumbnailUrl: `https://pod.example/photos/${i}.jpg`,
      approvedAt: "",
    })),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("fetchObservationDocument — retry (bug katalog #1)", () => {
  beforeEach(() => {
    import("@/lib/catalog").then((m) => m.clearObservationCache());
  });

  it("ECONNRESET 2× lalu sukses → dokumen tetap terbaca", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonRes({ "dwc:vernacularName": "Komodo" }));
    const doc = await fetchObservationDocument("https://pod.example/obs/x.jsonld");
    expect(doc).toEqual({ "dwc:vernacularName": "Komodo" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("404 → null segera tanpa retry", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const doc = await fetchObservationDocument("https://pod.example/obs/hilang.jsonld");
    expect(doc).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("429 yang bertahan setelah retry → THROW (transient), BUKAN null/dead", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    fetchMock.mockResolvedValue({ ok: false, status: 429, headers: new Headers() });
    await expect(fetchObservationDocument("https://pod.example/obs/rate.jsonld")).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("403 (izin dicabut, FR-DEC-04) → null segera (dead)", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const doc = await fetchObservationDocument("https://pod.example/obs/revoked.jsonld");
    expect(doc).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("loadValidEntries — hasil terklasifikasi (bug katalog #2/#3/#4)", () => {
  beforeEach(async () => {
    const m = await import("@/lib/catalog");
    m.clearObservationCache();
  });

  it("urutan STABIL: verified mengikuti urutan index walau fetch selesai acak", async () => {
    const catalog = makeCatalog(4);
    fetchMock.mockImplementation((url: string) => {
      const i = Number(url.match(/obs\/(\d+)\./)?.[1] ?? 0);
      return new Promise((resolve) => setTimeout(() => resolve(jsonRes({})), (3 - i) * 10));
    });
    const out = await loadValidEntries(catalog);
    expect(out.verified.map((e) => e.id)).toEqual(["e0", "e1", "e2", "e3"]);
    expect(out.dead).toEqual([]);
    expect(out.transient).toBe(0);
  }, 10_000);

  it("404 → dead (disembunyikan), entri lain tetap verified", async () => {
    const catalog = makeCatalog(3);
    fetchMock.mockImplementation((url: string) =>
      url.includes("/obs/1.") ? Promise.resolve({ ok: false, status: 404 }) : Promise.resolve(jsonRes({})),
    );
    const out = await loadValidEntries(catalog);
    expect(out.verified.map((e) => e.id)).toEqual(["e0", "e2"]);
    expect(out.dead).toEqual(["https://pod.example/obs/1.jsonld"]);
    expect(out.transient).toBe(0);
  });

  it("gagal sementara (throw setelah retry) → transient, TIDAK dimasukkan dead", async () => {
    const catalog = makeCatalog(3);
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/obs/1.")) return Promise.reject(new TypeError("fetch failed"));
      return Promise.resolve(jsonRes({}));
    });
    const out = await loadValidEntries(catalog);
    expect(out.verified.map((e) => e.id)).toEqual(["e0", "e2"]);
    expect(out.dead).toEqual([]);
    expect(out.transient).toBe(1);
  }, 15_000);

  it("seluruh observasi gagal menetap → verified dan dead kosong, transient = n", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const out = await loadValidEntries(makeCatalog(2));
    expect(out.verified).toEqual([]);
    expect(out.dead).toEqual([]);
    expect(out.transient).toBe(2);
  }, 15_000);

  it("konten bukan JSON → transient (bukan dead)", async () => {
    const catalog = makeCatalog(2);
    fetchMock.mockImplementation((url: string) =>
      url.includes("/obs/0.")
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("bad json")) })
        : Promise.resolve(jsonRes({})),
    );
    const out = await loadValidEntries(catalog);
    expect(out.verified.map((e) => e.id)).toEqual(["e1"]);
    expect(out.dead).toEqual([]);
    expect(out.transient).toBe(1);
  });

  it("paralel terbatas: puncak request bersamaan ≤ 6 dan hasil tetap lengkap (B1)", async () => {
    const catalog = makeCatalog(12);
    let active = 0;
    let peak = 0;
    fetchMock.mockImplementation(() => {
      active++;
      peak = Math.max(peak, active);
      return new Promise((resolve) =>
        setTimeout(() => {
          active--;
          resolve(jsonRes({}));
        }, 5),
      );
    });
    const out = await loadValidEntries(catalog);
    expect(out.verified).toHaveLength(12);
    expect(peak).toBeLessThanOrEqual(6);
  }, 10_000);

  it("cache: pemanggilan kedua untuk katalog sama tidak melakukan fetch observasi lagi (B2)", async () => {
    const catalog = makeCatalog(3);
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes({})));
    await loadValidEntries(catalog);
    const firstCount = fetchMock.mock.calls.length;
    expect(firstCount).toBe(3);
    await loadValidEntries(catalog);
    expect(fetchMock.mock.calls.length).toBe(firstCount); // tidak bertambah
  });

  it("clearObservationCache memaksa fetch ulang", async () => {
    const catalog = makeCatalog(2);
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes({})));
    await loadValidEntries(catalog);
    const firstCount = fetchMock.mock.calls.length;
    clearObservationCache();
    await loadValidEntries(catalog);
    expect(fetchMock.mock.calls.length).toBe(firstCount * 2);
  });
});