import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { requestChildLink, pendingLinksFor, acceptChildLink, listMyChildLinks, type ChildLink } from "@/lib/family";
import { fetchProfile, displayName } from "@/lib/profile";

export default function Family() {
  const { state } = useAuth();
  const [webId, setWebId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChildLink[]>([]);
  const [myLinks, setMyLinks] = useState<ChildLink[]>([]);
  const [parentNames, setParentNames] = useState<Record<string, string>>({});

  const role = state?.role;

  const load = useCallback(async () => {
    if (!state?.officialRoot) return;
    try {
      if (role === "Child") {
        const reqs = await pendingLinksFor(state.officialRoot, state.profile.webId);
        setPending(reqs);
        const names: Record<string, string> = {};
        for (const r of reqs) {
          names[r.parentWebId] = displayName(await fetchProfile(r.parentWebId));
        }
        setParentNames(names);
      } else if (role === "Parent") {
        setMyLinks(await listMyChildLinks(state.officialRoot, state.profile.webId));
      }
    } catch {
      setError("Gagal memuat data keluarga.");
    }
  }, [state, role]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      if (!state?.officialRoot) return;
      await requestChildLink(state.officialRoot, state.profile.webId, webId);
      setMsg("Permintaan link dikirim ke Official Pod. Anak akan melihatnya saat login.");
      setWebId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim permintaan.");
    }
  };

  const accept = async (link: ChildLink) => {
    if (!state?.podPaths || !state.officialRoot) return;
    setError(null);
    setMsg(null);
    try {
      await acceptChildLink(link, state.podPaths, state.officialRoot);
      setMsg("Diterima. Peran Child aktif pada login berikutnya.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menerima link keluarga.");
    }
  };

  if (role === "Child") {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <h1 className="text-xl font-bold">Keluarga</h1>
        {pending.map((p) => (
          <div key={p.linkId} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm">
              <strong>{parentNames[p.parentWebId] ?? p.parentWebId}</strong> mengundang Anda menjadi
              anak terhubung.
            </p>
            <p className="mt-1 text-xs text-stone-400">Dari: {p.parentWebId}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => accept(p)}
                className="rounded-md bg-leaf-600 px-4 py-1.5 text-sm font-semibold text-white"
              >
                Terima
              </button>
              <button
                onClick={() => setMsg("Permintaan diabaikan. Anda tetap masuk sebagai Parent.")}
                className="rounded-md border border-stone-300 px-4 py-1.5 text-sm"
              >
                Tolak
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <p className="rounded-lg bg-stone-100 p-4 text-stone-500">
            Tidak ada permintaan link. Anda dapat menjelajah katalog dengan mode baca-saja.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {msg && <p className="rounded-lg bg-leaf-50 p-3 text-sm text-leaf-700">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Keluarga</h1>
      <p className="text-sm text-stone-500">
        Tautkan WebID anak Anda. Anak hanya dapat <strong>membaca</strong> katalog — tidak bisa
        mengunggah, menyukai, berkomentar, mengikuti, atau berkirim pesan.
      </p>
      <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold">
          WebID anak
          <input
            value={webId}
            onChange={(e) => setWebId(e.target.value)}
            placeholder="https://anak.solidcommunity.net/profile/card#me"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <button className="rounded-lg bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700">
          Ajukan tautan
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {msg && <p className="rounded bg-leaf-50 p-3 text-sm text-leaf-700">{msg}</p>}

      <ul className="space-y-2">
        {myLinks.map((l) => (
          <li key={l.linkId} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
            <div>
              <p className="break-all">{l.childWebId}</p>
              <p className="text-xs text-stone-400">{l.status === "accepted" ? "Diterima" : "Menunggu"}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
