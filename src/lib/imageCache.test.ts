import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ fetch: vi.fn() }));

import { fetch } from "@/lib/auth";
import { clearImageCache, fetchImageBlob } from "@/lib/imageCache";

const fetchMock = fetch as unknown as Mock;

function blobRes(status = 200) {
  // body string (bukan Blob jsdom — tidak punya .stream() untuk Response)
  return new Response("img", {
    status,
    headers: { "Content-Type": "image/jpeg" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  clearImageCache();
  fetchMock.mockImplementation(() => Promise.resolve(blobRes()));
});

describe("fetchImageBlob (B2/B3)", () => {
  it("pemanggilan paralel untuk URL sama → fetch sekali (in-flight dedupe)", async () => {
    await Promise.all([
      fetchImageBlob("https://pod.example/photos/a.jpg"),
      fetchImageBlob("https://pod.example/photos/a.jpg"),
      fetchImageBlob("https://pod.example/photos/a.jpg"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("pemanggilan berurutan untuk URL sama → cache, tidak fetch lagi", async () => {
    await fetchImageBlob("https://pod.example/photos/a.jpg");
    await fetchImageBlob("https://pod.example/photos/a.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("URL berbeda → fetch terpisah", async () => {
    await fetchImageBlob("https://pod.example/photos/a.jpg");
    await fetchImageBlob("https://pod.example/photos/b.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("429 → retry lalu sukses (B3)", async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(blobRes(429)))
      .mockImplementationOnce(() => Promise.resolve(blobRes()));
    const blob = await fetchImageBlob("https://pod.example/photos/c.jpg");
    expect(blob.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("kegagalan TIDAK di-cache → panggilan berikutnya mencoba lagi", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(blobRes(404)));
    await expect(fetchImageBlob("https://pod.example/photos/d.jpg")).rejects.toThrow();
    fetchMock.mockImplementation(() => Promise.resolve(blobRes()));
    const blob = await fetchImageBlob("https://pod.example/photos/d.jpg");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("clearImageCache memaksa fetch ulang", async () => {
    await fetchImageBlob("https://pod.example/photos/a.jpg");
    clearImageCache();
    await fetchImageBlob("https://pod.example/photos/a.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});