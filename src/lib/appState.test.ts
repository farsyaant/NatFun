import { describe, expect, it } from "vitest";
import { resolveRole } from "@/lib/appState";

function deps(links: Record<string, unknown | null>) {
  return {
    listUrls: async (c: string) => Object.keys(links).filter((u) => u.startsWith(c)),
    readDoc: async (u: string): Promise<Record<string, unknown> | null> => (u in links ? (links[u] as Record<string, unknown>) : null),
  };
}

describe("resolveRole (FR-ROLE-01)", () => {
  const officialRoot = "https://official.example/natfun/";

  it("link accepted di Official Pod → Child", async () => {
    const d = deps({
      "https://official.example/natfun/child-links/l1.jsonld": {
        "natfun:childWebId": "https://charlie.example/profile/card#me",
        "natfun:status": "accepted",
        "natfun:linkId": "l1",
      },
    });
    const role = await resolveRole(
      "https://charlie.example/profile/card#me",
      officialRoot,
      "https://charlie.example/",
      d,
    );
    expect(role).toBe("Child");
  });

  it("link pending TAPI acceptance ada di Pod anak sendiri → Child (fix D1)", async () => {
    const d = deps({
      "https://official.example/natfun/child-links/l1.jsonld": {
        "natfun:childWebId": "https://charlie.example/profile/card#me",
        "natfun:status": "pending",
        "natfun:linkId": "l1",
      },
      "https://charlie.example/natfun/family/acceptances/l1.jsonld": {
        "natfun:linkId": "l1",
      },
    });
    const role = await resolveRole(
      "https://charlie.example/profile/card#me",
      officialRoot,
      "https://charlie.example/",
      d,
    );
    expect(role).toBe("Child");
  });

  it("link pending tanpa acceptance → tetap Parent", async () => {
    const d = deps({
      "https://official.example/natfun/child-links/l1.jsonld": {
        "natfun:childWebId": "https://charlie.example/profile/card#me",
        "natfun:status": "pending",
        "natfun:linkId": "l1",
      },
    });
    const role = await resolveRole(
      "https://charlie.example/profile/card#me",
      officialRoot,
      "https://charlie.example/",
      d,
    );
    expect(role).toBe("Parent");
  });

  it("tanpa link sama sekali → Parent", async () => {
    const d = deps({});
    const role = await resolveRole(
      "https://alice.example/profile/card#me",
      officialRoot,
      "https://alice.example/",
      d,
    );
    expect(role).toBe("Parent");
  });
});