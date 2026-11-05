import { getSolidDataset, getThing, getStringNoLocale, getUrl } from "@inrupt/solid-client";
import { fetch } from "@/lib/auth";
import { ns } from "@/lib/vocab";

export interface ProfileInfo {
  webId: string;
  name: string | null;
  storage: string | null;
}

export async function fetchProfile(webId: string): Promise<ProfileInfo> {
  const dataset = await getSolidDataset(webId, { fetch });
  const thing = getThing(dataset, webId);
  const profileCard = webId.split("#")[0];
  const me = thing ?? getThing(dataset, `${profileCard}#me`);
  const name =
    (me && (getStringNoLocale(me, `${ns.foaf}name`) ?? getStringNoLocale(me, `${ns.vcard}fn`))) ||
    null;
  const storage = (me && getUrl(me, `${ns.pim}storage`)) || null;
  return { webId, name, storage };
}

/** Cache profil (B6): profil jarang berubah; menghindari fetch berulang
 *  (verifiedInteractions, isMutual, Messages memanggil fetchProfile per ref).
 *  Termasuk dedupe in-flight agar pemanggilan paralel tidak berdobel. */
const profileCache = new Map<string, ProfileInfo>();
const profileInflight = new Map<string, Promise<ProfileInfo>>();

export async function fetchProfileCached(webId: string): Promise<ProfileInfo> {
  const hit = profileCache.get(webId);
  if (hit) return hit;
  const running = profileInflight.get(webId);
  if (running) return running;
  const p = (async () => {
    try {
      const prof = await fetchProfile(webId);
      profileCache.set(webId, prof);
      return prof;
    } finally {
      profileInflight.delete(webId);
    }
  })();
  profileInflight.set(webId, p);
  return p;
}

export function clearProfileCache(): void {
  profileCache.clear();
  profileInflight.clear();
}

export async function webIdExists(webId: string): Promise<boolean> {
  try {
    await getSolidDataset(webId, { fetch });
    return true;
  } catch {
    return false;
  }
}

/** Root storage suatu WebID; fallback ke root URL dari WebID itu sendiri. */
export function storageRootOf(webId: string, storage: string | null): string {
  if (storage) return storage.endsWith("/") ? storage : `${storage}/`;
  const u = new URL(webId.split("#")[0]);
  return `${u.origin}/`;
}

export function displayName(p: ProfileInfo | null, fallback = "Tanpa nama"): string {
  return p?.name ?? p?.webId ?? fallback;
}
