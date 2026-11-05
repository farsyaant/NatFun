import AuthImage from "@/components/AuthImage";
import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchObservationDocument } from "@/lib/catalog";
import {
  verifiedInteractions,
  likeEntry,
  commentEntry,
  findMyLike,
  removeLike,
  removeInteractionRef,
  deleteStaleRefs,
  type InteractionItem,
} from "@/lib/interactions";
import { fetchProfile, displayName, storageRootOf } from "@/lib/profile";
import { natfunRoot } from "@/lib/podInit";
import { licenses } from "@/config/appConfig";
import StatusBadge from "@/components/StatusBadge";
import type { UserPodPaths } from "@/lib/podInit";


interface OwnerCtx {
  profile: { webId: string; name: string | null };
  paths: UserPodPaths;
}

export default function EntryDetail() {
  const { entryId } = useParams();
  const { state } = useAuth();
  const [obs, setObs] = useState<Record<string, unknown> | null>(null);
  const [obsUrl, setObsUrl] = useState<string | null>(null);
  const [owner, setOwner] = useState<OwnerCtx | null>(null);
  const [likes, setLikes] = useState<InteractionItem[]>([]);
  const [comments, setComments] = useState<InteractionItem[]>([]);
  const [myLikeUrl, setMyLikeUrl] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const role = state?.role;

  const load = useCallback(async () => {
    if (!state || !entryId) return;
    const entry = state.catalog.items.find((e) => e.id === entryId);
    if (!entry) {
      setError("Entri tidak ditemukan di katalog.");
      return;
    }
    const url = entry.observationUrl;
    const doc = await fetchObservationDocument(url);
    if (!doc) {
      setError("Dokumen observasi tidak dapat diakses (mungkin telah dihapus atau izin dicabut).");
      return;
    }
    setObs(doc);
    setObsUrl(url);

    try {
      const op = await fetchProfile(entry.ownerWebId);
      const ownerStorage = storageRootOf(entry.ownerWebId, op.storage);
      const paths: UserPodPaths =
        entry.ownerWebId === state.profile.webId && state.podPaths
          ? state.podPaths
          : ({
              ...(state.podPaths as UserPodPaths),
              interactions: `${natfunRoot(ownerStorage)}interactions/`,
            } as UserPodPaths);
      setOwner({ profile: { webId: entry.ownerWebId, name: op.name }, paths });

      const vi = await verifiedInteractions(paths, url);
      setLikes(vi.likes);
      setComments(vi.comments);

      // D5: pemilik entri membersihkan stale refs otomatis saat membuka halaman
      const rawCreator = doc["dcterms:creator"];
      const creatorId =
        rawCreator && typeof rawCreator === "object"
          ? String((rawCreator as Record<string, unknown>)["@id"] ?? "")
          : String(rawCreator ?? "");
      if (state.profile.webId.split("#")[0] === creatorId.split("#")[0] && vi.staleRefs.length > 0) {
        void deleteStaleRefs(vi.staleRefs);
      }

      if (role === "Parent" && state.podPaths) {
        const mine = await findMyLike(state.profile.webId, state.podPaths, url);
        setMyLikeUrl(mine);
      }
    } catch {
      setError("Gagal memuat interaksi.");
    }
  }, [state, entryId, role]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
  }, [load]);

  const doLike = async () => {
    if (!state?.podPaths || !obsUrl || !owner) return;
    setBusy(true);
    try {
      await likeEntry(state.profile.webId, state.podPaths, obsUrl, owner.paths);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyukai.");
    } finally {
      setBusy(false);
    }
  };

  const doUnlike = async () => {
    if (!myLikeUrl || !obsUrl || !owner || !state?.podPaths) return;
    setBusy(true);
    try {
      await removeLike(myLikeUrl, "", false);
      setMyLikeUrl(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const doComment = async () => {
    if (!state?.podPaths || !obsUrl || !owner || !commentText.trim()) return;
    setBusy(true);
    try {
      await commentEntry(state.profile.webId, state.podPaths, obsUrl, owner.paths, commentText.trim());
      setCommentText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal berkomentar.");
    } finally {
      setBusy(false);
    }
  };

  const hideComment = async (refUrl: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await removeInteractionRef(refUrl);
      setError(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyembunyikan komentar.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !obs) {
    return <p className="mx-auto max-w-xl p-8 text-center text-red-600">{error}</p>;
  }
  if (!obs) return <p className="p-8 text-center text-stone-400">Memuat…</p>;

  const val = (k: string): string => {
    let v: unknown = obs[k];
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return String(o["@id"] ?? "");
    }
    return String(v ?? "");
  };
  const licenseId = licenses.find((l) => l.url === val("dcterms:license"))?.id ?? val("dcterms:license");
  const img = val("schema:image") ? new URL(val("schema:image"), obsUrl!).toString() : "";
  const creatorId = val("dcterms:creator");
  const isMyEntry =
    !!obsUrl && state?.profile.webId.split("#")[0] === creatorId.split("#")[0];

  return (
    <div className="mx-auto max-w-4xl p-4">
      <Link to="/browse" className="text-sm text-leaf-600 hover:underline">
        ← Kembali ke katalog
      </Link>
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm">
        {img && (
          <AuthImage src={img} alt={val("dwc:vernacularName")} className="max-h-96 w-full object-contain bg-stone-900" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{val("dwc:vernacularName")}</h1>
              <p className="italic text-stone-500">{val("dwc:scientificName")}</p>
            </div>
            <StatusBadge code={val("natfun:conservationStatus")} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Row k="Kingdom" v={val("dwc:kingdom")} />
            <Row k="Kelas" v={val("dwc:class")} />
            <Row k="Famili" v={val("dwc:family")} />
            <Row k="Provinsi" v={val("natfun:province")} />
            <Row k="Habitat" v={val("natfun:habitat")} />
            <Row k="Lisensi" v={licenseId} />
            <Row
              k="Pemilik"
              v={
                owner ? (
                  <span>
                    {displayName({ ...owner.profile, storage: null })}{" "}
                    <span className="text-xs text-stone-400">({owner.profile.webId})</span>
                  </span>
                ) : (
                  creatorId
                )
              }
            />
          </dl>

          {role === "Parent" && (
            <div className="mt-5 flex items-center gap-3">
              {myLikeUrl ? (
                <button
                  disabled={busy}
                  onClick={doUnlike}
                  className="rounded-full bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700"
                >
                  ❤️ Disukai ({likes.length}) — batal
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={doLike}
                  className="rounded-full border border-leaf-600 px-4 py-2 text-sm font-semibold text-leaf-700 hover:bg-leaf-50"
                >
                  🤍 Suka ({likes.length})
                </button>
              )}
            </div>
          )}
          {role !== "Parent" && (
            <p className="mt-4 text-sm text-stone-500">❤️ {likes.length} suka</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Komentar ({comments.length})</h2>
        {error && obs && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {role === "Parent" && (
          <div className="mt-3 flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
              placeholder="Tulis komentar (maks 500 karakter)…"
              className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              disabled={busy || !commentText.trim()}
              onClick={doComment}
              className="rounded-md bg-leaf-600 px-4 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-50"
            >
              Kirim
            </button>
          </div>
        )}
        <ul className="mt-4 space-y-3">
          {comments.map((c) => (
            <li key={c.refUrl} className="rounded-lg bg-stone-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap break-words">{c.content}</p>
                {isMyEntry && (
                  <button
                    title="Sembunyikan komentar"
                    onClick={() => hideComment(c.refUrl)}
                    className="text-xs text-stone-400 hover:text-red-600"
                  >
                    ✕ sembunyikan
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-400">
                {c.actor.split("/")[2]} · {new Date(c.published).toLocaleString("id-ID")}
              </p>
            </li>
          ))}
          {comments.length === 0 && <li className="text-sm text-stone-400">Belum ada komentar.</li>}
        </ul>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-400">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}
