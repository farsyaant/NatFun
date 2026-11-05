import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { uploadObservation, submitForReview } from "@/lib/observations";
import { addCatalogEntry } from "@/lib/catalog";
import {
  appConfig,
  provinces,
  habitats,
  conservationStatuses,
  licenses,
  kingdoms,
} from "@/config/appConfig";

const empty = {
  localName: "",
  scientificName: "",
  province: "",
  kingdom: "Animalia",
  taxonClass: "",
  family: "",
  habitat: "",
  conservationStatus: "LC",
  licenseUrl: licenses[0].url,
};

export default function Upload() {
  const { state, refreshCatalog } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [ownWork, setOwnWork] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!file) return setError("Pilih satu foto (JPEG/PNG/WebP, maks 5 MB).");
    if (!form.localName || !form.scientificName || !form.province || !form.taxonClass || !form.family || !form.habitat)
      return setError("Lengkapi semua isian.");
    if (!ownWork) return setError("Centang pernyataan karya sendiri.");
    if (!state?.podPaths) return setError("Pod tidak siap.");
    if (!state?.officialRoot) {
      return setError(
        "Official Pod tidak dapat diakses — katalog tidak dapat diperbarui. " +
          "Cek VITE_NATFUN_ADMIN_WEBID lalu muat ulang halaman.",
      );
    }

    setBusy(true);
    try {
      const res = await uploadObservation(file, form, state.profile.webId, state.podPaths);
      if (state.role === "Admin") {
        // FR-UPL-10: langsung jadi entri resmi
        const entry = {
          id: res.observationUrl.split("/").pop()!.replace(".jsonld", ""),
          source: "official" as const,
          observationUrl: res.observationUrl,
          ownerWebId: state.profile.webId,
          localName: form.localName,
          scientificName: form.scientificName,
          kingdom: form.kingdom,
          taxonClass: form.taxonClass,
          family: form.family,
          province: form.province,
          habitat: form.habitat,
          conservationStatus: form.conservationStatus,
          thumbnailUrl: res.thumbUrl,
          approvedAt: new Date().toISOString(),
        };
        await addCatalogEntry(state.officialRoot!, state.catalog, entry);
        refreshCatalog({
          ...state.catalog,
          items: [...state.catalog.items, entry],
        });
        setMsg("Entri resmi dipublikasikan ke katalog.");
      } else {
        // FR-UPL-07
        await submitForReview(state.officialRoot!, res.observationUrl, state.profile.webId);
        setMsg("Tersimpan di Pod Anda dan diajukan. Status: Menunggu (Pending).");
      }
      setFile(null);
      setForm({ ...empty });
      setOwnWork(false);
      setTimeout(() => navigate("/submissions"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Unggah Observasi</h1>
      <p className="text-sm text-stone-500">
        Foto akan disimpan di <strong>Pod Anda sendiri</strong>. EXIF/GPS dihapus otomatis.
        Validasi konten ML belum diaktifkan pada prototipe ini (hanya pemeriksaan format & ukuran);
        Admin tetap memoderasi semua kiriman.
      </p>

      <label className="block text-sm font-semibold">
        Foto (JPEG/PNG/WebP, maks 5 MB)
        <input
          type="file"
          accept={appConfig.allowedPhotoTypes.join(",")}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full rounded-md border border-stone-300 p-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lokal *" value={form.localName} onChange={set("localName")} />
        <Field label="Nama ilmiah *" value={form.scientificName} onChange={set("scientificName")} />
        <Sel label="Kingdom *" value={form.kingdom} onChange={set("kingdom")} options={kingdoms} />
        <Field label="Kelas *" value={form.taxonClass} onChange={set("taxonClass")} placeholder="Mammalia, Aves, …" />
        <Field label="Famili *" value={form.family} onChange={set("family")} placeholder="Hominidae, …" />
        <Sel label="Provinsi *" value={form.province} onChange={set("province")} options={provinces} />
        <Sel label="Habitat *" value={form.habitat} onChange={set("habitat")} options={habitats} />
        <Sel
          label="Status konservasi *"
          value={form.conservationStatus}
          onChange={set("conservationStatus")}
          options={conservationStatuses}
        />
        <Sel
          label="Lisensi *"
          value={form.licenseUrl}
          onChange={set("licenseUrl")}
          options={licenses.map((l) => l.url)}
          labels={Object.fromEntries(licenses.map((l) => [l.url, l.id]))}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={ownWork} onChange={(e) => setOwnWork(e.target.checked)} className="mt-1" />
        Saya menyatakan bahwa foto ini adalah karya saya sendiri dan saya memiliki hak untuk
        membagikannya di bawah lisensi yang dipilih.
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {msg && <p className="rounded-lg bg-leaf-50 p-3 text-sm text-leaf-700">{msg}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-leaf-600 px-6 py-2.5 font-semibold text-white hover:bg-leaf-700 disabled:opacity-50"
      >
        {busy ? "Mengunggah…" : "Unggah ke Pod saya"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-normal"
      />
    </label>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-normal"
      >
        <option value="">— pilih —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}
