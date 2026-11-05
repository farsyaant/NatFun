import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/observations", () => ({
  uploadObservation: vi.fn(),
  submitForReview: vi.fn(),
}));
vi.mock("@/lib/catalog", () => ({
  addCatalogEntry: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import { uploadObservation } from "@/lib/observations";
import Upload from "@/pages/Upload";
import { fakeAppState, fakePaths } from "@/test/helpers";

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const uploadMock = uploadObservation as unknown as ReturnType<typeof vi.fn>;

const FILE = new File(["x"], "foto.jpg", { type: "image/jpeg" });

async function fillAndSubmit() {
  const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await userEvent.upload(fileInput, FILE);
  await userEvent.type(screen.getByPlaceholderText("Mammalia, Aves, …"), "Reptilia");
  await userEvent.type(screen.getByPlaceholderText("Hominidae, …"), "Varanidae");
  const selects = document.querySelectorAll<HTMLSelectElement>("select");
  await userEvent.selectOptions(selects[1]!, "Bali"); // provinsi
  await userEvent.selectOptions(selects[2]!, "Sabana"); // habitat
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.type(screen.getByLabelText(/Nama lokal/), "Komodo");
  await userEvent.type(screen.getByLabelText(/Nama ilmiah/), "Varanus komodoensis");
  await userEvent.click(screen.getByRole("button", { name: /Unggah ke Pod saya/ }));
}

function renderUpload() {
  render(
    <MemoryRouter>
      <Upload />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Upload (D7 — guard officialRoot)", () => {
  it("admin tanpa officialRoot → error jelas, TIDAK menyentuh Pod", async () => {
    useAuthMock.mockReturnValue({
      state: fakeAppState({
        role: "Admin",
        officialRoot: null,
        podPaths: fakePaths("admin.example"),
      }),
      refreshCatalog: vi.fn(),
    });
    renderUpload();
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/Official Pod/i);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("officialRoot ada → unggah berjalan", async () => {
    uploadMock.mockResolvedValue({
      observationUrl: "https://admin.example/natfun/observations/x.jsonld",
      photoUrl: "https://admin.example/natfun/photos/x.jpg",
      thumbUrl: "https://admin.example/natfun/photos/x_thumb.jpg",
    });
    useAuthMock.mockReturnValue({
      state: fakeAppState({
        role: "Admin",
        officialRoot: "https://admin.example/natfun/",
        podPaths: fakePaths("admin.example"),
        catalog: { "@context": {}, "@type": "Collection", items: [] },
      }),
      refreshCatalog: vi.fn(),
    });
    renderUpload();
    await fillAndSubmit();
    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
  });
});