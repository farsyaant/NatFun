import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ fetchObservationDocument: vi.fn() }));
vi.mock("@/lib/interactions", () => ({
  verifiedInteractions: vi.fn(),
  likeEntry: vi.fn(),
  commentEntry: vi.fn(),
  findMyLike: vi.fn(),
  removeLike: vi.fn(),
  removeInteractionRef: vi.fn(),
  deleteStaleRefs: vi.fn(),
}));
vi.mock("@/lib/profile", () => ({
  fetchProfile: vi.fn(),
  displayName: vi.fn((p) => p?.name ?? p?.webId ?? "?"),
  storageRootOf: vi.fn(() => "https://admin.example/"),
}));
vi.mock("@/lib/social", () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  isFollowing: vi.fn(),
}));
vi.mock("@/lib/social", () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  isFollowing: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import { commentEntry, removeInteractionRef, verifiedInteractions, deleteStaleRefs } from "@/lib/interactions";
import { fetchProfile } from "@/lib/profile";
import { followUser, isFollowing } from "@/lib/social";
import EntryDetail from "@/pages/EntryDetail";
import { fakeAppState, fakePaths } from "@/test/helpers";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const commentEntryMock = commentEntry as unknown as ReturnType<typeof vi.fn>;
const removeRefMock = removeInteractionRef as unknown as ReturnType<typeof vi.fn>;
const verifiedMock = verifiedInteractions as unknown as ReturnType<typeof vi.fn>;
const deleteStaleRefsMock = deleteStaleRefs as unknown as ReturnType<typeof vi.fn>;
const fetchProfileMock = fetchProfile as unknown as ReturnType<typeof vi.fn>;
const followUserMock = followUser as unknown as ReturnType<typeof vi.fn>;
const isFollowingMock = isFollowing as unknown as ReturnType<typeof vi.fn>;

const OBS_DOC = {
  "dwc:vernacularName": "Komodo",
  "dwc:scientificName": "Varanus komodoensis",
  "dwc:kingdom": "Animalia",
  "dwc:class": "Reptilia",
  "dwc:family": "Varanidae",
  "natfun:province": "Nusa Tenggara Timur",
  "natfun:habitat": "Sabana",
  "natfun:conservationStatus": "EN",
  "schema:image": "../photos/x.jpg",
  "dcterms:creator": { "@id": "https://admin.example/profile/card#me" },
  "dcterms:license": "https://creativecommons.org/licenses/by/4.0/",
};

function renderDetail(entryId = "xyz") {
  return render(
    <MemoryRouter initialEntries={[`/entry/${entryId}`]}>
      <Routes>
        <Route path="/entry/:entryId" element={<EntryDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  verifiedMock.mockResolvedValue({ likes: [], comments: [], staleRefs: [] });
  fetchProfileMock.mockResolvedValue({
    webId: "https://admin.example/profile/card#me",
    name: "Admin",
    storage: "https://admin.example/",
  });
  useAuthMock.mockReturnValue({
    state: fakeAppState({
      role: "Parent",
      officialRoot: "https://admin.example/natfun/",
      catalog: {
        "@context": {},
        "@type": "Collection",
        items: [
          {
            id: "xyz",
            source: "official",
            observationUrl: "https://admin.example/obs/xyz.jsonld",
            ownerWebId: "https://admin.example/profile/card#me",
            localName: "Komodo",
            scientificName: "Varanus komodoensis",
            kingdom: "Animalia",
            taxonClass: "Reptilia",
            family: "Varanidae",
            province: "Nusa Tenggara Timur",
            habitat: "Sabana",
            conservationStatus: "EN",
            thumbnailUrl: "https://admin.example/photos/x.jpg",
            approvedAt: "",
          },
        ],
      },
      podPaths: fakePaths("alice.example"),
    }),
  });
});

describe("EntryDetail — komentar", () => {
  it("menampilkan detail entri dengan form komentar untuk Parent", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OBS_DOC);
    renderDetail();
    await waitFor(() => expect(screen.getByText("Komodo")).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/Tulis komentar/)).toBeInTheDocument();
  });

  it("komentar gagal dikirim → error tampil INLINE dekat form (role=alert), bukan di bawah halaman", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OBS_DOC);
    commentEntryMock.mockRejectedValue(new Error("Komentar/suka gagal: container interaksi entri ini belum disiapkan pemiliknya"));
    renderDetail();
    await waitFor(() => expect(screen.getByPlaceholderText(/Tulis komentar/)).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText(/Tulis komentar/), "halo");
    await userEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/belum disiapkan/i);
  });

  it("sembunyikan komentar gagal → tidak crash, error ditampilkan", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OBS_DOC);
    verifiedMock.mockResolvedValue({
      likes: [],
      comments: [
        {
          refUrl: "https://admin.example/natfun/interactions/xyz/r1.jsonld",
          resourceUrl: "https://bob.example/x.jsonld",
          actor: "https://bob.example/profile/card#me",
          kind: "Note",
          content: "komentar bob",
          published: "2026-01-01T00:00:00Z",
        },
      ],
      staleRefs: [],
    });
    // pemilik entri = alice (viewer sendiri) → tombol sembunyikan muncul
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...OBS_DOC,
      "dcterms:creator": { "@id": "https://alice.example/profile/card#me" },
    });
    useAuthMock.mockReturnValue({
      state: fakeAppState({
        role: "Parent",
        officialRoot: "https://admin.example/natfun/",
        catalog: {
          "@context": {},
          "@type": "Collection",
          items: [
            {
              id: "xyz",
              source: "community",
              observationUrl: "https://admin.example/obs/xyz.jsonld",
              ownerWebId: "https://alice.example/profile/card#me",
              localName: "Komodo",
              scientificName: "Varanus komodoensis",
              kingdom: "Animalia",
              taxonClass: "Reptilia",
              family: "Varanidae",
              province: "Nusa Tenggara Timur",
              habitat: "Sabana",
              conservationStatus: "EN",
              thumbnailUrl: "",
              approvedAt: "",
            },
          ],
        },
        podPaths: fakePaths("alice.example"),
      }),
    });
    removeRefMock.mockRejectedValue(new Error("HTTP 403"));
    renderDetail();
    await waitFor(() => expect(screen.getByText("komentar bob")).toBeInTheDocument());
    await userEvent.click(screen.getByTitle("Sembunyikan komentar"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("komentar bob")).toBeInTheDocument(); // tetap tampil, tidak crash
  });

  it("D5: pemilik entri → stale refs dibersihkan otomatis", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...OBS_DOC,
      "dcterms:creator": { "@id": "https://alice.example/profile/card#me" },
    });
    verifiedMock.mockResolvedValue({
      likes: [],
      comments: [],
      staleRefs: ["https://admin.example/natfun/interactions/xyz/stale1.jsonld"],
    });
    renderDetail();
    await waitFor(() =>
      expect(deleteStaleRefsMock).toHaveBeenCalledWith([
        "https://admin.example/natfun/interactions/xyz/stale1.jsonld",
      ]),
    );
  });

  it("D5: bukan pemilik entri → TIDAK membersihkan stale refs", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OBS_DOC);
    verifiedMock.mockResolvedValue({
      likes: [],
      comments: [],
      staleRefs: ["https://admin.example/natfun/interactions/xyz/stale1.jsonld"],
    });
    renderDetail();
    await waitFor(() => expect(screen.getByText("Komodo")).toBeInTheDocument());
    expect(deleteStaleRefsMock).not.toHaveBeenCalled();
  });
});
describe("SOC-01 — ikuti pemilik entri dari halaman entri", () => {
  const OWNER_BOB = "https://bob.example/profile/card#me";

  beforeEach(() => {
    isFollowingMock.mockResolvedValue(false);
    followUserMock.mockResolvedValue(undefined);
  });

  function stateWithOwner(ownerWebId: string) {
    return fakeAppState({
      role: "Parent",
      officialRoot: "https://official.example/natfun/",
      catalog: {
        "@context": {},
        "@type": "Collection",
        items: [
          {
            id: "xyz",
            source: "community",
            observationUrl: "https://bob.example/obs/xyz.jsonld",
            ownerWebId,
            localName: "Komodo",
            scientificName: "Varanus komodoensis",
            kingdom: "Animalia",
            taxonClass: "Reptilia",
            family: "Varanidae",
            province: "Nusa Tenggara Timur",
            habitat: "Sabana",
            conservationStatus: "EN",
            thumbnailUrl: "",
            approvedAt: "",
          },
        ],
      },
      podPaths: fakePaths("alice.example"),
    });
  }

  it("entri milik Parent lain → tombol Ikuti tampil; klik memanggil followUser dengan officialRoot", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...OBS_DOC,
      "dcterms:creator": { "@id": OWNER_BOB },
    });
    useAuthMock.mockReturnValue({ state: stateWithOwner(OWNER_BOB) });
    renderDetail();
    const btn = await screen.findByRole("button", { name: /Ikuti pemilik/ });
    await userEvent.click(btn);
    await waitFor(() =>
      expect(followUserMock).toHaveBeenCalledWith(
        fakePaths("alice.example"),
        "https://alice.example/profile/card#me",
        OWNER_BOB,
        "https://official.example/natfun/",
      ),
    );
    await waitFor(() => expect(screen.getByText(/Mengikuti pemilik/)).toBeInTheDocument());
  });

  it("entri milik sendiri → tidak ada tombol ikuti", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...OBS_DOC,
      "dcterms:creator": { "@id": "https://alice.example/profile/card#me" },
    });
    useAuthMock.mockReturnValue({
      state: stateWithOwner("https://alice.example/profile/card#me"),
    });
    renderDetail();
    await waitFor(() => expect(screen.getByText("Komodo")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Ikuti pemilik/ })).not.toBeInTheDocument();
  });

  it("entri milik Admin → tidak ada tombol ikuti (SOC-04: Admin bukan Parent)", async () => {
    const { appConfig } = await import("@/config/appConfig");
    const adminWebId = appConfig.adminWebId;
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...OBS_DOC,
      "dcterms:creator": { "@id": adminWebId },
    });
    useAuthMock.mockReturnValue({ state: stateWithOwner(adminWebId) });
    renderDetail();
    await waitFor(() => expect(screen.getByText("Komodo")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Ikuti pemilik/ })).not.toBeInTheDocument();
  });

  it("gagal follow → error tampil (role=alert)", async () => {
    const { fetchObservationDocument } = await import("@/lib/catalog");
    (fetchObservationDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...OBS_DOC,
      "dcterms:creator": { "@id": OWNER_BOB },
    });
    followUserMock.mockRejectedValue(new Error("Tidak bisa mengikuti: pengguna ini berperan Child."));
    useAuthMock.mockReturnValue({ state: stateWithOwner(OWNER_BOB) });
    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: /Ikuti pemilik/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
