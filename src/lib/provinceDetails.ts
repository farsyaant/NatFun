import type { CatalogEntry } from "@/lib/vocab";
import type { ProvinceDetail, ThreatStatus } from "@/config/provinceSeed";

const RANK: Record<ThreatStatus, number> = { CR: 3, EN: 2, VU: 1 };
const isThreat = (s: string): s is ThreatStatus => s === "CR" || s === "EN" || s === "VU";

export function buildProvinceDetails(entries: CatalogEntry[]): Record<string, ProvinceDetail> {
  const out: Record<string, ProvinceDetail> = {};
  const fauna: Record<string, Set<string>> = {};
  const flora: Record<string, Set<string>> = {};

  for (const e of entries) {
    const p = e.province;
    if (!p) continue;
    const d = (out[p] ??= { a: 0, u: 0, f: 0, l: 0, s: null, lt: null, st: null });
    fauna[p] ??= new Set();
    flora[p] ??= new Set();

    if (e.source === "official") d.a += 1;
    else d.u += 1;

    if (e.endemic) (e.kingdom === "Plantae" ? flora : fauna)[p].add(e.scientificName);

    const st = e.conservationStatus;
    if (isThreat(st)) {
      const better = d.st === null || RANK[st] > RANK[d.st];
      if (better) {
        d.s = e.localName;
        d.lt = e.scientificName;
        d.st = st;
      }
    }
  }
  for (const p of Object.keys(out)) {
    out[p].f = fauna[p].size;
    out[p].l = flora[p].size;
  }
  return out;
}