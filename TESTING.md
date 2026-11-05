# NatFun — Test Case Manual

Terstruktur per fitur (SRS §2.2 / PRD §6). Login dulu di `http://localhost:5173`.

**Persiapan akun:**

| Peran | Provider | Keterangan |
|---|---|---|
| Admin | solidcommunity.net (`natfun` + WebID terdaftar) | pemilik Official Pod, set di `.env.local` |
| Parent A (Alice) | solidcommunity.net | pengunggah |
| Parent B (Bob) | solidcommunity.net | penerima interaksi |
| Child (Charlie) | CSS lokal `http://localhost:3000/` | read-only |

---

## TC-01 — F-01 Solid Login

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 1.1 | Buka `http://localhost:5173` tanpa login | Hanya landing + form IdP. Tidak ada data katalog. |
| 1.2 | Pilih `solidcommunity.net` → "Masuk dengan WebID" | Diarahkan ke halaman login solidcommunity. |
| 1.3 | Login sebagai Alice → kembali ke app | Diarahkan ke `/browse`; nama muncul di header dengan peran `Parent`. |
| 1.4 | Reload halaman (F5) | Sesi dipulihkan, tetap login (FR-AUTH-03). |
| 1.5 | Klik "Keluar" | Kembali ke landing; konten tidak terlihat lagi. |
| 1.6 | Isi field "URL IdP lain" dengan `http://localhost:3000/` → login | Login ke CSS lokal berhasil (multi-provider). |

## TC-02 — F-02 Peran & Child Linking

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 2.1 | Login pertama kali sebagai Alice | Console menampilkan proses inisialisasi; container `natfun/` muncul di Pod Alice (cek via SolidOS). |
| 2.2 | Login sebagai Admin | Peran `Admin` di header; menu "Moderasi" muncul. |
| 2.3 | Sebagai Alice, buka `/family`, masukkan WebID Charlie (CSS lokal) → "Ajukan tautan" | Muncul pesan sukses; entri baru di `child-links/` Official Pod. |
| 2.4 | Login sebagai Charlie → buka `/family` | Permintaan dari Alice tampil dengan nama Alice. |
| 2.5 | Charlie klik "Terima" → logout → login lagi | Peran Charlie = `Child`; menu Unggah/Mengikuti/Pesan/Moderasi hilang. |
| 2.6 | Sebagai Alice, cek daftar di `/family` | Status Charlie = "Diterima" (FR-ROLE-08). |
| 2.7 | Masukkan WebID acak/tak valid → "Ajukan tautan" | Error "Profil WebID anak tidak dapat diambil…". |

## TC-03 — F-03 Katalog Resmi (seed)

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 3.1 | Jalankan `npm run seed:photos` lalu `npm run seed:pod` | Output `X entri baru, total N di katalog`, 30–50 entri. |
| 3.2 | Login siapa pun → `/browse` | Entri tampil dengan thumbnail, nama, provinsi, badge status. |
| 3.3 | Cek `catalog/index.jsonld` di Official Pod via SolidOS | File JSON-LD terbaca; ≥6 provinsi; 2 kingdom. |

## TC-04 — F-04 Browse, Search, Filter, Map

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 4.1 | Ketik "orangutan" di Cari | Hanya entri yang cocok; jumlah hasil sesuai. |
| 4.2 | Klik provinsi di peta | Filter provinsi aktif (tile berwarna); hasil = entri provinsi itu; angka = jumlah entri. |
| 4.3 | Kombinasikan filter: kingdom Plantae + habitat Mangrove + status CR | Hasil gabungan benar; hitung hasil sesuai. |
| 4.4 | Klik "Reset filter" | Semua filter kosong; semua entri kembali. |
| 4.5 | Filter yang tidak punya hasil (mis. kingdom Plantae + status EX) | Pesan "Tidak ada hasil untuk filter ini." |
| 4.6 | Klik kartu entri | Masuk `/entry/{id}` dengan detail lengkap (FR-BRW-05). |

## TC-05 — F-05 Unggah Foto

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 5.1 | Sebagai Alice buka `/upload`, isi semua field + foto JPG < 5 MB, centang pernyataan → unggah | Sukses; dialihkan ke `/submissions` dengan status "Menunggu". |
| 5.2 | Upload foto > 5 MB | Diblok: "Ukuran foto maksimum 5 MB." |
| 5.3 | Upload file .gif/.pdf | Diblok: "Format foto harus JPEG, PNG, atau WebP." |
| 5.4 | Kirim tanpa mencentang pernyataan | Diblok: "Centang pernyataan karya sendiri." |
| 5.5 | Kosongkan satu field wajib | Diblok: "Lengkapi semua isian." |
| 5.6 | Cek Pod Alice via SolidOS | `natfun/photos/`, `natfun/observations/*.jsonld` ada; gambar TIDAK punya EXIF GPS. |
| 5.7 | Cek `submissions/` Official Pod | Submission baru berisi URL observasi + WebID Alice. |
| 5.8 | Sebagai Admin buka `/upload` dan unggah | Langsung jadi entri resmi, muncul di katalog tanpa moderasi (FR-UPL-10). |

## TC-06 — F-06 Validasi (prototipe: file basic saja)

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 6.1 | Upload foto valid | Tertulis `natfun:validation` di observasi: `passed: true`, `modelId: file-check-v1`. |
| 6.2 | Upload file rusak / bukan gambar | Diblok dengan pesan jelas; tidak ada file tertulis ke Pod. |
| 6.3 | Inspect network tab saat upload | Tidak ada request ke server pihak ketiga (FR-VAL-03). |

## TC-07 — F-07 Moderasi

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 7.1 | Login Admin → `/admin` | Submission Pending tampil dengan preview foto + semua metadata. |
| 7.2 | Klik "Setujui" pada kiriman Alice | Entri masuk `catalog/index.jsonld`; decision "Approved" di `decisions/`. |
| 7.3 | Alice buka `/submissions` | Status kiriman = "Disetujui". |
| 7.4 | Kiriman Bob → "Tolak" dengan alasan | Decision "Rejected" + alasan; Bob melihat alasan di `/submissions`. |
| 7.5 | Entri komunitas → "Sembunyikan (unlist)" | Hilang dari index & Browse; decision "Unlisted". |
| 7.6 | (Opsional curl) Alice PUT ke `catalog/index.jsonld` | Gagal 403 — ACL memblokir non-Admin (FR-MOD-06). |

## TC-08 — F-08 Like & Comment

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 8.1 | Bob buka entri milik Alice → klik "Suka" | Tombol jadi "Disukai"; hitungan naik. |
| 8.2 | Cek Pod Bob | `natfun/activities/likes/{uuid}.jsonld` (type Like, actor Bob). |
| 8.3 | Cek Pod Alice | `natfun/interactions/{obsId}/{uuid}.jsonld` (InteractionRef). |
| 8.4 | Bob tulis komentar (max 500 char) → kirim | Komentar tampil untuk semua viewer; tersimpan di Pod Bob. |
| 8.5 | Bob klik "batal" (unlike) | Like resource dihapus di Pod Bob; hitungan turun tanpa hapus ref (verifikasi lazy). |
| 8.6 | Charlie buka entri yang sama | Lihat jumlah like & komentar, tapi TIDAK ada tombol suka/komentar. |
| 8.7 | Alice (pemilik) klik "✕ sembunyikan" pada komentar | Ref dihapus; komentar hilang untuk semua viewer. |
| 8.8 | Kirim komentar berisi `<script>alert(1)</script>` | Teks tampil apa adanya, tidak dieksekusi (FR-INT-08). |

## TC-09 — F-09 Follow & Mutual

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 9.1 | Bob `/following` → isi WebID Alice → "Ikuti" | Alice masuk daftar; tersimpan di `natfun/social/following.jsonld` Pod Bob. |
| 9.2 | Cek badge | Tidak ada badge "Saling" (Alice belum follow Bob). |
| 9.3 | Alice follow Bob balik → Bob refresh | Badge "Saling" muncul untuk Alice (dihitung saat tampil). |
| 9.4 | Bob "Berhenti" follow Alice | Badge mutual hilang di kedua sisi. |
| 9.5 | Bob coba follow WebID Charlie (Child) | Di-block oleh aplikasi (FR-SOC-04). |

## TC-10 — F-10 DM & Share

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 10.1 | Alice & Bob saling follow (mutual) | Keduanya muncul di `/messages`. |
| 10.2 | Alice kirim pesan ke Bob | Muncul di inbox Bob (max 10 dtk) & di `messages/sent/` Alice. |
| 10.3 | Bob kirim pesan ke Alice | Percakapan dua arah tampil benar. |
| 10.4 | Non-mutual kirim pesan ke Alice inbox via curl | Pesan ada di Pod tapi TIDAK tampil di UI Alice (FR-DM-04). |
| 10.5 | Bob hapus pesan di inbox-nya | Hilang dari daftar Bob saja. |
| 10.6 | Kirim teks > 1000 karakter | Diperpendek otomatis ke 1000 (FR-DM-01). |

## TC-11 — F-11 Access Control

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 11.1 | `curl https://natfun.solidcommunity.net/natfun/catalog/index.jsonld` tanpa cookie | Gagal/401-403 — tidak publik. |
| 11.2 | `curl` dengan akun auth (siapa pun yang login) | Berhasil 200 (authenticated read). |
| 11.3 | `curl` GET inbox Alice | Hanya Alice yang bisa (Owner). |
| 11.4 | `curl` POST ke inbox Alice tanpa sesi | Gagal — append butuh authenticated (FR-ACL-04). |

## TC-12 — F-12 Bukti Desentralisasi (SRS Appendix C)

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 12.1 | Alice (provider X) & Bob (provider Y) login bersamaan | Keduanya melihat katalog. |
| 12.2 | Buka Pod Alice di PodOS Browser / SolidOS | Foto, observasi, like, komentar terbaca sebagai file standar. |
| 12.3 | Alice hapus/revoke observasinya | Entri hilang dari Browse semua user, tanpa perubahan app (FR-DEC-04). |
| 12.4 | Inspect host SPA (`docker run` / dev) | Hanya file statis; tidak ada data pengguna (FR-DEC-01). |

## TC-13 — S-01 Profil

| # | Langkah | Hasil diharapkan |
|---|---|---|
| 13.1 | Alice buka `/profile` | Nama, WebID, jumlah entri disetujui, jumlah mengikuti. |
| 13.2 | Grid entri milik Alice | Entri tampil dengan thumbnail. |

---

## Debugging: "balik lagi ke login" setelah setup Admin

1. **Buka DevTools (F12) → tab Console** — cari log `[NatFun]` yang menjelaskan container/ACL mana yang gagal.
2. **Tab Network** — cari request merah (403/404/500) saat redirect balik dari IdP.
3. Pastikan `.env.local` berisi `VITE_NATFUN_ADMIN_WEBID=https://natfun.solidcommunity.net/profile/card#me` lalu **restart** dev server (env hanya dibaca saat start).
4. Login pertama kali sebagai **Admin** sebelum user lain, agar Official Pod ter-init.
5. Jika sesi macet: klik "Keluar", hapus cookie localhost, coba lagi.
6. Kalau error spesifik muncul di kotak merah di Landing, laporkan teksnya.

---

## Test Otomatis (Vitest + Testing Library)

```bash
npm test          # sekali jalan
npm run test:watch # mode watch
```

- Test komponen berada di samping file sumbernya (`*.test.tsx`, mis. `src/pages/Landing.test.tsx`).
- Modul eksternal (AuthContext, solid-client) di-mock via `vi.mock` — test komponen tidak melakukan jaringan.
- Setup jsdom: `src/test/setup.ts`, konfigurasi: blok `test` di `vite.config.ts`.

### Aturan TDD untuk perubahan ke depan

1. **RED** — tulis test yang mereproduksi bug / mendefinisikan perilaku baru dulu; pastikan test itu **gagal** dengan alasan yang benar.
2. **GREEN** — tulis perbaikan/fitur seminimal mungkin sampai test lulus; jangan ubah test agar lulus.
3. **REFACTOR** — rapikan kode dengan test tetap hijau, jalankan `npm run lint` dan `npm run build`.
4. Bug lapangan (seperti kasus macet di "Memuat Pod Anda…") **wajib** didahului test regresi yang gagal sebelum diperbaiki.
