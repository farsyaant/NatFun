import { describe, expect, it, vi } from "vitest";
import { findStorageRoot } from "./podProfile.mjs";

function turtleResponse(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/turtle" },
    // Response.url di Node tidak bisa diset lewat konstruktor; solid-client
    // memakai header Content-Location? Kita sediakan absolute IRI di turtle.
    status: 200,
  }) as unknown as globalThis.Response & { url: string };
}

describe("findStorageRoot", () => {
  it("mengembalikan pim:storage dari profil dan menormalkan trailing slash", async () => {
    const webId = "https://alice.example/profile/card#me";
    const fetchMock = vi.fn().mockResolvedValue(
      turtleResponse(
        `<https://alice.example/profile/card#me> <http://www.w3.org/ns/pim/space#storage> <https://alice.example/mypod> .`,
      ),
    );
    const storage = await findStorageRoot(webId, { fetch: fetchMock });
    expect(storage).toBe("https://alice.example/mypod/");
  });

  it("fallback ke root origin saat profil tidak punya pim:storage", async () => {
    const webId = "https://alice.example/profile/card#me";
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "HEAD" && url === "https://alice.example/") {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve(
        turtleResponse(`<https://alice.example/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Alice" .`),
      );
    });
    const storage = await findStorageRoot(webId, { fetch: fetchMock });
    expect(storage).toBe("https://alice.example/");
  });

  it("melempar error bila storage tak ditemukan di profil maupun fallback", async () => {
    const webId = "https://alice.example/profile/card#me";
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    await expect(findStorageRoot(webId, { fetch: fetchMock })).rejects.toThrow(/pim:storage/);
  });
});