import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/social", () => ({
  readFollowingList: vi.fn(),
  isMutual: vi.fn(),
}));
vi.mock("@/lib/messages", () => ({
  readInbox: vi.fn(),
  readSent: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { useAuth } from "@/context/AuthContext";
import { fetch } from "@/lib/auth";
import { isMutual, readFollowingList } from "@/lib/social";
import { readInbox, readSent } from "@/lib/messages";
import { clearProfileCache } from "@/lib/profile";
import Messages from "@/pages/Messages";
import { fakeAppState, fakePaths } from "@/test/helpers";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const listMock = readFollowingList as unknown as ReturnType<typeof vi.fn>;
const isMutualMock = isMutual as unknown as ReturnType<typeof vi.fn>;
const inboxMock = readInbox as unknown as ReturnType<typeof vi.fn>;
const sentMock = readSent as unknown as ReturnType<typeof vi.fn>;
const fetchMock = fetch as unknown as Mock;

const BOB = "https://bob.example/profile/card#me";
const BOB_TURTLE = `<${BOB}> <http://xmlns.com/foaf/0.1/name> "Bob" ; <http://www.w3.org/ns/pim/space#storage> <https://bob.example/> .`;

beforeEach(() => {
  vi.clearAllMocks();
  clearProfileCache();
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    (url: string) =>
      new Response(url === BOB ? BOB_TURTLE : "nf", {
        status: url === BOB ? 200 : 404,
        headers: { "Content-Type": "text/turtle" },
      }),
  );
  listMock.mockResolvedValue({
    "@context": "",
    "@type": "Collection",
    actor: "",
    items: [{ object: BOB, published: "" }],
  });
  inboxMock.mockResolvedValue([
    { id: "m1", from: BOB, to: "https://alice.example/profile/card#me", content: "hai", published: "2026-01-01T00:00:00Z" },
  ]);
  sentMock.mockResolvedValue([]);
  isMutualMock.mockResolvedValue(true);
  useAuthMock.mockReturnValue({
    state: fakeAppState({ podPaths: fakePaths("alice.example") }),
  });
});

describe("Messages (B7 — N+1 profil)", () => {
  it("mutual tampil dengan nama profil", async () => {
    render(<Messages />);
    await waitFor(() => expect(screen.getByText("Bob")).toBeInTheDocument());
  });

  it("B7: profil mutual di-cache — isMutual + nama hanya fetch profil sekali", async () => {
    render(<Messages />);
    await waitFor(() => expect(screen.getByText("Bob")).toBeInTheDocument());
    const profileFetches = fetchMock.mock.calls.filter(([u]) => String(u) === BOB);
    expect(profileFetches).toHaveLength(1);
  });
});