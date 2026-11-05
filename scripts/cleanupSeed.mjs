import { seedIdOf } from "./seedId.mjs";

/** Entri katalog yang id-nya cocok dengan skema deterministik seed → dipertahankan.
 *  Entri dengan localName di luar seed juga dipertahankan (mis. entri komunitas). */
export function pickCurrentEntries(items, seed) {
  const expected = new Map(seed.map((s) => [s.localName, seedIdOf(s.localName)]));
  return items.filter((it) => {
    const expectedId = expected.get(it.localName);
    if (expectedId === undefined) return true; // bukan seed → jangan sentuh
    return it.id === expectedId;
  });
}

/** Entri seed lama (id random) yang harus dihapus dari index + Pod. */
export function pickStaleEntries(items, seed) {
  const expected = new Map(seed.map((s) => [s.localName, seedIdOf(s.localName)]));
  return items.filter((it) => {
    const expectedId = expected.get(it.localName);
    return expectedId !== undefined && it.id !== expectedId;
  });
}