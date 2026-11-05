#!/usr/bin/env node
/**
 * Cleanup one-off (B4): hapus entri katalog seed LAMA (id random) yang
 * tertinggal setelah migrasi ke id deterministik — index dibersihkan dan
 * file observasi/foto orphan dihapus dari Pod (best effort).
 * Usage: source .env.seed && node scripts/cleanupSeedDuplicates.mjs
 */
import { readFile } from "node:fs/promises";
import { Session } from "@inrupt/solid-client-authn-node";
import { pickCurrentEntries, pickStaleEntries } from "./cleanupSeed.mjs";
import { findStorageRoot } from "./podProfile.mjs";
import { fetchWithRetry } from "./retry.mjs";

const session = new Session();
await session.login({
  oidcIssuer: process.env.SEED_IDP,
  clientId: process.env.SEED_CLIENT_ID,
  clientSecret: process.env.SEED_CLIENT_SECRET,
});
const webId = session.info.webId;
console.log("Login sebagai", webId);
const fetchFn = session.fetch.bind(session);
const f = (url, init) => fetchWithRetry(url, init, { fetchImpl: fetchFn, maxAttempts: 5 });

const storage = await findStorageRoot(webId, { fetch: fetchFn });
const root = `${storage}natfun/`;
const idxUrl = `${root}catalog/index.jsonld`;
const index = JSON.parse(await (await f(idxUrl)).text());

const seed = JSON.parse(await readFile("public/seed/seed-data.json", "utf8"));
const stale = pickStaleEntries(index.items, seed);
const current = pickCurrentEntries(index.items, seed);

console.log(`Index: ${index.items.length} entri → pertahankan ${current.length}, hapus ${stale.length}`);

let deleted = 0;
for (const it of stale) {
  for (const url of [it.observationUrl, it.thumbnailUrl]) {
    if (!url) continue;
    const res = await f(url, { method: "DELETE" }).catch(() => null);
    if (res?.ok || res?.status === 404) deleted++;
    else console.warn(`[warn] DELETE ${url}: ${res?.status ?? "gagal"}`);
  }
}

index.items = current;
const put = await f(idxUrl, {
  method: "PUT",
  headers: { "Content-Type": "application/ld+json" },
  body: JSON.stringify(index),
});
if (!put.ok) throw new Error(`PUT index: ${put.status}`);
console.log(`Selesai: ${deleted} file orphan dihapus, index kini ${index.items.length} entri.`);
await session.logout();