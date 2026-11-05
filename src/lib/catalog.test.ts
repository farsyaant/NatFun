import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { CatalogIndex } from "@/lib/vocab";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { fetch } from "@/lib/auth";
import { loadValidEntries } from "@/lib/catalog";

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

describe("loadValidEntries", () => {
  beforeEach(() => {
    // reset cache observasi antar-test
    import("@/lib/catalog").then((m) => m.clearObservationCache());
  });
  it("mengembalikan entri yang observasinya valid", async () => {
    const catalog = makeCatalog(2);
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes({ "schema:image": "p.jpg" })));
    const entries = await loadValidEntries(catalog);
    expect(entries).toHaveLength(2);
  });

  it("melewatkan entri yang observasinya 404 tanpa membuang entri lain", async () => {
    const catalog = makeCatalog(2);
    fetchMock.mockImplementation((url: string) =>
      url.includes("/obs/0.") ? Promise.resolve({ ok: false, status: 404 }) : Promise.resolve(jsonRes({})),
    );
    const entries = await loadValidEntries(catalog);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("e1");
  });

  it("tidak melempar error saat satu fetch jaringan throw — entri lain tetap dimuat", async () => {
    const catalog = makeCatalog(3);
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/obs/1.")) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve(jsonRes({}));
    });
    const entries = await loadValidEntries(catalog);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.id).sort()).toEqual(["e0", "e2"]);
  });

  it("mengembalikan [] (bukan throw) saat seluruh observasi gagal", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const entries = await loadValidEntries(makeCatalog(3));
    expect(entries).toEqual([]);
  });

  it("melewatkan observasi yang kontennya bukan JSON", async () => {
    const catalog = makeCatalog(2);
    fetchMock.mockImplementation((url: string) =>
      url.includes("/obs/0.")
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("bad json")) })
        : Promise.resolve(jsonRes({})),
    );
    const entries = await loadValidEntries(catalog);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("e1");
  });

  it("paralel terbatas: puncak request bersamaan ≤ 6 dan hasil tetap lengkap (B1)", async () => {
    const { clearObservationCache } = await import("@/lib/catalog");
    clearObservationCache();
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
    const entries = await loadValidEntries(catalog);
    expect(entries).toHaveLength(12);
    expect(peak).toBeLessThanOrEqual(6);
  }, 10_000);

  it("cache: pemanggilan kedua untuk katalog sama tidak melakukan fetch observasi lagi (B2)", async () => {
    const { clearObservationCache } = await import("@/lib/catalog");
    clearObservationCache();
    const catalog = makeCatalog(3);
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes({})));
    await loadValidEntries(catalog);
    const firstCount = fetchMock.mock.calls.length;
    expect(firstCount).toBe(3);
    await loadValidEntries(catalog);
    expect(fetchMock.mock.calls.length).toBe(firstCount); // tidak bertambah
  });

  it("clearObservationCache memaksa fetch ulang", async () => {
    const { clearObservationCache } = await import("@/lib/catalog");
    clearObservationCache();
    const catalog = makeCatalog(2);
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes({})));
    await loadValidEntries(catalog);
    const firstCount = fetchMock.mock.calls.length;
    clearObservationCache();
    await loadValidEntries(catalog);
    expect(fetchMock.mock.calls.length).toBe(firstCount * 2);
  });
});