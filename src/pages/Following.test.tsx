import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/social", () => ({
  readFollowingList: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  isMutual: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { useAuth } from "@/context/AuthContext";
import { fetch } from "@/lib/auth";
import { followUser, isMutual, readFollowingList } from "@/lib/social";
import Following from "@/pages/Following";
import { fakeAppState, fakePaths } from "@/test/helpers";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const followUserMock = followUser as unknown as ReturnType<typeof vi.fn>;
const listMock = readFollowingList as unknown as ReturnType<typeof vi.fn>;
const isMutualMock = isMutual as unknown as ReturnType<typeof vi.fn>;
const fetchMock = fetch as unknown as Mock;

const BOB = "https://bob.example/profile/card#me";
const BOB_TURTLE = `<${BOB}> <http://xmlns.com/foaf/0.1/name> "Bob" ; <http://www.w3.org/ns/pim/space#storage> <https://bob.example/> .`;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    (url: string) =>
      new Response(url === BOB ? BOB_TURTLE : "not found", {
        status: url === BOB ? 200 : 404,
        headers: { "Content-Type": "text/turtle" },
      }),
  );
  listMock.mockResolvedValue({ "@context": "", "@type": "Collection", actor: "", items: [] });
  isMutualMock.mockResolvedValue(false);
  useAuthMock.mockReturnValue({ state: fakeAppState({ podPaths: fakePaths("alice.example") }) });
});

describe("Following", () => {
  it("B7: profil target di-cache — duplikat target → profil hanya di-fetch sekali", async () => {
    listMock.mockResolvedValue({
      "@context": "",
      "@type": "Collection",
      actor: "",
      items: [{ object: BOB, published: "" }, { object: BOB, published: "" }],
    });
    render(<Following />);
    await waitFor(() => expect(screen.getAllByText("Bob").length).toBeGreaterThan(0));
    const profileFetches = fetchMock.mock.calls.filter(([u]) => String(u) === BOB);
    expect(profileFetches).toHaveLength(1);
  });

  it("D4: followUser gagal → error tampil (role=alert), tidak unhandled rejection", async () => {
    followUserMock.mockRejectedValue(new Error("Gagal menulis ke Pod: 403"));
    render(<Following />);
    await userEvent.type(screen.getByPlaceholderText(/WebID Parent/), BOB);
    await userEvent.click(screen.getByRole("button", { name: "Ikuti" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/403/);
  });

  it("D4: follow sukses → daftar dimuat ulang, tanpa error", async () => {
    followUserMock.mockResolvedValue(undefined);
    render(<Following />);
    await userEvent.type(screen.getByPlaceholderText(/WebID Parent/), BOB);
    await userEvent.click(screen.getByRole("button", { name: "Ikuti" }));
    await waitFor(() => expect(followUserMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});