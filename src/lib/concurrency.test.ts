import { describe, expect, it } from "vitest";
import { mapLimit } from "./concurrency";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("mapLimit (B1/B6 — paralelisasi terbatas)", () => {
  it("memproses semua item dan mempertahankan urutan hasil", async () => {
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      await delay(n % 3 * 5);
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it("tidak pernah melampaui batas konkurensi", async () => {
    let active = 0;
    let peak = 0;
    await mapLimit(Array.from({ length: 10 }, (_, i) => i), 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await delay(5);
      active--;
      return n;
    });
    expect(peak).toBe(3);
  });

  it("array kosong → []", async () => {
    expect(await mapLimit([], 4, async (x) => x)).toEqual([]);
  });
});