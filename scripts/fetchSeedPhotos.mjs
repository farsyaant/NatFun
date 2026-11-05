#!/usr/bin/env node
/**
 * Seed script — mengunduh foto Wikimedia Commons berlisensi untuk katalog
 * resmi NatFun (FR-CAT-03: 30-50 entri, 6+ provinsi, 2 kingdom).
 *
 * Usage: node scripts/fetchSeedPhotos.mjs
 * Output: public/seed/photos/*.jpg + public/seed/seed-data.json
 *
 * Foto dicari via Wikimedia Commons API (Commons Search), hanya lisensi
 * CC BY / CC BY-SA / CC0 yang dipakai, atribusi dicatat di seed-data.json.
 */

const SPECIES = [
  // [nama lokal, nama ilmiah, kingdom, kelas, famili, provinsi, habitat, status, query commons]
  ["Orangutan Kalimantan", "Pongo pygmaeus", "Animalia", "Mammalia", "Hominidae", "Kalimantan Tengah", "Hutan Hujan Tropis", "CR", "Pongo pygmaeus"],
  ["Komodo", "Varanus komodoensis", "Animalia", "Reptilia", "Varanidae", "Nusa Tenggara Timur", "Sabana", "EN", "Varanus komodoensis"],
  ["Badak Jawa", "Rhinoceros sondaicus", "Animalia", "Mammalia", "Rhinocerotidae", "Jawa Barat", "Hutan Hujan Tropis", "CR", "Rhinoceros sondaicus"],
  ["Harimau Sumatera", "Panthera tigris sumatrae", "Animalia", "Mammalia", "Felidae", "Sumatera Barat", "Hutan Hujan Tropis", "CR", "Sumatran tiger"],
  ["Gajah Sumatera", "Elephas maximus sumatranus", "Animalia", "Mammalia", "Elephantidae", "Riau", "Hutan Hujan Tropis", "CR", "Sumatran elephant"],
  ["Banteng", "Bos javanicus", "Animalia", "Mammalia", "Bovidae", "Jawa Timur", "Sabana", "EN", "Banteng"],
  ["Anoa Pegunungan", "Bubalus quarlesi", "Animalia", "Mammalia", "Bovidae", "Sulawesi Tengah", "Hutan Montane", "EN", "Anoa"],
  ["Babi Rusa", "Babyrousa celebensis", "Animalia", "Mammalia", "Suidae", "Sulawesi Utara", "Hutan Hujan Tropis", "EN", "Babirusa"],
  ["Cendrawasih Kuning Besar", "Paradisaea apoda", "Animalia", "Aves", "Paradisaeidae", "Papua", "Hutan Hujan Tropis", "LC", "Greater bird-of-paradise"],
  ["Jalak Bali", "Leucopsar rothschildi", "Animalia", "Aves", "Sturnidae", "Bali", "Mangrove", "CR", "Bali myna"],
  ["Elang Jawa", "Nisaetus bartelsi", "Animalia", "Aves", "Accipitridae", "Jawa Tengah", "Hutan Montane", "EN", "Javan hawk-eagle"],
  ["Maleo", "Macrocephalon maleo", "Animalia", "Aves", "Megapodiidae", "Sulawesi Tengah", "Pesisir dan Pantai", "EN", "Maleo bird"],
  ["Kakatua Jambul Kuning", "Cacatua sulphurea", "Animalia", "Aves", "Cacatuidae", "Nusa Tenggara Timur", "Sabana", "CR", "Yellow-crested cockatoo"],
  ["Tarsius Sunda", "Tarsius tarsier", "Animalia", "Mammalia", "Tarsiidae", "Sulawesi Selatan", "Hutan Hujan Tropis", "VU", "Tarsius tarsier"],
  ["Kuskus Beruang", "Spilocuscus rufoniger", "Animalia", "Mammalia", "Phalangeridae", "Papua", "Hutan Hujan Tropis", "CR", "Spilocuscus"],
  ["Ikan Arwana Timur", "Scleropages formosus", "Animalia", "Actinopterygii", "Osteoglossidae", "Kalimantan Barat", "Rawa dan Air Tawar", "EN", "Asian arowana"],
  ["Hiu Karang Sirip Putih", "Triaenodon obesus", "Animalia", "Chondrichthyes", "Carcharhinidae", "Maluku", "Terumbu Karang dan Laut", "VU", "Whitetip reef shark"],
  ["Penyu Sisik", "Eretmochelys imbricata", "Animalia", "Reptilia", "Cheloniidae", "Sulawesi Tenggara", "Terumbu Karang dan Laut", "CR", "Hawksbill sea turtle"],
  ["Kura-kura Emys", "Orlitia borneensis", "Animalia", "Reptilia", "Geoemydidae", "Kalimantan Selatan", "Rawa dan Air Tawar", "EN", "Orlitia borneensis"],
  ["Kupu-kupu Ophrys Kupu", "Troides amphrysus", "Animalia", "Insecta", "Papilionidae", "Sumatera Utara", "Hutan Hujan Tropis", "LC", "Troides amphrysus"],
  ["Kalong Pteropus", "Pteropus vampyrus", "Animalia", "Mammalia", "Pteropodidae", "Jawa Barat", "Mangrove", "NT", "Large flying fox"],
  ["Kancil Kecil", "Tragulus kanchil", "Animalia", "Mammalia", "Tragulidae", "Lampung", "Hutan Hujan Tropis", "LC", "Lesser mouse-deer"],
  ["Lutung Jawa", "Trachypithecus auratus", "Animalia", "Mammalia", "Cercopithecidae", "Jawa Barat", "Hutan Montane", "VU", "Javan lutung"],
  ["Bung Lonceng Borneo", "Nepenthes rajah", "Plantae", "Magnoliopsida", "Nepenthaceae", "Kalimantan Timur", "Hutan Montane", "EN", "Nepenthes rajah"],
  ["Rafflesia Arnoldii", "Rafflesia arnoldii", "Plantae", "Magnoliopsida", "Rafflesiaceae", "Bengkulu", "Hutan Hujan Tropis", "CR", "Rafflesia arnoldii"],
  ["Bunga Bangkai Titan", "Amorphophallus titanum", "Plantae", "Magnoliopsida", "Araceae", "Sumatera Barat", "Hutan Hujan Tropis", "EN", "Amorphophallus titanum"],
  ["Anggrek Hitam Kalimantan", "Coelogyne pandurata", "Plantae", "Liliopsida", "Orchidaceae", "Kalimantan Timur", "Mangrove", "LC", "Coelogyne pandurata"],
  ["Matahari Gunung", "Edelweiss Jawa", "Plantae", "Magnoliopsida", "Asteraceae", "Jawa Timur", "Hutan Montane", "NT", "Anaphalis javanica"],
  ["Kantong Semar Sumatera", "Nepenthes sumatrana", "Plantae", "Magnoliopsida", "Nepenthaceae", "Sumatera Selatan", "Rawa dan Air Tawar", "VU", "Nepenthes sumatrana"],
  ["Kapur Naga", "Shorea javanica", "Plantae", "Magnoliopsida", "Dipterocarpaceae", "Kepulauan Bangka Belitung", "Hutan Hujan Tropis", "EN", "Shorea javanica"],
  ["Mangrove Bakau", "Rhizophora mangle", "Plantae", "Magnoliopsida", "Rhizophoraceae", "Kepulauan Riau", "Mangrove", "LC", "Rhizophora mangle"],
  ["Beringin Laut", "Casuarina equisetifolia", "Plantae", "Magnoliopsida", "Casuarinaceae", "Banten", "Pesisir dan Pantai", "LC", "Casuarina equisetifolia"],
  ["Bunga Kantan", "Etlingera elatior", "Plantae", "Liliopsida", "Zingiberaceae", "Aceh", "Hutan Hujan Tropis", "LC", "Etlingera elatior"],
  ["Cendana Timor", "Santalum album", "Plantae", "Magnoliopsida", "Santalaceae", "Nusa Tenggara Timur", "Sabana", "VU", "Santalum album"],
  ["Palem Borassus", "Borassus flabellifer", "Plantae", "Liliopsida", "Arecaceae", "Nusa Tenggara Barat", "Sabana", "LC", "Borassus flabellifer"],
  ["Terubuk Melaleuca", "Melaleuca leucadendra", "Plantae", "Magnoliopsida", "Myrtaceae", "Papua Barat", "Rawa dan Air Tawar", "LC", "Melaleuca leucadendra"],
];

import { fetchWithRetry } from "./retry.mjs";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "NatFun-Seed/1.0 (course prototype; contact: maintainer)";

/** Thumb 240px dari URL thumb Commons (.../640px-File.jpg → .../240px-File.jpg). */
function smallerThumbUrl(thumbUrl, width = 240) {
  return thumbUrl.replace(/\/(\d+)px-/, `/${width}px-`);
}

async function searchImage(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "5",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "640",
    origin: "*",
  });
  const res = await fetchWithRetry(`${API}?${params}`, { headers: { "User-Agent": UA } });
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    if (info.width < 400 || info.height < 300) continue;
    const meta = info.extmetadata ?? {};
    const licenseShort = meta.LicenseShortName?.value ?? "";
    if (!/(^|\b)(CC BY|CC0|Public domain|CC BY-SA)/i.test(licenseShort)) continue;
    return {
      thumbUrl: info.thumburl,
      fileUrl: info.url,
      title: String(page.title ?? "").replace(/^File:/, ""),
      license: licenseShort,
      attribution: meta.Artist?.value?.replace(/<[^>]+>/g, "").trim() ?? "",
    };
  }
  return null;
}

async function download(url) {
  const res = await fetchWithRetry(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const fs = await import("node:fs/promises");
await fs.mkdir("public/seed/photos", { recursive: true });

// Mode resume: jangan unduh ulang spesies yang sudah lengkap (foto + thumb)
let previous = [];
try {
  previous = JSON.parse(await fs.readFile("public/seed/seed-data.json", "utf8"));
} catch {
  // belum ada seed sebelumnya
}

const out = [...previous];
let i = 0;
for (const [local, sci, kingdom, kelas, fam, prov, habitat, status, query] of SPECIES) {
  i++;
  const existing = previous.find((e) => e.localName === local);
  if (existing && existing.photo && existing.thumbPhoto) {
    console.log(`[skip] ${local}: sudah ada (resume)`);
    continue;
  }
  try {
    const found = await searchImage(query);
    if (!found) {
      console.warn(`[skip] ${local}: tidak ditemukan foto berlisensi`);
      continue;
    }
    const file = `${String(i).padStart(2, "0")}-${local.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
    const thumbFile = `${String(i).padStart(2, "0")}-${local.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-thumb.jpg`;
    const buf = await download(found.thumbUrl);
    await fs.writeFile(`public/seed/photos/${file}`, buf);
    // B4: thumbnail kecil terpisah — fallback ke foto utama bila 240px tak tersedia
    let thumbBuf = null;
    try {
      thumbBuf = await download(smallerThumbUrl(found.thumbUrl, 240));
    } catch {
      thumbBuf = buf;
    }
    await fs.writeFile(`public/seed/photos/${thumbFile}`, thumbBuf);
    const entry = {
      localName: local,
      scientificName: sci,
      kingdom,
      taxonClass: kelas,
      family: fam,
      province: prov,
      habitat,
      conservationStatus: status,
      photo: existing?.photo ?? `photos/${file}`,
      thumbPhoto: `photos/${thumbFile}`,
      photoSource: {
        title: found.title,
        license: found.license,
        attribution: found.attribution,
        url: found.fileUrl,
      },
    };
    const idx = out.findIndex((e) => e.localName === local);
    if (idx >= 0) out[idx] = entry;
    else out.push(entry);
    console.log(`[ok] ${local} ← ${found.title} (${found.license})`);
  } catch (e) {
    console.warn(`[err] ${local}: ${e.message}`);
  }
  // Throttle sopan terhadap Commons
  await new Promise((r) => setTimeout(r, 400));
}

await fs.writeFile("public/seed/seed-data.json", JSON.stringify(out, null, 2));
console.log(`\nSelesai: ${out.length}/${SPECIES.length} entri tersimpan di public/seed/seed-data.json`);
