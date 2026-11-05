import { readJson, putJson } from "@/lib/ldp";
import { fetchProfileCached } from "@/lib/profile";
import type { UserPodPaths } from "@/lib/podInit";

export interface FollowItem {
  type?: string;
  object: string;
  published: string;
}

export interface FollowingList {
  "@context": string;
  "@type": "Collection";
  actor: string;
  items: FollowItem[];
}

/** FR-SOC-02: follow list di Pod follower. */
export async function readFollowingList(paths: UserPodPaths): Promise<FollowingList> {
  const doc = await readJson<FollowingList>(paths.following);
  if (doc && Array.isArray(doc.items)) return doc;
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    "@type": "Collection",
    actor: "",
    items: [],
  };
}

export async function followUser(
  paths: UserPodPaths,
  actorWebId: string,
  targetWebId: string,
): Promise<void> {
  const list = await readFollowingList(paths);
  if (list.items.some((i) => i.object === targetWebId)) return;
  list.items.push({ object: targetWebId, published: new Date().toISOString() });
  list.actor = actorWebId;
  await putJson(paths.following, list);
}

export async function unfollowUser(paths: UserPodPaths, targetWebId: string): Promise<void> {
  const list = await readFollowingList(paths);
  list.items = list.items.filter((i) => i.object !== targetWebId);
  await putJson(paths.following, list);
}

function storageOf(webId: string, storage: string | null): string {
  if (storage) return storage.endsWith("/") ? storage : `${storage}/`;
  const u = new URL(webId.split("#")[0]);
  return `${u.origin}/`;
}

/**
 * FR-SOC-03: mutual dihitung saat tampil, bukan disimpan.
 * Membaca follow list milik `otherWebId` dan memeriksa apakah memuat `myWebId`.
 */
export async function isMutual(myWebId: string, otherWebId: string): Promise<boolean> {
  try {
    const otherProfile = await fetchProfileCached(otherWebId);
    const storage = storageOf(otherWebId, otherProfile.storage);
    const their = await readJson<FollowingList>(`${storage}natfun/social/following.jsonld`);
    if (!their) return false;
    return their.items.some(
      (i) => String(i.object ?? "").split("#")[0] === myWebId.split("#")[0],
    );
  } catch {
    return false;
  }
}
