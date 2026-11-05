import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/family", () => ({
  requestChildLink: vi.fn(),
  pendingLinksFor: vi.fn(),
  acceptChildLink: vi.fn(),
  listMyChildLinks: vi.fn(),
}));
vi.mock("@/lib/profile", () => ({
  fetchProfile: vi.fn(),
  displayName: vi.fn((p) => p?.name ?? p?.webId ?? "?"),
  webIdExists: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import { acceptChildLink, pendingLinksFor } from "@/lib/family";
import { fetchProfile } from "@/lib/profile";
import Family from "@/pages/Family";
import { fakeAppState } from "@/test/helpers";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const acceptMock = acceptChildLink as unknown as ReturnType<typeof vi.fn>;
const pendingMock = pendingLinksFor as unknown as ReturnType<typeof vi.fn>;
const fetchProfileMock = fetchProfile as unknown as ReturnType<typeof vi.fn>;

const LINK = {
  linkId: "l1",
  parentWebId: "https://alice.example/profile/card#me",
  childWebId: "https://charlie.example/profile/card#me",
  status: "pending" as const,
  created: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchProfileMock.mockResolvedValue({ webId: LINK.parentWebId, name: "Alice", storage: null });
  pendingMock.mockResolvedValue([LINK]);
  useAuthMock.mockReturnValue({
    state: fakeAppState({
      role: "Child",
      officialRoot: "https://official.example/natfun/",
    }),
  });
});

describe("Family (D4 — error handling accept)", () => {
  it("anak menekan Terima saat gagal → error tampil (role=alert), tidak unhandled", async () => {
    acceptMock.mockRejectedValue(new Error("Gagal menulis acceptance: 403"));
    render(<Family />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Terima" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Terima" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/403/);
  });

  it("anak menekan Terima saat sukses → pesan konfirmasi", async () => {
    acceptMock.mockResolvedValue(undefined);
    render(<Family />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Terima" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Terima" }));
    await waitFor(() => expect(screen.getByText(/Peran Child aktif/)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});