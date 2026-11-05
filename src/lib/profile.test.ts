import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { fetch } from "@/lib/auth";
import { clearProfileCache, fetchProfileCached } from "@/lib/profile";

const fetchMock = fetch as unknown as Mock;

const TURTLE = `<https://alice.example/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Alice" ; <http://www.w3.org/ns/pim/space#storage> <https://alice.example/> .`;

beforeEach(() => {
  fetchMock.mockReset();
  clearProfileCache();
  fetchMock.mockImplementation(
    () => new Response(TURTLE, { status: 200, headers: { "Content-Type": "text/turtle" } }),
  );
});

describe("fetchProfileCached (B6)", () => {
  it("dua pemanggilan untuk WebID sama → profil hanya di-fetch SEKALI", async () => {
    await fetchProfileCached("https://alice.example/profile/card#me");
    await fetchProfileCached("https://alice.example/profile/card#me");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("WebID berbeda → fetch terpisah", async () => {
    await fetchProfileCached("https://alice.example/profile/card#me");
    await fetchProfileCached("https://bob.example/profile/card#me");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearProfileCache memaksa fetch ulang", async () => {
    await fetchProfileCached("https://alice.example/profile/card#me");
    clearProfileCache();
    await fetchProfileCached("https://alice.example/profile/card#me");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("profil gagal tidak di-cache → panggilan berikutnya mencoba lagi", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    await expect(fetchProfileCached("https://alice.example/profile/card#me")).rejects.toThrow();
    await fetchProfileCached("https://alice.example/profile/card#me");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("pemanggilan BERSAMAAN (paralel) untuk WebID sama → fetch sekali (in-flight dedupe)", async () => {
    await Promise.all([
      fetchProfileCached("https://alice.example/profile/card#me"),
      fetchProfileCached("https://alice.example/profile/card#me"),
      fetchProfileCached("https://alice.example/profile/card#me"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});