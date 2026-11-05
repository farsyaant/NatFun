import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { readFollowingList, followUser, unfollowUser, isMutual, type FollowingList } from "@/lib/social";
import { fetchProfileCached, displayName } from "@/lib/profile";
import { mapLimit } from "@/lib/concurrency";

export default function Following() {
  const { state } = useAuth();
  const [list, setList] = useState<FollowingList | null>(null);
  const [mutuals, setMutuals] = useState<Record<string, boolean>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [followInput, setFollowInput] = useState("");

  const podPaths = state?.podPaths ?? null;
  const myWebId = state?.profile.webId ?? "";
  const load = useCallback(async () => {
    if (!podPaths) return;
    try {
      const l = await readFollowingList(podPaths);
      setList(l);
      const m: Record<string, boolean> = {};
      const n: Record<string, string> = {};
      // B7: paralel + profil cache — duplikat target hanya fetch sekali
      await mapLimit(l.items, 6, async (item) => {
        const target = String(item.object);
        m[target] = await isMutual(myWebId, target);
        try {
          n[target] = displayName(await fetchProfileCached(target));
        } catch {
          n[target] = target;
        }
      });
      setMutuals(m);
      setNames(n);
    } catch {
      setError("Gagal membaca daftar mengikuti.");
    }
  }, [podPaths, myWebId]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
  }, [load]);

  const follow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state?.podPaths || !followInput.trim()) return;
    try {
      await followUser(state.podPaths, state.profile.webId, followInput.trim());
      setFollowInput("");
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengikuti.");
    }
  };

  const unfollow = async (target: string) => {
    if (!state?.podPaths) return;
    try {
      await unfollowUser(state.podPaths, target);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal berhenti mengikuti.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Mengikuti</h1>
      <p className="text-sm text-stone-500">
        Disimpan di <code className="text-xs">natfun/social/following.jsonld</code> di Pod Anda.
        "Saling" muncul hanya bila kalian saling mengikuti (dihitung saat tampil).
      </p>
      <form onSubmit={follow} className="flex gap-2">
        <input
          value={followInput}
          onChange={(e) => setFollowInput(e.target.value)}
          placeholder="WebID Parent yang mau diikuti…"
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700">
          Ikuti
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {list?.items.map((item) => {
          const target = String(item.object);
          return (
            <li
              key={target}
              className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm"
            >
              <div>
                <p className="font-semibold">{names[target] ?? target}</p>
                <p className="break-all text-xs text-stone-400">{target}</p>
              </div>
              <div className="flex items-center gap-2">
                {mutuals[target] && (
                  <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-semibold text-leaf-700">
                    Saling
                  </span>
                )}
                <button onClick={() => unfollow(target)} className="text-xs text-red-600 hover:underline">
                  Berhenti
                </button>
              </div>
            </li>
          );
        })}
        {list && list.items.length === 0 && (
          <li className="rounded-lg bg-stone-100 p-4 text-stone-500">
            Belum mengikuti siapa pun. Ikuti pemilik entri dari halaman katalog.
          </li>
        )}
      </ul>
    </div>
  );
}
