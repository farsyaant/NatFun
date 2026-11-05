import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserPodPaths } from "@/lib/podInit";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

// resolusi peran target dikontrol test (SOC-04)
const resolveRoleMock = vi.fn();
vi.mock("@/lib/appState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/appState")>()),
  resolveRole: (...args: unknown[]) => resolveRoleMock(...args),
}));

import { fetch } from "@/lib/auth";
import { followUser, isFollowing, readFollowingList } from "@/lib/social";

const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;

function paths(host: string): UserPodPaths {
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

const ALICE = "https://alice.example/profile/card#me";
const BOB = "https://bob.example/profile/card#me";
const OFFICIAL = "https://official.example/natfun/";

const BOB_TURTLE = `<${BOB}> <http://xmlns.com/foaf/0.1/name> "Bob" ; <http://www.w3.org/ns/pim/space#storage> <https://bob.example/> .`;

beforeEach(() => {
  vi.clearAllMocks();
  // daftar follow kosong + profil bob tersedia (turtle)
  fetchMock.mockImplementation((url: string) => {
    if (url === BOB) {
      return Promise.resolve(
        new Response(BOB_TURTLE, { status: 200, headers: { "Content-Type": "text/turtle" } }),
      );
    }
    if (String(url).endsWith("following.jsonld")) {
      return Promise.resolve(
        new Response(JSON.stringify({ "@context": "", "@type": "Collection", actor: "", items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });
});

describe("SOC-04 — target follow harus Parent", () => {
  it("target Child → ditolak dengan pesan jelas, follow list TIDAK ditulis", async () => {
    resolveRoleMock.mockResolvedValue("Child");
    await expect(followUser(paths("alice.example"), ALICE, BOB, OFFICIAL)).rejects.toThrow(/Parent/i);
    const put = fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT");
    expect(put).toHaveLength(0);
  });

  it("target Admin → ditolak (hanya Parent yang bisa diikuti)", async () => {
    resolveRoleMock.mockResolvedValue("Admin");
    await expect(followUser(paths("alice.example"), ALICE, BOB, OFFICIAL)).rejects.toThrow(/Parent/i);
    const put = fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT");
    expect(put).toHaveLength(0);
  });

  it("target Parent → tersimpan di follow list", async () => {
    resolveRoleMock.mockResolvedValue("Parent");
    await followUser(paths("alice.example"), ALICE, BOB, OFFICIAL);
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === "PUT");
    expect(put).toBeDefined();
    const body = JSON.parse(String(put?.[1]?.body));
    expect(body.items.some((i: { object: string }) => i.object === BOB)).toBe(true);
  });

  it("follow ganda (sudah diikuti) → tidak menulis ulang", async () => {
    resolveRoleMock.mockResolvedValue("Parent");
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith("following.jsonld")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ "@context": "", "@type": "Collection", actor: "", items: [{ object: BOB, published: "" }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    await followUser(paths("alice.example"), ALICE, BOB, OFFICIAL);
    const put = fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT");
    expect(put).toHaveLength(0);
  });
});

describe("isFollowing (SOC-01)", () => {
  it("true bila target ada di follow list, false bila tidak", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith("following.jsonld")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ "@context": "", "@type": "Collection", actor: "", items: [{ object: BOB, published: "" }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    expect(await isFollowing(paths("alice.example"), BOB)).toBe(true);
    expect(await isFollowing(paths("alice.example"), "https://carol.example/card#me")).toBe(false);
  });

  it("list gagal dibaca → false (bukan throw)", async () => {
    fetchMock.mockResolvedValue(new Response("nf", { status: 403 }));
    expect(await isFollowing(paths("alice.example"), BOB)).toBe(false);
  });

  it("readFollowingList tetap berperilaku lama (fallback daftar kosong)", async () => {
    fetchMock.mockResolvedValue(new Response("nf", { status: 404 }));
    const list = await readFollowingList(paths("alice.example"));
    expect(list.items).toEqual([]);
  });
});