import { describe, expect, it } from "vitest";
import { buildAclTurtle } from "./aclTurtle.mjs";

describe("buildAclTurtle", () => {
  it("memakai WebID owner apa adanya — fragment (#me) TIDAK boleh dihapus", () => {
    const owner = "https://alice.example/profile/card#me";
    const t = buildAclTurtle("https://alice.example/natfun/catalog/", owner, true);
    expect(t).toContain("acl:agent <https://alice.example/profile/card#me>");
    expect(t).not.toContain("<https://alice.example/profile/card>");
  });

  it("memberi owner Read+Write+Control dan default saat def=true", () => {
    const t = buildAclTurtle("https://alice.example/natfun/catalog/", "https://alice.example/profile/card#me", true);
    expect(t).toContain("acl:mode acl:Read, acl:Write, acl:Control.");
    expect(t).toContain("acl:default <https://alice.example/natfun/catalog/>");
    // dua blok default: owner & read authenticated
    expect(t.match(/acl:default /g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("memberi acl:AuthenticatedAgent Read", () => {
    const t = buildAclTurtle("https://alice.example/natfun/catalog/", "https://alice.example/profile/card#me", false);
    expect(t).toContain("acl:agentClass acl:AuthenticatedAgent");
    expect(t).toContain("acl:mode acl:Read.");
  });

  it("tanpa def, tidak ada blok acl:default", () => {
    const t = buildAclTurtle("https://alice.example/natfun/catalog/", "https://alice.example/profile/card#me", false);
    expect(t).not.toContain("acl:default");
  });
});