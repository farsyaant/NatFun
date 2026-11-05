import AuthImage from "@/components/AuthImage";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { readFollowingList } from "@/lib/social";
import { fetchObservationDocument, thumbnailUrlOf } from "@/lib/catalog";

export default function Profile() {
  const { state } = useAuth();
  const [entryCount, setEntryCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [entries, setEntries] = useState<Array<{ id: string; thumb: string; name: string }>>([]);

  const load = useCallback(async () => {
    if (!state) return;
    const mine = state.catalog.items.filter(
      (e) => e.ownerWebId.split("#")[0] === state.profile.webId.split("#")[0],
    );
    setEntryCount(mine.length);
    setEntries(
      await Promise.all(
        mine.map(async (e) => {
          const obs = await fetchObservationDocument(e.observationUrl);
          return {
            id: e.id,
            thumb: obs ? thumbnailUrlOf(e.observationUrl, obs) : e.thumbnailUrl,
            name: String(obs?.["dwc:vernacularName"] ?? e.localName),
          };
        }),
      ),
    );
    if (state.podPaths) {
      const l = await readFollowingList(state.podPaths);
      setFollowingCount(l.items.length);
    }
  }, [state]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
  }, [load]);

  if (!state) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">{state.profile.name ?? state.profile.webId}</h1>
        <p className="break-all text-sm text-stone-400">{state.profile.webId}</p>
        <div className="mt-4 flex gap-6 text-sm">
          <span>
            <strong>{entryCount}</strong> entri disetujui
          </span>
          <span>
            <strong>{followingCount}</strong> mengikuti
          </span>
          <span className="text-stone-400">Peran: {state.role}</span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map((e) => (
          <li key={e.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
            {e.thumb && <AuthImage src={e.thumb} alt={e.name} className="h-28 w-full object-cover" />}
            <p className="p-2 text-sm font-medium">{e.name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
