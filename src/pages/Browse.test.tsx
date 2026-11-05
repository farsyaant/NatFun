import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/lib/appState";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/catalog", () => ({
  loadValidEntries: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import { loadValidEntries } from "@/lib/catalog";
import Browse from "@/pages/Browse";
import type { CatalogEntry } from "@/lib/vocab";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const loadValidEntriesMock = loadValidEntries as unknown as ReturnType<typeof vi.fn>;

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
  loadValidEntriesMock.mockResolvedValue([]);
  useAuthMock.mockReturnValue({ reloadCatalog: vi.fn() });
});

describe("Browse", () => {
  it("officialRoot null → pesan konfigurasi jelas, bukan macet di 'Memuat katalog…'", async () => {
    useAuthMock.mockReturnValue({ state: fakeAppState({ officialRoot: null }), reloadCatalog: vi.fn() });
    renderBrowse();
    await waitFor(() => {
      expect(screen.queryByText("Memuat katalog…")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Official Pod tidak dapat diakses/)).toBeInTheDocument();
    expect(screen.queryByText("Komodo")).not.toBeInTheDocument();
  });

  it("entri dari loadValidEntries tampil sebagai kartu (nama + provinsi)", async () => {
    loadValidEntriesMock.mockResolvedValue([entry()]);
    useAuthMock.mockReturnValue({ state: fakeAppState(), reloadCatalog: vi.fn() });
    renderBrowse();
    await waitFor(() => expect(screen.getByText("Komodo")).toBeInTheDocument());
    expect(screen.getAllByText(/Nusa Tenggara Timur/).length).toBeGreaterThan(0);
  });

  it("loadValidEntries melempar error → tampilkan pesan error merah, tidak crash", async () => {
    loadValidEntriesMock.mockRejectedValue(new Error("boom"));
    useAuthMock.mockReturnValue({ state: fakeAppState(), reloadCatalog: vi.fn() });
    renderBrowse();
    await waitFor(() => expect(screen.getByText(/Gagal memuat katalog/)).toBeInTheDocument());
  });
});