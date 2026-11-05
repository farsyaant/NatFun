import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { seedIdOf } from "./seedId.mjs";

describe("seedIdOf (B4 — seeding idempoten)", () => {
  it("deterministik: nama sama → id sama", () => {
    expect(seedIdOf("Komodo")).toBe(seedIdOf("Komodo"));
  });

  it("8 karakter hex lowercase", () => {
    const id = seedIdOf("Rafflesia Arnoldii");
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("nama berbeda → id berbeda", () => {
    const a = seedIdOf("Komodo");
    const b = seedIdOf("Anoa Pegunungan");
    expect(a).not.toBe(b);
  });

  it("konsisten dengan skema sha1 (diadaptasi dari implementasi)", () => {
    const expected = createHash("sha1").update("Komodo").digest("hex").slice(0, 8);
    expect(seedIdOf("Komodo")).toBe(expected);
  });
});