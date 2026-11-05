import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loadValidEntries, clearObservationCache } from "@/lib/catalog";
import { habitats, kingdoms, conservationStatuses } from "@/config/appConfig";
import StatusBadge from "@/components/StatusBadge";
import ProvinceMap from "@/components/ProvinceMap";
import AuthImage from "@/components/AuthImage";
import type { CatalogEntry } from "@/lib/vocab";

export default function Browse() {
  const { state, reloadCatalog } = useAuth();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(0);
  const [verifyRound, setVerifyRound] = useState(0);

  const [q, setQ] = useState("");
  const [province, setProvince] = useState<string | null>(null);
  const [kingdom, setKingdom] = useState("");
  const [taxonClass, setTaxonClass] = useState("");
  const [family, setFamily] = useState("");
  const [habitat, setHabitat] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!state?.officialRoot) {
        // Official Pod tak terjangkau (konfigurasi/belum di-seed) — jangan biarkan
        // UI macet di "Memuat katalog…" selamanya; tampilkan pesan konfigurasi.
        if (alive) {
          setEntries([]);
          setLoading(false);
        }
        return;
      }
      // Poin 5: SEMUA entri index tampil INSTAN dari metadata index
      // (thumbnailUrl sudah ada di index) — verifikasi berjalan di belakang.
      if (alive) {
        setEntries(state.catalog.items.map((e) => ({ ...e })));
        setLoading(false);
        setError(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [state?.officialRoot, state?.catalog]);

  // Verifikasi latar belakang (FR-BRW-08): entri yang benar-benar hilang
  // (404) disembunyikan; kegagalan sementara TIDAK menyembunyikan entri —
  // dihitung dan ditawarkan tombol "Coba lagi".
  useEffect(() => {
    if (!state?.officialRoot) return;
    let alive = true;
    (async () => {
      try {
        const out = await loadValidEntries(state.catalog);
        if (!alive) return;
        setEntries((prev) => prev.filter((e) => !out.dead.includes(e.observationUrl)));
        setUnverified(out.transient);
      } catch {
        if (alive) setError("Gagal memuat katalog.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [state?.officialRoot, state?.catalog, verifyRound]);

  const retryVerification = () => {
    clearObservationCache();
    setVerifyRound((n) => n + 1);
  };

  // D6: saat halaman dibuka, segarkan katalog (throttle di AuthContext)
  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) c[e.province] = (c[e.province] ?? 0) + 1;
    return c;
  }, [entries]);

  const classes = useMemo(
    () => [...new Set(entries.map((e) => e.taxonClass).filter(Boolean))].sort(),
    [entries],
  );
  const families = useMemo(
    () => [...new Set(entries.map((e) => e.family).filter(Boolean))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return entries.filter(
      (e) =>
        (!ql ||
          e.localName.toLowerCase().includes(ql) ||
          e.scientificName.toLowerCase().includes(ql)) &&
        (!province || e.province === province) &&
        (!kingdom || e.kingdom === kingdom) &&
        (!taxonClass || e.taxonClass === taxonClass) &&
        (!family || e.family === family) &&
        (!habitat || e.habitat === habitat) &&
        (!status || e.conservationStatus === status) &&
        (!source || e.source === source),
    );
  }, [entries, q, province, kingdom, taxonClass, family, habitat, status, source]);

  const reset = () => {
    setQ("");
    setProvince(null);
    setKingdom("");
    setTaxonClass("");
    setFamily("");
    setHabitat("");
    setStatus("");
    setSource("");
  };
  const hasFilter = q || province || kingdom || taxonClass || family || habitat || status || source;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold">
            Cari
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nama lokal / ilmiah…"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Filter</p>
          <select className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm" value={kingdom} onChange={(e) => setKingdom(e.target.value)} aria-label="kingdom">
            <option value="">Semua kingdom</option>
            {kingdoms.map((k) => <option key={k}>{k}</option>)}
          </select>
          {classes.length > 0 && (
            <select className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm" value={taxonClass} onChange={(e) => setTaxonClass(e.target.value)} aria-label="kelas">
              <option value="">Semua kelas</option>
              {classes.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
          {families.length > 0 && (
            <select className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm" value={family} onChange={(e) => setFamily(e.target.value)} aria-label="famili">
              <option value="">Semua famili</option>
              {families.map((f) => <option key={f}>{f}</option>)}
            </select>
          )}
          <select className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm" value={habitat} onChange={(e) => setHabitat(e.target.value)} aria-label="habitat">
            <option value="">Semua habitat</option>
            {habitats.map((h) => <option key={h}>{h}</option>)}
          </select>
          <select className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="status konservasi">
            <option value="">Semua status konservasi</option>
            {conservationStatuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="w-full rounded-md border border-stone-300 px-2 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)} aria-label="sumber">
            <option value="">Semua sumber</option>
            <option value="official">Resmi</option>
            <option value="community">Komunitas</option>
          </select>
          <p className="text-xs text-stone-500">{filtered.length} entri</p>
          {hasFilter ? (
            <button className="text-sm text-leaf-600 hover:underline" onClick={reset}>
              Reset filter
            </button>
          ) : null}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold">Peta Provinsi</p>
          <ProvinceMap counts={counts} selected={province} onSelect={setProvince} />
        </div>
      </aside>

      <section>
        {loading && <p className="text-stone-400">Memuat katalog…</p>}
        {error && <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
        {!loading && unverified > 0 && (
          <p role="status" className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <span>
              {unverified} entri belum terverifikasi (gangguan jaringan sementara) — datanya tetap
              ditampilkan.
            </span>
            <button
              onClick={retryVerification}
              className="shrink-0 rounded-md border border-amber-300 px-3 py-1 font-semibold text-amber-800 hover:bg-amber-100"
            >
              Coba lagi
            </button>
          </p>
        )}
        {!loading && !error && !state?.officialRoot && (
          <p className="rounded-lg bg-amber-50 p-4 text-amber-800">
            Official Pod tidak dapat diakses — katalog resmi tidak tersedia. Pastikan
            <code className="mx-1">VITE_NATFUN_ADMIN_WEBID</code> di <code>.env.local</code> benar lalu{" "}
            <strong>restart dev server</strong>, dan Official Pod sudah di-seed ({" "}
            <code>npm run seed:pod</code> ).
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="rounded-lg bg-stone-100 p-4 text-stone-500">
            {hasFilter ? "Tidak ada hasil untuk filter ini." : "Katalog masih kosong."}
          </p>
        )}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <li key={e.observationUrl}>
              <Link
                to={`/entry/${encodeURIComponent(e.id)}`}
                className="block overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
              >
                <AuthImage
                  src={e.thumbnailUrl}
                  alt={e.localName}
                  className="h-40 w-full object-cover"
                />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-tight">{e.localName}</p>
                      <p className="text-xs italic text-stone-500">{e.scientificName}</p>
                    </div>
                    <StatusBadge code={e.conservationStatus} />
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    {e.province} · {e.habitat} · {e.source === "official" ? "Resmi" : "Komunitas"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
