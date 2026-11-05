#!/usr/bin/env node
/**
 * Seed Official Pod — menulis entri resmi dari public/seed/seed-data.json
 * ke Official Pod milik Admin (FR-CAT-01..05).
 *
 * Persiapan credentials (client credentials, Solid-OIDC):
 *  - solidcommunity.net: login di https://solidcommunity.net/.account/,
 *    buat "Client credentials" → dapatkan clientId & clientSecret.
 *  - CSS lokal: login di http://localhost:3000/.account/, buat credentials.
 *
 * Usage:
 *  SEED_IDP=https://solidcommunity.net/ \
 *  SEED_CLIENT_ID=xxx SEED_CLIENT_SECRET=yyy \
 *  node scripts/seedOfficialPod.mjs
 */

import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { Session } from "@inrupt/solid-client-authn-node";
import { findStorageRoot } from "./podProfile.mjs";
import { buildAclTurtle } from "./aclTurtle.mjs";
import { seedIdOf } from "./seedId.mjs";
import { fetchWithRetry } from "./retry.mjs";

const IDP = process.env.SEED_IDP ?? "https://solidcommunity.net/";
const CLIENT_ID = process.env.SEED_CLIENT_ID;
const CLIENT_SECRET = process.env.SEED_CLIENT_SECRET;
const NS = "https://natfun.example/ns#";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set SEED_IDP, SEED_CLIENT_ID, SEED_CLIENT_SECRET dulu. Lihat header file ini.");
  process.exit(1);
}

const session = new Session();
await session.login({ oidcIssuer: IDP, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
const webId = session.info.webId;
console.log(`Login sebagai ${webId}`);

const fetchFn = session.fetch.bind(session);
// 502/503 Cloudflare terjadi sesekali — bungkus dengan retry
const fetchFnRetry = (url, init) => fetchWithRetry(url, init, { fetchImpl: fetchFn, maxAttempts: 5 });

// --- helper ---------------------------------------------------------------
async function ensureContainer(url) {
  let res = await fetchFnRetry(url, { method: "GET" });
  if (res.ok) return;
  res = await fetchFnRetry(url, { method: "PUT" });
  if (!res.ok && res.status !== 409) throw new Error(`PUT container ${url}: ${res.status}`);
}

async function putJson(url, body) {
  const res = await fetchFnRetry(url, {
    method: "PUT",
    headers: { "Content-Type": "application/ld+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${url}: ${res.status}`);
}

// --- ACL WAC (Appendix A.1, authenticated read; admin owner) ---------------
// Owner = WebID LENGKAP (dengan fragment #me) — WAC mencocokkan URI eksak.
async function applyAcl(resource, owner, def = false) {
  const url = `${resource}.acl`;
  const res = await fetchFnRetry(url, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: buildAclTurtle(resource, owner, def),
  });
  if (!res.ok) console.warn(`ACL gagal ${url}: ${res.status}`);
}

// --- seed ------------------------------------------------------------------
const raw = await readFile("public/seed/seed-data.json", "utf8");
const seed = JSON.parse(raw);
console.log(`${seed.length} entri seed dimuat.`);

const storage = await findStorageRoot(webId, { fetch: fetchFn });
console.log(`Storage root: ${storage}`);
const root = `${storage}natfun/`;
const owner = webId; // WebID lengkap (dengan fragment) — jangan dipecah

const dirs = [
  "catalog/",
  "official/observations/",
  "official/photos/",
  "interactions/",
  "submissions/",
  "decisions/",
  "reports/",
  "child-links/",
];
for (const d of dirs) await ensureContainer(`${root}${d}`);
for (const d of ["catalog/", "official/observations/", "official/photos/", "decisions/", "child-links/"]) {
  await applyAcl(`${root}${d}`, owner, true);
}

const idxUrl = `${root}catalog/index.jsonld`;
let index;
try {
  index = JSON.parse(await (await fetchFnRetry(idxUrl)).text());
  if (!Array.isArray(index.items)) index.items = [];
} catch {
  index = { "@context": { as: "https://www.w3.org/ns/activitystreams" }, "@type": "Collection", items: [] };
}

let added = 0;
for (const s of seed) {
  // B4: id deterministik → re-seed menimpa resource yang sama (idempoten)
  const id = seedIdOf(s.localName);
  const photoBytes = await readFileSync(`public/seed/${s.photo}`);
  const photoUrl = `${root}official/photos/${id}.jpg`;
  const thumbUrl = `${root}official/photos/${id}_thumb.jpg`;
  let haveThumb = false;
  if (s.thumbPhoto) {
    const thumbBytes = await readFileSync(`public/seed/${s.thumbPhoto}`);
    const tres = await fetchFnRetry(thumbUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: thumbBytes,
    });
    if (tres.ok) haveThumb = true;
    else console.warn(`[warn] thumb ${s.localName}: ${tres.status}`);
  }
  const res = await fetchFnRetry(photoUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: photoBytes,
  });
  if (!res.ok) {
    console.warn(`[err] foto ${s.localName}: ${res.status}`);
    continue;
  }

  const now = new Date().toISOString();
  const obsUrl = `${root}official/observations/${id}.jsonld`;
  await putJson(obsUrl, {
    "@context": {
      as: "https://www.w3.org/ns/activitystreams",
      schema: "https://schema.org/",
      dwc: "http://rs.tdwg.org/dwc/terms/",
      dcterms: "http://purl.org/dc/terms/",
      natfun: NS,
    },
    "@id": "#this",
    "@type": ["schema:Photograph", `${NS}Observation`],
    "dwc:vernacularName": s.localName,
    "dwc:scientificName": s.scientificName,
    "dwc:kingdom": s.kingdom,
    "dwc:class": s.taxonClass,
    "dwc:family": s.family,
    [`${NS}province`]: s.province,
    [`${NS}habitat`]: s.habitat,
    [`${NS}conservationStatus`]: s.conservationStatus,
    "schema:image": `../../official/photos/${id}.jpg`,
    "schema:thumbnailUrl": haveThumb ? `../../official/photos/${id}_thumb.jpg` : `../../official/photos/${id}.jpg`,
    "dcterms:license": "https://creativecommons.org/licenses/by/4.0/",
    "dcterms:creator": { "@id": webId },
    "dcterms:created": now,
    "natfun:validation": {
      "natfun:passed": true,
      "natfun:modelId": "file-check-v1",
      "dcterms:created": now,
    },
    "natfun:photoSource": s.photoSource,
  });

  if (!index.items.some((e) => e.observationUrl === obsUrl)) {
    index.items.push({
      id,
      source: "official",
      observationUrl: obsUrl,
      ownerWebId: webId,
      localName: s.localName,
      scientificName: s.scientificName,
      kingdom: s.kingdom,
      taxonClass: s.taxonClass,
      family: s.family,
      province: s.province,
      habitat: s.habitat,
      conservationStatus: s.conservationStatus,
      thumbnailUrl: haveThumb ? thumbUrl : photoUrl,
      approvedAt: now,
    });
  } else {
    // entri lama: perbarui metadata (mis. thumbnail kini terpisah)
    const item = index.items.find((e) => e.observationUrl === obsUrl);
    item.thumbnailUrl = haveThumb ? thumbUrl : photoUrl;
  }

  // C2 (backfill): container interaksi per-observasi dibuat oleh pemilik
  // agar komentar dari user lain (hanya append) tidak gagal.
  const interContainer = `${root}interactions/${id}/`;
  let p = await fetchFnRetry(interContainer, { method: "GET" });
  if (!p.ok) {
    p = await fetchFnRetry(interContainer, { method: "PUT" });
    if (!p.ok && p.status !== 409) console.warn(`[warn] container interaksi ${id}: ${p.status}`);
  }

  added++;
  console.log(`[ok] ${s.localName}${haveThumb ? " (+thumb)" : ""}`);
}

await putJson(idxUrl, index);
console.log(`\nSelesai: ${added} entri baru, total ${index.items.length} di katalog.`);
await session.logout();
