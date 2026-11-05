import { describe, expect, it } from "vitest";
import { pickCurrentEntries, pickStaleEntries } from "./cleanupSeed.mjs";
import { seedIdOf } from "./seedId.mjs";

const SEED = [
  { localName: "Komodo" },
  { localName: "Rafflesia Arnoldii" },
];

function item(id, localName) {
  return {
    id,
    localName,
    observationUrl: `https://admin.example/obs/${id}.jsonld`,
    thumbnailUrl: `https://admin.example/photos/${id}.jpg`,
  };
}

describe("cleanupSeed (B4 — bersihkan entri lama id random)", () => {
  it("entri dengan id deterministik (seedIdOf) dipertahankan", () => {
    const k = item(seedIdOf("Komodo"), "Komodo");
    const r = item(seedIdOf("Rafflesia Arnoldii"), "Rafflesia Arnoldii");
    const cur = pickCurrentEntries([k, r], SEED);
    expect(cur).toHaveLength(2);
  });

  it("entri lama (id random) untuk nama yang sama terdeteksi stale", () => {
    const old = item("7116f976", "Komodo");
    const k = item(seedIdOf("Komodo"), "Komodo");
    const stale = pickStaleEntries([old, k], SEED);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe("7116f976");
  });

  it("entri dengan localName tak dikenal (bukan seed) tidak disentuh", () => {
    const unknown = item("abcd1234", "Entri Komunitas");
    expect(pickStaleEntries([unknown], SEED)).toHaveLength(0);
    expect(pickCurrentEntries([unknown], SEED)).toHaveLength(1);
  });
});