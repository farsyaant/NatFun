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
});