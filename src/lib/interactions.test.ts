import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { UserPodPaths } from "@/lib/podInit";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

// TIDAK meng-mock @/lib/profile: fetchProfileCached asli dipakai agar cache
// nyata teruji; fetch mock cukup menyajikan profil turtle untuk aktor.

import { fetch } from "@/lib/auth";
import { clearProfileCache } from "@/lib/profile";
import {
  ensureInteractionContainer,
  commentEntry,
  likeEntry,
  findMyLike,
} from "@/lib/interactions";

const ALICE_WEBID = "https://alice.example/profile/card#me";
const ALICE_TURTLE =
  `<https://alice.example/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Alice" ; <http://www.w3.org/ns/pim/space#storage> <https://alice.example/> .`;

const fetchMock = fetch as unknown as Mock;

function pathsFor(host: string): UserPodPaths {
  const r = `https://${host}/natfun/`;
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

function res(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("ensureInteractionContainer", () => {
  it("tidak melakukan apa-apa bila container sudah ada (GET 200)", async () => {
    fetchMock.mockResolvedValue(res(200));
    await ensureInteractionContainer(pathsFor("pod.example"), "https://pod.example/obs/abc.jsonld");
    const methods = fetchMock.mock.calls.map(([, init]) => init?.method);
    expect(methods).toEqual(["GET"]);
  });

  it("membuat container (PUT) bila belum ada, dan gagal jelas bila PUT ditolak", async () => {
    fetchMock
      .mockResolvedValueOnce(res(404)) // GET container → belum ada
      .mockResolvedValueOnce(res(201)); // PUT container → sukses
    await ensureInteractionContainer(pathsFor("pod.example"), "https://pod.example/obs/abc.jsonld");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://pod.example/natfun/interactions/abc/");

    fetchMock.mockReset().mockResolvedValueOnce(res(404)).mockResolvedValueOnce(res(403));
    await expect(
      ensureInteractionContainer(pathsFor("pod.example"), "https://pod.example/obs/abc.jsonld"),
    ).rejects.toThrow(/interaksi/);
  });
});

describe("addInteraction — komentar/like pada entri orang lain", () => {
  const actor = "https://alice.example/profile/card#me";
  const obsUrl = "https://admin.example/obs/xyz.jsonld";
  const ownerPaths = pathsFor("admin.example");
  const actorPaths = pathsFor("alice.example");

  it("POST langsung sukses bila container sudah ada", async () => {
    fetchMock
      .mockResolvedValueOnce(res(201, { Location: "https://alice.example/natfun/activities/comments/a.jsonld" }))
      .mockResolvedValueOnce(res(201, { Location: "https://admin.example/natfun/interactions/xyz/r.jsonld" }));
    await commentEntry(actor, actorPaths, obsUrl, ownerPaths, "halo");
    const methods = fetchMock.mock.calls.map(([, i]) => i?.method);
    expect(methods).toEqual(["PUT", "POST"]);
  });

  it("owner: POST 404 → buat container → POST ulang sukses", async () => {
    fetchMock
      .mockResolvedValueOnce(res(201, { Location: "https://admin.example/x.jsonld" })) // PUT doc
      .mockResolvedValueOnce(res(404)) // POST ref → container belum ada
      .mockResolvedValueOnce(res(404)) // GET container
      .mockResolvedValueOnce(res(201)) // PUT container (owner berhak)
      .mockResolvedValueOnce(res(201, { Location: "https://admin.example/natfun/interactions/xyz/r.jsonld" }));
    await commentEntry("https://admin.example/profile/card#me", ownerPaths, obsUrl, ownerPaths, "halo");
    const methods = fetchMock.mock.calls.map(([, i]) => i?.method);
    expect(methods).toEqual(["PUT", "POST", "GET", "PUT", "POST"]);
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://admin.example/natfun/interactions/xyz/");
  });

  it("bukan owner: container belum ada → error JELAS (bukan 403 misterius) + doc di Pod aktor dibersihkan", async () => {
    fetchMock
      .mockResolvedValueOnce(res(201, { Location: "https://alice.example/x.jsonld" })) // PUT doc aktor
      .mockResolvedValueOnce(res(404)) // POST ref gagal (container tidak ada)
      .mockResolvedValueOnce(res(204)); // DELETE bersih-bersih doc aktor
    await expect(commentEntry(actor, actorPaths, obsUrl, ownerPaths, "halo")).rejects.toThrow(
      /belum disiapkan|pemilik entri/i,
    );
    const last = fetchMock.mock.calls.at(-1);
    expect(last?.[1]?.method).toBe("DELETE");
  });
});

describe("D10 — dokumen Like/Note memakai kunci prefix as: (konsistensi JSON-LD)", () => {
  const actor = "https://alice.example/profile/card#me";
  const obsUrl = "https://admin.example/obs/xyz.jsonld";
  const ownerPaths = pathsFor("admin.example");
  const actorPaths = pathsFor("alice.example");

  it("likeEntry menyimpan as:actor, as:object, as:published", async () => {
    fetchMock.mockResolvedValue(res(201, { Location: "https://alice.example/x.jsonld" }));
    await likeEntry(actor, actorPaths, obsUrl, ownerPaths);
    const putBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(putBody["as:actor"]).toBe(actor);
    expect(putBody["as:object"]).toBe(obsUrl);
    expect(putBody["as:published"]).toBeTruthy();
  });

  it("commentEntry menyimpan as:attributedTo, as:content, as:inReplyTo", async () => {
    fetchMock.mockResolvedValue(res(201, { Location: "https://alice.example/x.jsonld" }));
    await commentEntry(actor, actorPaths, obsUrl, ownerPaths, "halo");
    const putBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(putBody["as:attributedTo"]).toBe(actor);
    expect(putBody["as:content"]).toBe("halo");
    expect(putBody["as:inReplyTo"]).toBe(obsUrl);
  });

  it("verifiedInteractions tetap membaca dokumen prefiks (likes/comments terisi)", async () => {
    const { verifiedInteractions } = await import("@/lib/interactions");
    vi.spyOn(await import("@/lib/ldp"), "listContainer").mockResolvedValue([
      "https://admin.example/natfun/interactions/xyz/r1.jsonld",
    ]);
    fetchMock.mockImplementation((url: string) => {
      if (url === ALICE_WEBID)
        return Promise.resolve(new Response(ALICE_TURTLE, { status: 200, headers: { "Content-Type": "text/turtle" } }));
      if (url.includes("/natfun/interactions/xyz/r1.jsonld"))
        return Promise.resolve(
          jsonRes({
            "as:actor": ALICE_WEBID,
            "natfun:resource": "https://alice.example/natfun/activities/likes/l1.jsonld",
            "natfun:kind": "Like",
          }),
        );
      if (url.includes("l1.jsonld"))
        return Promise.resolve(
          jsonRes({ "as:actor": ALICE_WEBID, "as:object": obsUrl, "as:published": "2026-01-01T00:00:00Z" }),
        );
      return Promise.resolve(res(404));
    });
    const out = await verifiedInteractions(ownerPaths, obsUrl);
    expect(out.likes).toHaveLength(1);
  });

  it("findMyLike menemukan like milik sendiri dari dokumen prefiks", async () => {
    vi.spyOn(await import("@/lib/ldp"), "listContainer").mockResolvedValue([
      "https://alice.example/natfun/activities/likes/l1.jsonld",
    ]);
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("l1.jsonld"))
        return Promise.resolve(
          jsonRes({ "as:actor": ALICE_WEBID, "as:object": obsUrl, "as:published": "2026-01-01T00:00:00Z" }),
        );
      return Promise.resolve(res(404));
    });
    const url = await findMyLike(actor, actorPaths, obsUrl);
    expect(url).toBe("https://alice.example/natfun/activities/likes/l1.jsonld");
  });
});

describe("D5 — pembersihan stale refs", () => {
  it("deleteStaleRefs menghapus tiap ref (best effort, error tidak melempar)", async () => {
    const { deleteStaleRefs } = await import("@/lib/interactions");
    fetchMock
      .mockResolvedValueOnce(res(204))
      .mockResolvedValueOnce(res(404))
      .mockRejectedValueOnce(new Error("network"));
    await deleteStaleRefs([
      "https://admin.example/natfun/interactions/xyz/s1.jsonld",
      "https://admin.example/natfun/interactions/xyz/s2.jsonld",
      "https://admin.example/natfun/interactions/xyz/s3.jsonld",
    ]);
    const methods = fetchMock.mock.calls.map(([, i]) => i?.method);
    expect(methods).toEqual(["DELETE", "DELETE", "DELETE"]);
  });
});

describe("verifiedInteractions — resiliensi & cache profil", () => {
  beforeEach(() => {
    clearProfileCache();
  });

  it("ref yang gagal diverifikasi masuk staleRefs, ref lain tetap diproses", async () => {
    const ownerPaths = pathsFor("admin.example");
    const obsUrl = "https://admin.example/obs/xyz.jsonld";
    const { listContainer } = await import("@/lib/ldp");
    vi.spyOn(await import("@/lib/ldp"), "listContainer").mockResolvedValue([
      "https://admin.example/natfun/interactions/xyz/r1.jsonld",
      "https://admin.example/natfun/interactions/xyz/r2.jsonld",
    ]);
    void listContainer;
    const refs: Record<string, unknown> = {
      "https://admin.example/natfun/interactions/xyz/r1.jsonld": {
        "as:actor": "https://alice.example/profile/card#me",
        "natfun:resource": "https://alice.example/natfun/activities/comments/c1.jsonld",
        "natfun:kind": "Note",
      },
      "https://admin.example/natfun/interactions/xyz/r2.jsonld": {
        "as:actor": "https://bob.example/profile/card#me",
        "natfun:resource": "https://bob.example/natfun/activities/comments/c2.jsonld",
        "natfun:kind": "Note",
      },
    };
    fetchMock.mockImplementation((url: string) => {
      if (url === ALICE_WEBID) return Promise.resolve(new Response(ALICE_TURTLE, { status: 200, headers: { "Content-Type": "text/turtle" } }));
      if (url.includes("r2.jsonld")) return Promise.resolve(res(404)); // ref r2 tidak terbaca
      if (url.includes("/natfun/interactions/xyz/r1.jsonld")) return Promise.resolve(jsonRes(refs[url]));
      if (url.includes("c1.jsonld"))
        return Promise.resolve(
          jsonRes({
            attributedTo: "https://alice.example/profile/card#me",
            content: "hai",
            published: "2026-01-01T00:00:00Z",
          }),
        );
      return Promise.resolve(res(404));
    });
    const { verifiedInteractions } = await import("@/lib/interactions");
    const out = await verifiedInteractions(ownerPaths, obsUrl);
    expect(out.comments).toHaveLength(1);
    expect(out.staleRefs).toEqual(["https://admin.example/natfun/interactions/xyz/r2.jsonld"]);
  });

  it("profil aktor di-cache: dua ref dari aktor yang sama → profil hanya di-fetch sekali (B6)", async () => {
    const ownerPaths = pathsFor("admin.example");
    const obsUrl = "https://admin.example/obs/xyz.jsonld";
    vi.spyOn(await import("@/lib/ldp"), "listContainer").mockResolvedValue([
      "https://admin.example/natfun/interactions/xyz/r1.jsonld",
      "https://admin.example/natfun/interactions/xyz/r3.jsonld",
    ]);
    const refs: Record<string, unknown> = {
      "https://admin.example/natfun/interactions/xyz/r1.jsonld": {
        "as:actor": ALICE_WEBID,
        "natfun:resource": "https://alice.example/natfun/activities/comments/c1.jsonld",
        "natfun:kind": "Note",
      },
      "https://admin.example/natfun/interactions/xyz/r3.jsonld": {
        "as:actor": ALICE_WEBID,
        "natfun:resource": "https://alice.example/natfun/activities/comments/c3.jsonld",
        "natfun:kind": "Note",
      },
    };
    fetchMock.mockImplementation((url: string) => {
      if (url === ALICE_WEBID) return Promise.resolve(new Response(ALICE_TURTLE, { status: 200, headers: { "Content-Type": "text/turtle" } }));
      if (url.includes("/natfun/interactions/xyz/r1.jsonld") || url.includes("/natfun/interactions/xyz/r3.jsonld"))
        return Promise.resolve(jsonRes(refs[url]));
      return Promise.resolve(
        jsonRes({
          attributedTo: ALICE_WEBID,
          content: "hai",
          published: "2026-01-01T00:00:00Z",
        }),
      );
    });
    const { verifiedInteractions } = await import("@/lib/interactions");
    const out = await verifiedInteractions(ownerPaths, obsUrl);
    expect(out.comments).toHaveLength(2);
    const profileFetches = fetchMock.mock.calls.filter(([u]) => String(u) === ALICE_WEBID);
    expect(profileFetches).toHaveLength(1);
  });
});