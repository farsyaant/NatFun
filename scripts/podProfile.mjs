/**
 * Cari root storage Pod dari profil WebID.
 * Memakai solid-client (sama seperti aplikasi) agar tahan terhadap
 * serialisasi apapun yang dikembalikan server (turtle / JSON-LD compact).
 */
import { getSolidDataset, getThingAll, getUrl } from "@inrupt/solid-client";

const PIM_STORAGE = "http://www.w3.org/ns/pim/space#storage";

/**
 * @param {string} webId
 * @param {{ fetch: typeof fetch }} deps
 * @returns {Promise<string>} root storage dengan trailing slash
 */
export async function findStorageRoot(webId, { fetch: fetchFn }) {
  try {
    const ds = await getSolidDataset(webId, { fetch: fetchFn });
    for (const thing of getThingAll(ds, true)) {
      const s = getUrl(thing, PIM_STORAGE);
      if (s) return s.endsWith("/") ? s : `${s}/`;
    }
  } catch {
    // profil tak terbaca → coba fallback
  }
  // fallback kandidat umum
  const u = new URL(webId.split("#")[0]);
  try {
    const res = await fetchFn(`${u.origin}/`, { method: "HEAD" });
    if (res.ok) return `${u.origin}/`;
  } catch {
    // lanjut ke error
  }
  throw new Error("pim:storage tidak ditemukan di profil WebID.");
}