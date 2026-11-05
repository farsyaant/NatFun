// Reproduksi jalur baca aplikasi (readJson + loadValidEntries) sebagai non-admin.
// Usage: source .env.seed && node scripts/reproCatalogRead.mjs <TOKEN_ID> <SECRET>
import { Session } from "@inrupt/solid-client-authn-node";

const [idp, clientId, clientSecret] = process.argv.slice(2);
const ADMIN = "https://admintiktok.solidcommunity.net/profile/card#me";
const s = new Session();
await s.login({ oidcIssuer: idp, clientId, clientSecret });
console.log("Login sebagai:", s.info.webId);
const f = s.fetch.bind(s);

// 1) Profil admin (locateOfficialPod)
const prof = await f(ADMIN, { headers: { Accept: "application/ld+json, application/json" } });
console.log("Profil admin status:", prof.status, prof.headers.get("content-type"));

// 2) Katalog index (loadCatalog → readJson)
const idxRes = await f("https://admintiktok.solidcommunity.net/natfun/catalog/index.jsonld", {
  headers: { Accept: "application/ld+json, application/json" },
});
console.log("Index status:", idxRes.status, idxRes.headers.get("content-type"));
const idxText = await idxRes.text();
let idx;
try {
  idx = JSON.parse(idxText);
  console.log("Index items:", idx.items?.length);
} catch {
  console.log("!!! index TIDAK JSON — body awal:", idxText.slice(0, 200));
  process.exit(1);
}

// 3) Fetch observasi pertama (fetchObservationDocument)
const first = idx.items[0];
const obsRes = await f(first.observationUrl, { headers: { Accept: "application/ld+json, application/json" } });
console.log("Observasi status:", obsRes.status, obsRes.headers.get("content-type"));
const obsText = await obsRes.text();
try {
  JSON.parse(obsText);
  console.log("Observasi JSON OK");
} catch {
  console.log("!!! observasi TIDAK JSON — body awal:", obsText.slice(0, 200));
}

// 4) Foto tanpa kredensial (simulasi <img src> — TANPA session fetch)
const imgRes = await fetch(first.thumbnailUrl);
console.log("Foto <img> tanpa login status:", imgRes.status);
const imgRes2 = await f(first.thumbnailUrl);
console.log("Foto dengan sesi status:", imgRes2.status);

// 5) Fetch semua observasi seperti loadValidEntries + hitung gagal
let fail = 0;
for (const e of idx.items) {
  try {
    const r = await f(e.observationUrl, { headers: { Accept: "application/ld+json, application/json" } });
    if (!r.ok) { fail++; console.log("  gagal", r.status, e.observationUrl); continue; }
    try { await r.json(); } catch { fail++; console.log("  bukan-JSON", e.observationUrl); }
  } catch (err) {
    fail++;
    console.log("  THROW:", err.message, e.observationUrl);
  }
}
console.log(`loadValidEntries: ${idx.items.length - fail}/${idx.items.length} valid`);
await s.logout();