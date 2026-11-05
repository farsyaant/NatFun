import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { fetch } from "@/lib/auth";
import { clearImageCache } from "@/lib/imageCache";
import AuthImage from "@/components/AuthImage";

const fetchMock = fetch as unknown as Mock;
const createObjectURL = vi.fn(() => "blob:mock-url");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  clearImageCache();
  vi.stubGlobal("URL", Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthImage", () => {
  it("memuat resource terproteksi via sesi fetch lalu menampilkan blob URL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    render(<AuthImage src="https://pod.example/photos/a.jpg" alt="Foto orca" className="h-40" />);
    await waitFor(() => expect(screen.getByAltText("Foto orca")).toBeInTheDocument());
    const img = screen.getByAltText("Foto orca");
    expect(img).toHaveAttribute("src", "blob:mock-url");
    // harus memakai session fetch, BUKAN langsung <img src> (yang dapat 401)
    expect(fetchMock).toHaveBeenCalledWith("https://pod.example/photos/a.jpg", expect.anything());
  });

  it("menampilkan placeholder aria-busy saat memuat, lalu <img> setelah selesai", async () => {
    let resolveFetch!: (v: unknown) => void;
    fetchMock.mockImplementation(() => new Promise((r) => (resolveFetch = r)));
    const { container } = render(<AuthImage src="https://pod.example/photos/slow.jpg" alt="Lambat" />);
    expect(screen.getByTestId("authimg-loading")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByAltText("Lambat")).not.toBeInTheDocument();
    resolveFetch({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    await waitFor(() => expect(screen.getByAltText("Lambat")).toBeInTheDocument());
    expect(container.querySelector("[data-testid='authimg-loading']")).toBeNull();
  });

  it("dua AuthImage dengan URL sama → fetch hanya sekali (dedupe antar instance)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    render(
      <div>
        <AuthImage src="https://pod.example/photos/same.jpg" alt="Satu" />
        <AuthImage src="https://pod.example/photos/same.jpg" alt="Dua" />
      </div>,
    );
    await waitFor(() => expect(screen.getByAltText("Dua")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tidak merender <img> saat fetch gagal (401/404)", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    render(<AuthImage src="https://pod.example/photos/missing.jpg" alt="Hilang" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByAltText("Hilang")).not.toBeInTheDocument();
  });

  it("tidak merender <img> saat src kosong dan tidak memanggil fetch", () => {
    render(<AuthImage src="" alt="Kosong" />);
    expect(screen.queryByAltText("Kosong")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mencabut object URL saat unmount agar memori tidak bocor", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
    });
    const { unmount } = render(<AuthImage src="https://pod.example/photos/a.jpg" alt="Leak" />);
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});