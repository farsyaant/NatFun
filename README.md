# NatFun — Katalog Flora & Fauna Indonesia (Solid)

Aplikasi web terdesentralisasi berbasis **Solid**: data pengguna (foto, observasi, like,
komentar, follow, pesan) tersimpan di **Pod milik pengguna**, aplikasi hanya *view* tanpa
backend dan tanpa database (SPA statis).

Dokumen pendukung: `NatFun_SRS.md`, `NatFun_PRD.md`.

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- `@inrupt/solid-client` + `@inrupt/solid-client-authn-browser` (Solid-OIDC, LDP, WAC)
- Peta provinsi: tile-grid SVG interaktif (tanpa tile server)
- Hosting: statis (dev lokal, Docker/Nginx, atau Vercel)

> **Catatan prototipe**: deteksi konten ML (FR-VAL-01/02) **dilewati** — hanya validasi
> file (format/ukuran ≤5 MB) + strip EXIF via canvas. Field `natfun:validation` tetap
> ditulis dengan stub `file-check-v1` agar siap dipasang model asli nanti.

## Struktur

```
src/
  config/appConfig.ts   # Admin WebID, IdP, provinsi, habitat, lisensi, threshold (C: satu config)
  lib/                  # data-access Solid (C: satu modul akses data)
    auth.ts             # Solid-OIDC login/logout/restore
    profile.ts          # WebID profile (nama, pim:storage)
    acl.ts / podInit.ts # struktur container + ACL WAC (Appendix A)
    ldp.ts              # listContainer / putJson / postJson / delete
    appState.ts         # resolusi peran (FR-ROLE-01) + load state
    catalog.ts          # index katalog, submission, decision, report
    observations.ts     # unggah observasi + EXIF strip
    interactions.ts     # like/comment + verifikasi lazy (FR-INT-05)
    social.ts           # follow + mutual dihitung saat tampil
    messages.ts         # DM pod-to-pod (inbox/sent)
    family.ts           # child link + acceptance
    image.ts            # strip EXIF, thumbnail
  pages/                # Landing, Browse, EntryDetail, Upload, MySubmissions,
                        # Following, Messages, Family, AdminQueue, Profile
scripts/
  fetchSeedPhotos.mjs   # unduh foto berlisensi dari Wikimedia Commons
  seedOfficialPod.mjs   # tulis entri resmi ke Official Pod (perlu client credentials)
```

## Menjalankan di lokal

```bash
npm install
npm run dev          # http://localhost:5173
```

Salin `.env.example` → `.env.local` lalu isi `VITE_NATFUN_ADMIN_WEBID` (lihat §2 di bawah).
Env hanya dibaca saat dev server dimulai — **restart** setelah mengubahnya.

## Test otomatis (TDD)

```bash
npm test        # Vitest + Testing Library (100+ test)
npm run test:watch
npm run lint    # oxlint — target: 0 warning
```

Konvensi: bug lapangan didahului test regresi yang gagal (RED) sebelum diperbaiki (GREEN).

## Setup demo (mengikuti PRD §11)

### 1. Provider Solid (butuh ≥2, FR-DEC-02)

- **solidcommunity.net** — daftar: Parent A, Parent B, dan **Admin** (Official Pod).
- **CSS lokal** (untuk Child + fallback):

  ```bash
  docker build -f Dockerfile.css -t natfun-css .
  mkdir -p css-data && docker run -p 3000:3000 -v ./css-data:/data natfun-css
  # daftar akun di http://localhost:3000/.account/ (WebID: http://localhost:3000/<nama>/profile/card#me)
  ```

### 2. Konfigurasi Admin WebID

Buat `.env.local`:

```
VITE_NATFUN_ADMIN_WEBID=https://<admin>.solidcommunity.net/profile/card#me
```

Setiap Parent/Child yang login pertama kali akan otomatis dibuatkan container `natfun/`
beserta ACL-nya (FR-AUTH-07, Appendix A).

### 3. Seed data resmi (30–50 entri)

```bash
npm run seed:photos            # unduh foto Commons + buat public/seed/seed-data.json
# buat client credentials Admin di https://solidcommunity.net/.account/ → credentials
SEED_IDP=https://solidcommunity.net/ \
SEED_CLIENT_ID=... SEED_CLIENT_SECRET=... \
npm run seed:pod               # tulis foto+observasi+index ke Official Pod
```

### 4. Uji alur (SRS Appendix C)

1. Login Alice (solidcommunity) & Bob (solidcommunity) → katalog tampil.
2. Alice unggah foto → status Pending → Admin setujui di `/admin` → tampil di Browse.
3. Buka Pod via SolidOS/PodOS Browser → data terbaca sebagai file standar.
4. Bob like/komentar/follow/DM → muncul di Pod Bob & inbox Alice.
5. Alice cabut izin/hapus observasi → hilang dari katalog tanpa perubahan app (FR-DEC-04).
6. Child (CSS lokal) login → baca-saja, tanpa tombol tulis.
7. Tanpa login → hanya halaman landing/login.

## Deploy

- **Docker**: `docker build -t natfun . && docker run -p 8080:80 natfun`
- **Vercel**: import repo (konfigurasi di `vercel.json`, SPA fallback sudah diatur).
- Ganti `natfunNs` di `src/config/appConfig.ts` ke namespace final saat deploy (O-01).

## Keterbatasan prototipe

Sesuai SRS Appendix E: moderasi mengontrol *discoverability* bukan akses (L-02),
pembatasan Child di level aplikasi (L-03), DM tidak terenkripsi (L-09), dsb.
