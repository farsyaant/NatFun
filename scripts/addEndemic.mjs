import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: node scripts/addEndemic.mjs <path-seed.json>");

// Endemik Indonesia (data dummy, diverifikasi nanti bersama data asli)
const ENDEMIC = new Set([
  "Varanus komodoensis",
  "Rhinoceros sondaicus",
  "Panthera tigris sumatrae",
  "Elephas maximus sumatranus",
  "Babyrousa celebensis",
  "Leucopsar rothschildi",
  "Nisaetus bartelsi",
  "Macrocephalon maleo",
  "Cacatua sulphurea",
  "Tarsius tarsier",
  "Bubalus quarlesi",
  "Trachypithecus auratus",
  "Rafflesia arnoldii",
  "Amorphophallus titanum",
  "Nepenthes sumatrana",
  "Shorea javanica",
]);

const data = JSON.parse(readFileSync(file, "utf8"));
for (const e of data) e.endemic = ENDEMIC.has(e.scientificName);
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`${data.filter((e) => e.endemic).length}/${data.length} entri endemik`);