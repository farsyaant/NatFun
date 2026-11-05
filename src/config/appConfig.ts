export const appConfig = {
  appName: "NatFun",
  appTagline: "Katalog Flora & Fauna Indonesia Terdesentralisasi",

  // A-05: namespace placeholder, diganti saat deploy final (O-01)
  natfunNs: "https://natfun.example/ns#",

  // A-04: WebID Admin = pemilik Official Pod. DIGANTI dengan WebID admin yang dibuat.
  adminWebId:
    import.meta.env.VITE_NATFUN_ADMIN_WEBID ?? "https://admin.natfun.example/profile/card#me",

  // IdP preset + custom (FR-AUTH-02)
  idpPresets: [
    { label: "solidcommunity.net", url: "https://solidcommunity.net/" },
    { label: "inrupt.net", url: "https://inrupt.net/" },
    {
      label: "CSS Lokal (dev)",
      url: import.meta.env.VITE_NATFUN_LOCAL_IDP ?? "http://localhost:3000/",
    },
  ],

  // FR-UPL-01
  maxPhotoBytes: 5 * 1024 * 1024,
  allowedPhotoTypes: ["image/jpeg", "image/png", "image/webp"],
  thumbLongEdge: 480, // FR-UPL-05

  // FR-UPL-04 / FR-INT-04 / FR-DM-01
  commentMaxLength: 500,
  messageMaxLength: 1000,

  // FR-DM-07
  messagePollMs: 10_000,
  notificationPollMs: 15_000,

  // Prototipe: ML dilewati (FR-VAL diganti validasi file basic)
  validationStub: {
    passed: true,
    modelId: "file-check-v1",
  },
} as const;

export const provinces = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Bengkulu",
  "Lampung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
] as const;

export const habitats = [
  "Hutan Hujan Tropis",
  "Hutan Montane",
  "Mangrove",
  "Terumbu Karang dan Laut",
  "Sabana",
  "Rawa dan Air Tawar",
  "Pesisir dan Pantai",
] as const;

export const conservationStatuses = [
  "EX",
  "EW",
  "CR",
  "EN",
  "VU",
  "NT",
  "LC",
  "DD",
  "NE",
] as const;

export const statusLabels: Record<string, string> = {
  EX: "Punah",
  EW: "Punah di Alam Liar",
  CR: "Kritis",
  EN: "Terancam",
  VU: "Rentan",
  NT: "Hampir Terancam",
  LC: "Risiko Rendah",
  DD: "Data Kurang",
  NE: "Belum Dievaluasi",
};

export const licenses = [
  { id: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  { id: "CC BY-NC 4.0", url: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { id: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
] as const;

export const kingdoms = ["Animalia", "Plantae"] as const;

// Susunan tile-grid peta provinsi (baris, kolom) – kira-kira sesuai geografi
export const provinceGrid: Record<string, [number, number]> = {
  Aceh: [0, 0],
  "Sumatera Utara": [1, 0],
  "Sumatera Barat": [2, 0],
  Riau: [1, 1],
  Jambi: [2, 1],
  "Sumatera Selatan": [3, 1],
  Bengkulu: [3, 0],
  Lampung: [4, 1],
  "Kepulauan Bangka Belitung": [3, 2],
  "Kepulauan Riau": [2, 2],
  "DKI Jakarta": [4, 2],
  Banten: [4, 3],
  "Jawa Barat": [5, 3],
  "Jawa Tengah": [5, 4],
  "DI Yogyakarta": [6, 4],
  "Jawa Timur": [6, 5],
  Bali: [6, 6],
  "Nusa Tenggara Barat": [6, 7],
  "Nusa Tenggara Timur": [7, 8],
  "Kalimantan Barat": [2, 3],
  "Kalimantan Tengah": [2, 4],
  "Kalimantan Selatan": [3, 4],
  "Kalimantan Timur": [1, 4],
  "Kalimantan Utara": [0, 4],
  "Sulawesi Utara": [1, 6],
  Gorontalo: [2, 6],
  "Sulawesi Tengah": [2, 7],
  "Sulawesi Barat": [3, 6],
  "Sulawesi Selatan": [3, 7],
  "Sulawesi Tenggara": [4, 7],
  Maluku: [5, 8],
  "Maluku Utara": [4, 8],
  Papua: [5, 9],
  "Papua Barat": [4, 9],
};
