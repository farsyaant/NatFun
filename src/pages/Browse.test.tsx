import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/lib/appState";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/catalog", () => ({
  loadValidEntries: vi.fn(),
  clearObservationCache: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import { loadValidEntries, clearObservationCache } from "@/lib/catalog";
import Browse from "@/pages/Browse";
import type { CatalogEntry } from "@/lib/vocab";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const loadValidEntriesMock = loadValidEntries as unknown as ReturnType<typeof vi.fn>;
const clearCacheMock = clearObservationCache as unknown as ReturnType<typeof vi.fn>;

function fakeAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    profile: { webId: "https://parent-a.example/card#me", name: "Alice", storage: null },
    role: "Parent",
    storage: "https://parent-a.example/",
    podPaths: null as unknown as AppState["podPaths"],
    officialRoot: "https://official.example/natfun/",
    catalog: { "@context": {}, "@type": "Collection", items: [] },
    isNewPod: false,
    ...overrides,
  };
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "e1",
    source: "official",
    observationUrl: "https://o.example/obs/1.jsonld",
    ownerWebId: "https://o.example/card#me",
    localName: "Komodo",
    scientificName: "Varanus komodoensis",
    kingdom: "Animalia",
    taxonClass: "Reptilia",
    family: "Varanidae",
    province: "Nusa Tenggara Timur",
    habitat: "Sabana",
    conservationStatus: "EN",
    thumbnailUrl: "https://o.example/photos/1.jpg",
    approvedAt: "",
    ...overrides,
  };
}

function renderBrowse() {
  return render(
    <MemoryRouter initialEntries={["/browse"]}>
      <Routes>
        <Route path="/browse" element={<Browse />} />
        <Route path="/entry/:entryId" element={<p>DETAIL</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthMock.mockReset();
  loadValidEntriesMock.mockReset();
  loadValidEntriesMock.mockResolvedValue({ verified: [], dead: [], transient: 0 });
  useAuthMock.mockReturnValue({ state: fakeAppState(), reloadCatalog: vi.fn() });
});

describe("Browse — katalog instan + verifikasi latar belakang (poin 5)", () => {
  it("KRITERIA SUKSES: SEMUA entri index tampil INSTAN tanpa menunggu verifikasi", async () => {
    // verifikasi tidak pernah selesai (berjalan di belakang) — entri tetap tampil
    loadValidEntriesMock.mockReturnValue(new Promise(() => {}));
    useAuthMock.mockReturnValue({
      state: fakeAppState({
        catalog: {
          "@context": {},
          "@type": "Collection",
          items: [entry(), entry({ id: "e2", localName: "Rafflesia", observationUrl: "https://o.example/obs/2.jsonld" })],
        },
      }),
      reloadCatalog: vi.fn(),
    });
    renderBrowse();
    expect(await screen.findByText("Komodo")).toBeInTheDocument();
    expect(screen.getByText("Rafflesia")).toBeInTheDocument();
  });

  it("entri yang benar-benar hilang (dead) disembunyikan setelah verifikasi", async () => {
    loadValidEntriesMock.mockResolvedValue({
      verified: [],
      dead: ["https://o.example/obs/2.jsonld"],
      transient: 0,
    });
    useAuthMock.mockReturnValue({
      state: fakeAppState({
        catalog: {
          "@context": {},
          "@type": "Collection",
          items: [entry(), entry({ id: "e2", localName: "Rafflesia", observationUrl: "https://o.example/obs/2.jsonld" })],
        },
      }),
      reloadCatalog: vi.fn(),
    });
    renderBrowse();
    expect(await screen.findByText("Komodo")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Rafflesia")).not.toBeInTheDocument());
    expect(screen.getByText("Komodo")).toBeInTheDocument();
  });

  it("gagal sementara (transient) → entri TETAP tampil + banner dengan tombol Coba lagi", async () => {
    loadValidEntriesMock.mockResolvedValue({ verified: [], dead: [], transient: 1 });
    useAuthMock.mockReturnValue({
      state: fakeAppState({
        catalog: { "@context": {}, "@type": "Collection", items: [entry()] },
      }),
      reloadCatalog: vi.fn(),
    });
    renderBrowse();
    expect(await screen.findByText("Komodo")).toBeInTheDocument();
    const banner = await screen.findByRole("status");
    expect(banner.textContent).toMatch(/belum terverifikasi|coba lagi/i);
    await userEvent.click(screen.getByRole("button", { name: /Coba lagi/i }));
    expect(clearCacheMock).toHaveBeenCalled();
    expect(loadValidEntriesMock).toHaveBeenCalledTimes(2);
  });

  it("officialRoot null → pesan konfigurasi jelas, bukan macet di 'Memuat katalog…'", async () => {
    useAuthMock.mockReturnValue({
      state: fakeAppState({ officialRoot: null }),
      reloadCatalog: vi.fn(),
    });
    renderBrowse();
    await waitFor(() => {
      expect(screen.queryByText("Memuat katalog…")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Official Pod tidak dapat diakses/)).toBeInTheDocument();
  });

  it("loadValidEntries melempar error → tampilkan pesan error merah, tidak crash", async () => {
    loadValidEntriesMock.mockRejectedValue(new Error("boom"));
    useAuthMock.mockReturnValue({ state: fakeAppState(), reloadCatalog: vi.fn() });
    renderBrowse();
    await waitFor(() => expect(screen.getByText(/Gagal memuat katalog/)).toBeInTheDocument());
  });
});