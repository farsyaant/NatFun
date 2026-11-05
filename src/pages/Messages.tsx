import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { readInbox, readSent, sendMessage, type DirectMessage } from "@/lib/messages";
import { readFollowingList, isMutual } from "@/lib/social";
import { fetchProfileCached, displayName, storageRootOf } from "@/lib/profile";
import { mapLimit } from "@/lib/concurrency";
import { appConfig } from "@/config/appConfig";

export default function Messages() {
  const { state } = useAuth();
  const [inbox, setInbox] = useState<DirectMessage[]>([]);
  const [sent, setSent] = useState<DirectMessage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [storages, setStorages] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const storage = state?.storage ?? null;
  const podPaths = state?.podPaths ?? null;
  const myWebId = state?.profile.webId ?? "";
  // FR-DM-04: hanya tampilkan pesan dari mutual saat ini
  const load = useCallback(async () => {
    if (!storage || !podPaths) return;
    try {
      const [ibx, snt] = await Promise.all([
        readInbox(storage),
        readSent(podPaths),
      ]);
      const following = await readFollowingList(podPaths);
      const mutual = new Set<string>();
      const n: Record<string, string> = {};
      const st: Record<string, string> = {};
      // B7: paralel + profil cache; key nama/storage = WebID tanpa fragment
      // agar cocok dengan key percakapan (peer tanpa fragment).
      await mapLimit(following.items, 6, async (item) => {
        const target = String(item.object);
        const key = target.split("#")[0];
        if (await isMutual(myWebId, target)) {
          mutual.add(key);
          try {
            const p = await fetchProfileCached(target);
            n[key] = displayName(p);
            st[key] = storageRootOf(target, p.storage);
          } catch {
            n[key] = target;
          }
        }
      });
      setNames(n);
      setStorages(st);
      setInbox(ibx.filter((m) => mutual.has(m.from.split("#")[0])));
      setSent(snt.filter((m) => mutual.has(m.to.split("#")[0])));
    } catch {
      setError("Gagal memuat pesan.");
    }
  }, [storage, podPaths, myWebId]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch data eksternal di mount
    load();
    const t = setInterval(load, appConfig.messagePollMs); // FR-DM-07
    return () => clearInterval(t);
  }, [load]);

  const conversations = useMemo(() => {
    const myKey = myWebId.split("#")[0];
    const byPeer = new Map<string, DirectMessage[]>();
    for (const m of [...inbox, ...sent]) {
      const peer = m.from.split("#")[0] === myKey ? m.to : m.from;
      const k = peer.split("#")[0];
      if (!byPeer.has(k)) byPeer.set(k, []);
      byPeer.get(k)!.push(m);
    }
    return [...byPeer.entries()].sort((a, b) =>
      (b[1].at(-1)?.published ?? "").localeCompare(a[1].at(-1)?.published ?? ""),
    );
  }, [inbox, sent, myWebId]);

  const thread = useMemo(
    () => (active ? conversations.find(([k]) => k === active)?.[1] ?? [] : []),
    [active, conversations],
  );

  const send = async () => {
    if (!state?.podPaths || !active || !text.trim()) return;
    try {
      const recipientStorage = storages[active];
      if (!recipientStorage) throw new Error("Storage penerima tidak diketahui.");
      await sendMessage(
        state.profile.webId,
        active,
        recipientStorage,
        shareUrl ? `${text}\n${shareUrl}` : text,
        undefined,
        state.podPaths,
      );
      setText("");
      setShareUrl(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan.");
    }
  };

  if (error && inbox.length === 0 && sent.length === 0) {
    return <p className="p-8 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto grid h-full max-w-4xl gap-4 p-4 md:grid-cols-[240px_1fr]">
      <aside className="space-y-2 overflow-auto">
        <h1 className="text-lg font-bold">Pesan</h1>
        <p className="text-xs text-stone-400">
          Hanya mutual. Tidak terenkripsi end-to-end (FR-DM-08).
        </p>
        {conversations.map(([peer, msgs]) => (
          <button
            key={peer}
            onClick={() => setActive(peer)}
            className={`w-full rounded-xl p-3 text-left text-sm ${
              active === peer ? "bg-leaf-100" : "bg-white shadow-sm hover:bg-stone-50"
            }`}
          >
            <p className="font-semibold">{names[peer] ?? peer}</p>
            <p className="truncate text-xs text-stone-400">{msgs.at(-1)?.content}</p>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-500">
            Belum ada percakapan. Bagikan entri atau kirim pesan ke mutual Anda.
          </p>
        )}
      </aside>

      <section className="flex flex-col rounded-xl bg-white shadow-sm">
        {!active ? (
          <p className="m-auto text-stone-400">Pilih percakapan.</p>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-auto p-4">
              {thread.map((m) => {
                const mine = m.from.split("#")[0] === state?.profile.webId.split("#")[0];
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-leaf-600 text-white" : "bg-stone-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      {m.attachment && (
                        <a
                          href={`/entry/${m.attachment.split("/").pop()?.replace(".jsonld", "")}`}
                          className="mt-1 block text-xs underline opacity-80"
                        >
                          📎 lihat entri
                        </a>
                      )}
                      <p className="mt-0.5 text-[10px] opacity-60">
                        {new Date(m.published).toLocaleTimeString("id-ID")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 border-t border-stone-200 p-3">
              <input
                value={text}
                maxLength={appConfig.messageMaxLength}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Tulis pesan…"
                className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="rounded-md bg-leaf-600 px-4 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-50"
              >
                Kirim
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

