import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { AppState } from "@/lib/appState";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";

const useAuthMock = useAuth as unknown as Mock;

function fakeAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    profile: { webId: "https://alice.example/profile/card#me", name: "Alice", storage: null },
    role: "Parent",
    storage: "https://alice.example/",
    podPaths: null as unknown as AppState["podPaths"],
    officialRoot: "https://official.example/natfun/",
    catalog: { "@context": {}, "@type": "Collection", items: [] },
    isNewPod: false,
    ...overrides,
  };
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<p>BROWSE_PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Landing", () => {
  it("saat belum siap, menampilkan indikator memuat dan tetap di /", () => {
    useAuthMock.mockReturnValue({
      ready: false,
      session: { info: { isLoggedIn: false } },
      state: null,
      error: null,
      login: vi.fn(),
    });
    renderLanding();
    expect(screen.getByText(/Memuat/)).toBeInTheDocument();
    expect(screen.queryByText("BROWSE_PAGE")).not.toBeInTheDocument();
  });

  it("saat belum login, menampilkan form IdP dan tidak pindah halaman", () => {
    useAuthMock.mockReturnValue({
      ready: true,
      session: { info: { isLoggedIn: false } },
      state: null,
      error: null,
      login: vi.fn(),
    });
    renderLanding();
    expect(screen.getByRole("button", { name: /Masuk dengan WebID/ })).toBeInTheDocument();
    expect(screen.queryByText("BROWSE_PAGE")).not.toBeInTheDocument();
  });

  it("saat login berhasil dan state dimuat, redirect ke /browse (TC-01.3)", () => {
    useAuthMock.mockReturnValue({
      ready: true,
      session: { info: { isLoggedIn: true } },
      state: fakeAppState(),
      error: null,
      login: vi.fn(),
    });
    renderLanding();
    expect(screen.getByText("BROWSE_PAGE")).toBeInTheDocument();
    expect(screen.queryByText(/Memuat Pod Anda/)).not.toBeInTheDocument();
  });

  it("redirect tidak memodifikasi window.location.hash (anti-pola side effect saat render)", () => {
    useAuthMock.mockReturnValue({
      ready: true,
      session: { info: { isLoggedIn: true } },
      state: fakeAppState(),
      error: null,
      login: vi.fn(),
    });
    renderLanding();
    expect(window.location.hash).toBe("");
  });

  it("saat login tapi gagal memuat Pod, menampilkan pesan error", () => {
    useAuthMock.mockReturnValue({
      ready: true,
      session: { info: { isLoggedIn: true } },
      state: null,
      error: "Storage Pod tidak dapat ditemukan.",
      login: vi.fn(),
    });
    renderLanding();
    expect(screen.getByText(/Storage Pod tidak dapat ditemukan/)).toBeInTheDocument();
    expect(screen.queryByText("BROWSE_PAGE")).not.toBeInTheDocument();
  });
});