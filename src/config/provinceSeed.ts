// Data CONTOH (seed) dari mockup — ganti dengan data asli lewat prop `details`.
export type ThreatStatus = "CR" | "EN" | "VU";
export interface ProvinceDetail {
  a: number;  // foto admin
  u: number;  // unggahan pengguna
  f: number;  // jenis endemik fauna
  l: number;  // jenis endemik flora
  s: string | null;  // contoh terancam punah (nama lokal)
  lt: string | null; // nama latin
  st: ThreatStatus | null;
}
export const provinceSeed: Record<string, ProvinceDetail> = {
  "Kalimantan Timur": { a: 14, u: 22, f: 9, l: 18, s: "Pesut Mahakam", lt: "Orcaella brevirostris", st: "CR" },
  "Nusa Tenggara Timur": { a: 12, u: 9, f: 24, l: 22, s: "Komodo", lt: "Varanus komodoensis", st: "EN" },
  "Kalimantan Barat": { a: 10, u: 17, f: 8, l: 12, s: "Enggang Gading", lt: "Rhinoplax vigil", st: "CR" },
  "Papua": { a: 16, u: 25, f: 31, l: 29, s: "Kanguru Pohon Dingiso", lt: "Dendrolagus mbaiso", st: "CR" },
  "Jawa Timur": { a: 11, u: 19, f: 7, l: 9, s: "Banteng Jawa", lt: "Bos javanicus", st: "EN" },
  "Maluku": { a: 9, u: 12, f: 18, l: 15, s: "Kakatua Maluku", lt: "Cacatua moluccensis", st: "VU" },
  "Nusa Tenggara Barat": { a: 8, u: 11, f: 10, l: 14, s: "Kakatua Kecil Jambul-kuning", lt: "Cacatua sulphurea", st: "CR" },
  "Sulawesi Selatan": { a: 10, u: 15, f: 12, l: 20, s: "Monyet Dare", lt: "Macaca maura", st: "EN" },
  "Jawa Tengah": { a: 13, u: 21, f: 6, l: 11, s: "Elang Jawa", lt: "Nisaetus bartelsi", st: "EN" },
  "Jawa Barat": { a: 15, u: 30, f: 11, l: 17, s: "Owa Jawa", lt: "Hylobates moloch", st: "EN" },
  "DKI Jakarta": { a: 6, u: 14, f: 1, l: 0, s: "Penyu Sisik", lt: "Eretmochelys imbricata", st: "CR" },
  "Banten": { a: 7, u: 9, f: 5, l: 6, s: "Badak Jawa", lt: "Rhinoceros sondaicus", st: "CR" },
  "DI Yogyakarta": { a: 8, u: 16, f: 2, l: 3, s: "Penyu Lekang", lt: "Lepidochelys olivacea", st: "VU" },
  "Sulawesi Tenggara": { a: 7, u: 10, f: 9, l: 12, s: "Anoa Dataran Rendah", lt: "Bubalus depressicornis", st: "EN" },
  "Papua Barat": { a: 9, u: 13, f: 16, l: 21, s: "Penyu Belimbing", lt: "Dermochelys coriacea", st: "VU" },
  "Sulawesi Tengah": { a: 8, u: 14, f: 17, l: 23, s: "Tarsius Dian", lt: "Tarsius dentatus", st: "VU" },
  "Maluku Utara": { a: 6, u: 7, f: 13, l: 10, s: "Kakatua Putih", lt: "Cacatua alba", st: "EN" },
  "Kepulauan Riau": { a: 5, u: 8, f: 2, l: 3, s: "Duyung", lt: "Dugong dugon", st: "VU" },
  "Riau": { a: 12, u: 18, f: 7, l: 16, s: "Gajah Sumatera", lt: "Elephas maximus sumatranus", st: "CR" },
  "Gorontalo": { a: 6, u: 6, f: 6, l: 9, s: "Babirusa Sulawesi", lt: "Babyrousa celebensis", st: "VU" },
  "Sulawesi Utara": { a: 9, u: 14, f: 14, l: 13, s: "Yaki", lt: "Macaca nigra", st: "CR" },
  "Sulawesi Barat": { a: 5, u: 5, f: 8, l: 11, s: "Anoa Pegunungan", lt: "Bubalus quarlesi", st: "EN" },
  "Jambi": { a: 11, u: 15, f: 6, l: 14, s: "Harimau Sumatera", lt: "Panthera tigris sumatrae", st: "CR" },
  "Sumatera Selatan": { a: 8, u: 11, f: 7, l: 12, s: "Buaya Senyulong", lt: "Tomistoma schlegelii", st: "EN" },
  "Lampung": { a: 10, u: 13, f: 5, l: 10, s: "Badak Sumatera", lt: "Dicerorhinus sumatrensis", st: "CR" },
  "Bengkulu": { a: 7, u: 10, f: 4, l: 8, s: "Beruang Madu", lt: "Helarctos malayanus", st: "VU" },
  "Sumatera Barat": { a: 13, u: 27, f: 9, l: 19, s: "Tapir Asia", lt: "Tapirus indicus", st: "EN" },
  "Sumatera Utara": { a: 12, u: 24, f: 8, l: 21, s: "Orangutan Tapanuli", lt: "Pongo tapanuliensis", st: "CR" },
  "Aceh": { a: 14, u: 22, f: 10, l: 17, s: "Orangutan Sumatera", lt: "Pongo abelii", st: "CR" },
  "Kalimantan Tengah": { a: 13, u: 20, f: 12, l: 25, s: "Orangutan Kalimantan", lt: "Pongo pygmaeus", st: "CR" },
  "Kalimantan Selatan": { a: 9, u: 12, f: 9, l: 13, s: "Bekantan", lt: "Nasalis larvatus", st: "EN" },
  "Bali": { a: 8, u: 31, f: 6, l: 10, s: "Jalak Bali", lt: "Leucopsar rothschildi", st: "CR" },
  "Kepulauan Bangka Belitung": { a: 5, u: 6, f: 4, l: 7, s: "Tarsius Bangka", lt: "Cephalopachus bancanus", st: "VU" },
};

