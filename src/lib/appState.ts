import { appConfig } from "@/config/appConfig";
import { fetchProfile, storageRootOf, type ProfileInfo } from "@/lib/profile";
import { initUserPod, initOfficialPod, natfunRoot, findStorageOf, userPodPaths } from "@/lib/podInit";
import { listContainer, readJson } from "@/lib/ldp";
import type { CatalogIndex } from "@/lib/vocab";

export type Role = "Child" | "Parent" | "Admin";

function emptyCatalog(): CatalogIndex {
  return {
    "@context": { as: "https://www.w3.org/ns/activitystreams" },
    "@type": "Collection",
    items: [],
  };
}

export interface AppState {
  profile: ProfileInfo;
  role: Role;
  storage: string | null;
  podPaths: ReturnType<typeof userPodPaths> | null;
  officialRoot: string | null;
  catalog: CatalogIndex;
  isNewPod: boolean;
}

/** Official root dari WebID admin (A-04). */
export async function locateOfficialPod(): Promise<string> {
  const adminProfile = await fetchProfile(appConfig.adminWebId);
  const storage = await findStorageOf(appConfig.adminWebId, adminProfile.storage);
  return natfunRoot(storage);
}

/** FR-ROLE-01: resolusi peran.
 *  Anak dianggap Child bila: link "accepted" di Official Pod, ATAU link masih
 *  "pending" tetapi acceptance sudah ada di Pod anak sendiri (anak berhak
 *  membaca file miliknya; ia TIDAK berhak menulis status di Official Pod). */
export async function resolveRole(
  webId: string,
  officialRoot: string,
  ownStorage: string,
  deps: {
    listUrls: (container: string) => Promise<string[]>;
    readDoc: (url: string) => Promise<Record<string, unknown> | null>;
  } = {
    listUrls: listContainer,
    readDoc: (u: string) => readJson<Record<string, unknown>>(u),
  },
): Promise<Role> {
  if (webId === appConfig.adminWebId) return "Admin";
  try {
    const links = await deps.listUrls(`${officialRoot}child-links/`);
    for (const linkUrl of links) {
      const link = await deps.readDoc(linkUrl);
      if (!link) continue;
      if (String(link["natfun:childWebId"] ?? "").split("#")[0] !== webId.split("#")[0]) continue;
      const status = String(link["natfun:status"] ?? "pending");
      if (status === "accepted") return "Child";
      if (status === "pending") {
        const linkId = String(
          link["natfun:linkId"] ?? linkUrl.split("/").pop()?.replace(".jsonld", "") ?? "",
        );
        if (!linkId) continue;
        const acc = await deps.readDoc(`${natfunRoot(ownStorage)}family/acceptances/${linkId}.jsonld`);
        if (acc && String(acc["natfun:linkId"] ?? "") === linkId) return "Child";
      }
    }
  } catch {
    // tanpa akses child-links → dianggap Parent
  }
  return "Parent";
}

export async function loadCatalog(officialRoot: string): Promise<CatalogIndex> {
  const idx = await readJson<CatalogIndex>(`${officialRoot}catalog/index.jsonld`);
  if (idx && Array.isArray(idx.items)) return idx;
  return {
    "@context": { as: "https://www.w3.org/ns/activitystreams" },
    "@type": "Collection",
    items: [],
  };
}

/** Muat seluruh state aplikasi setelah login; inisialisasi Pod bila perlu. */
export async function loadAppState(webId: string): Promise<AppState> {
  const profile = await fetchProfile(webId);
  const storage = await findStorageOf(webId, profile.storage).catch(() => null);
  if (!storage) {
    throw new Error(
      "Storage Pod tidak dapat ditemukan. Pastikan profil WebID Anda memiliki pim:storage, atau cek izin server.",
    );
  }
  // Toleran: Official Pod mungkin belum dikonfigurasi (A-04) — jangan blokir login.
  const officialRoot = await locateOfficialPod().catch((e) => {
    console.warn(
      "[NatFun] Official Pod tidak dapat diakses (fitur katalog/moderasi nonaktif):",
      e instanceof Error ? e.message : e,
    );
    return null;
  });
  const role = officialRoot ? await resolveRole(webId, officialRoot, storage) : "Parent";

  // Diagnostik: user memiliki Pod yang sama dengan Official Pod tapi bukan Admin → .env salah/stale
  if (role !== "Admin" && officialRoot) {
    const officialOrigin = new URL(officialRoot).origin;
    const myOrigin = new URL(storage).origin;
    if (officialOrigin === myOrigin) {
      console.warn(
        `[NatFun] Pod Anda (${storage}) adalah Official Pod, tetapi WebID Anda bukan adminWebId di config. ` +
          `Cek VITE_NATFUN_ADMIN_WEBID (harus persis: ${appConfig.adminWebId}) dan RESTART dev server.`,
      );
    }
  }
  console.info(`[NatFun] Login: ${webId} — peran: ${role} — storage: ${storage}`);
  let isNewPod = false;

  if (role === "Admin") {
    isNewPod = await initOfficialPod(webId, storage);
  } else {
    isNewPod = await initUserPod(webId, storage);
  }

  const catalog = officialRoot ? await loadCatalog(officialRoot) : emptyCatalog();

  return {
    profile,
    role,
    storage,
    podPaths: userPodPaths(storage),
    officialRoot,
    catalog,
    isNewPod,
  };
}

export { storageRootOf };
