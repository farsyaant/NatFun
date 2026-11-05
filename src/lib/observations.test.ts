import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { UserPodPaths } from "@/lib/podInit";
import type { ObservationInput } from "@/lib/observations";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

vi.mock("@/lib/image", () => ({
  stripExif: vi.fn(async () => new Blob(["clean"], { type: "image/jpeg" })),
  makeThumbnail: vi.fn(async () => new Blob(["thumb"], { type: "image/jpeg" })),
  validatePhotoFile: vi.fn(),
}));

import { fetch } from "@/lib/auth";
import { uploadObservation } from "@/lib/observations";

const fetchMock = fetch as unknown as Mock;

function paths(): UserPodPaths {
  const r = "https://alice.example/natfun/";
  return {
    root: r,
    observations: `${r}observations/`,
    photos: `${r}photos/`,
    interactions: `${r}interactions/`,
    activitiesLikes: `${r}activities/likes/`,
    activitiesComments: `${r}activities/comments/`,
    social: `${r}social/`,
    following: `${r}social/following.jsonld`,
    inbox: `${r}inbox/`,
    sent: `${r}messages/sent/`,
    familyAcceptances: `${r}family/acceptances/`,
  };
}

const input: ObservationInput = {
  localName: "Komodo",
  scientificName: "Varanus komodoensis",
  province: "Nusa Tenggara Timur",
  kingdom: "Animalia",
  taxonClass: "Reptilia",
  family: "Varanidae",
  habitat: "Sabana",
  conservationStatus: "EN",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
});

describe("uploadObservation", () => {
  it("menyimpan foto, thumbnail, observasi, DAN membuat container interaksi per-observasi", async () => {
    const result = await uploadObservation(new File(["x"], "f.jpg", { type: "image/jpeg" }), input, "https://alice.example/profile/card#me", paths());

    const calls = fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), method: init?.method ?? "GET" }));
    // foto + thumbnail + observasi
    expect(calls.filter((c) => c.method === "PUT" && c.url.includes("/photos/")).length).toBe(2);
    expect(calls.some((c) => c.method === "PUT" && c.url.includes("/observations/"))).toBe(true);
    // container interaksi {id}/ dibuat oleh PEMILIK saat upload (C2)
    const obsId = result.observationUrl.split("/").pop()!.replace(".jsonld", "");
    expect(calls.some((c) => c.url.endsWith(`/natfun/interactions/${obsId}/`))).toBe(true);
  });

  it("kegagalan membuat container interaksi tidak menggagalkan unggahan (dibersihkan kemudian)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/interactions/")) {
        return Promise.resolve(new Response(null, { status: 403 }));
      }
      return Promise.resolve(new Response(null, { status: 201 }));
    });
    const result = await uploadObservation(new File(["x"], "f.jpg", { type: "image/jpeg" }), input, "https://alice.example/profile/card#me", paths());
    expect(result.observationUrl).toBeTruthy();
  });

  it("observasi memakai thumbnail terpisah (thumbnailUrl ≠ image)", async () => {
    const { putJson } = await import("@/lib/ldp");
    const spy = vi.spyOn(await import("@/lib/ldp"), "putJson");
    void putJson;
    await uploadObservation(new File(["x"], "f.jpg", { type: "image/jpeg" }), input, "https://alice.example/profile/card#me", paths());
    const doc = spy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(doc["schema:thumbnailUrl"]).not.toBe(doc["schema:image"]);
    expect(String(doc["schema:thumbnailUrl"])).toContain("_thumb");
    spy.mockRestore();
  });
});

describe("D9 — deleteOwnObservation", () => {
  it("observasi sudah hilang (fetch gagal) → tetap lanjut DELETE tanpa throw", async () => {
    const { deleteOwnObservation } = await import("@/lib/observations");
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).endsWith("obs1.jsonld") && !init?.method) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    await expect(deleteOwnObservation("https://alice.example/natfun/observations/obs1.jsonld")).resolves.toBeUndefined();
    const deletes = fetchMock.mock.calls.filter(([, i]) => i?.method === "DELETE");
    expect(deletes.length).toBeGreaterThanOrEqual(1);
  });

  it("hapus observasi + foto + thumbnail", async () => {
    const { deleteOwnObservation } = await import("@/lib/observations");
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 205 }));
      if (String(url).endsWith("obs1.jsonld"))
        return Promise.resolve(
          new Response(
            JSON.stringify({ "schema:image": "../photos/p.jpg", "schema:thumbnailUrl": "../photos/p_thumb.jpg" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      return Promise.resolve(new Response(null, { status: 205 }));
    });
    await deleteOwnObservation("https://alice.example/natfun/observations/obs1.jsonld");
    const deletes = fetchMock.mock.calls.filter(([, i]) => i?.method === "DELETE").map(([u]) => String(u));
    expect(deletes.some((u) => u.includes("/photos/p.jpg"))).toBe(true);
    expect(deletes.some((u) => u.includes("/photos/p_thumb.jpg"))).toBe(true);
  });
});