import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  fetch: vi.fn(),
}));

import { fetch } from "@/lib/auth";
import { initUserPod, initOfficialPod } from "@/lib/podInit";

const fetchMock = fetch as unknown as Mock;

/** Kumpulkan body semua PUT *.acl yang dilakukan. */
function aclBodies(): string[] {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url).endsWith(".acl") && init?.method === "PUT")
    .map(([, init]) => String(init?.body));
}

beforeEach(() => {
  fetchMock.mockReset();
  // Semua GET/PUT dianggap sukses (fokus: isi body ACL)
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
});

describe("podInit — owner ACL", () => {
  it("initUserPod menulis acl:agent dengan WebID LENGKAP termasuk fragment #me", async () => {
    const webId = "https://alice.example/profile/card#me";
    await initUserPod(webId, "https://alice.example/");
    const bodies = aclBodies();
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.join("\n")).toContain(`acl:agent <${webId}>`);
    expect(bodies.join("\n")).not.toContain("<https://alice.example/profile/card>");
  });

  it("initOfficialPod menulis acl:agent dengan WebID Admin LENGKAP termasuk fragment #me", async () => {
    const adminWebId = "https://admin.example/profile/card#me";
    await initOfficialPod(adminWebId, "https://admin.example/");
    const bodies = aclBodies();
    expect(bodies.length).toBeGreaterThan(0);
    expect(bodies.join("\n")).toContain(`acl:agent <${adminWebId}>`);
    expect(bodies.join("\n")).not.toContain("<https://admin.example/profile/card>");
  });

  it("SOC-03: container social/ ikut dibuat dan di-ACL read:auth (mutual butuh baca lintas Pod)", async () => {
    const webId = "https://alice.example/profile/card#me";
    await initUserPod(webId, "https://alice.example/");
    // container social/ dibuat (GET/PUT)
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls).toContain("https://alice.example/natfun/social/");
    // ACL social/: authenticated read + default (untuk following.jsonld)
    const socialAcl = fetchMock.mock.calls.find(
      ([u, init]) => String(u) === "https://alice.example/natfun/social/.acl" && init?.method === "PUT",
    );
    expect(socialAcl).toBeDefined();
    const body = String(socialAcl?.[1]?.body);
    expect(body).toContain("acl:agentClass acl:AuthenticatedAgent");
    expect(body).toContain("acl:mode acl:Read");
    expect(body).toContain(`acl:agent <${webId}>`);
  });
});