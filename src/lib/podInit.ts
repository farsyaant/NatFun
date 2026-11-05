import { fetch } from "@/lib/auth";
import { ensureContainer, applyAcl } from "@/lib/acl";
import { storageRootOf } from "@/lib/profile";

/**
 * Container layout user (Appendix A.2), dipasang pada first login (FR-AUTH-07).
 * Admin memakai initOfficialPod (A.1).
 */

export function natfunRoot(storage: string): string {
  return `${storage}natfun/`;
}

export interface UserPodPaths {
  root: string;
  observations: string;
  photos: string;
  interactions: string;
  activitiesLikes: string;
  activitiesComments: string;
  following: string;
  inbox: string;
  sent: string;
  familyAcceptances: string;
}

export function userPodPaths(storage: string): UserPodPaths {
  const r = natfunRoot(storage);
  return {
    root: r,
    observations: `${r}observations/`,
    photos: `${r}photos/`,
    interactions: `${r}interactions/`,
    activitiesLikes: `${r}activities/likes/`,
    activitiesComments: `${r}activities/comments/`,
    following: `${r}social/following.jsonld`,
    inbox: `${r}inbox/`,
    sent: `${r}messages/sent/`,
    familyAcceptances: `${r}family/acceptances/`,
  };
}

export async function natfunRootExists(storage: string): Promise<boolean> {
  const res = await fetch(natfunRoot(storage), { method: "GET" });
  return res.ok;
}

/** FR-AUTH-07: buat struktur + ACL Pod user. Mengembalikan true bila dibuat baru.
 *  Toleran: kegagalan satu container/ACL dicatat sebagai warning, tidak menggagalkan login
 *  (FR-AUTH-08 / FR-ACL-03: fitur tulis terkait akan menampilkan error saat dipakai). */
export async function initUserPod(webId: string, storage: string): Promise<boolean> {
  const existed = await natfunRootExists(storage).catch(() => false);
  const p = userPodPaths(storage);
  // Owner = WebID LENGKAP (dengan fragment #me) — WAC mencocokkan URI eksak;
  // memecah fragment membuat owner tidak match → seluruh tulisan 403.
  const owner = webId;
  const failures: string[] = [];

  for (const c of [
    p.observations,
    p.photos,
    p.interactions,
    p.activitiesLikes,
    p.activitiesComments,
    p.inbox,
    p.sent,
    p.familyAcceptances,
  ]) {
    await ensureContainer(c).catch((e) => {
      failures.push(`container ${c}: ${e instanceof Error ? e.message : e}`);
    });
  }

  const tasks: Array<[string, Parameters<typeof applyAcl>[1]]> = [
    // observations & photos: authenticated read, owner full
    [p.observations, { read: "auth", writeOwner: true, defaultForNew: true }],
    [p.photos, { read: "auth", writeOwner: true, defaultForNew: true }],
    // interactions: authenticated read+append, owner full (FR-ACL-04)
    [p.interactions, { read: "auth", append: "auth", writeOwner: true, defaultForNew: true }],
    // activities: authenticated read, owner full
    [p.activitiesLikes, { read: "auth", writeOwner: true, defaultForNew: true }],
    [p.activitiesComments, { read: "auth", writeOwner: true, defaultForNew: true }],
    // inbox: owner read/control, authenticated APPEND only (tanpa read!)
    [p.inbox, { append: "auth", writeOwner: true, defaultForNew: true }],
    // sent: owner only
    [p.sent, { writeOwner: true, defaultForNew: true }],
    // family acceptances: authenticated read, owner full
    [p.familyAcceptances, { read: "auth", writeOwner: true, defaultForNew: true }],
  ];

  for (const [url, spec] of tasks) {
    await applyAcl(url, spec, owner).catch((e) => {
      failures.push(`acl ${url}: ${e instanceof Error ? e.message : e}`);
    });
  }

  if (failures.length > 0) {
    console.warn("[NatFun] Sebagian inisialisasi Pod gagal (FR-AUTH-08):\n" + failures.join("\n"));
  }

  // following.jsonld + inbox per-file ACL ditangani oleh defaultForNew di atas
  return !existed;
}

/** A.1: struktur Official Pod milik Admin. Toleran terhadap kegagalan per-container. */
export async function initOfficialPod(adminWebId: string, storage: string): Promise<boolean> {
  const r = natfunRoot(storage);
  const existed = await fetch(r, { method: "GET" }).then((x) => x.ok).catch(() => false);
  const failures: string[] = [];
  const dirs = [
    "catalog/",
    "official/observations/",
    "official/photos/",
    "interactions/",
    "submissions/",
    "decisions/",
    "reports/",
    "child-links/",
  ];
  for (const d of dirs) {
    await ensureContainer(`${r}${d}`).catch((e) => {
      failures.push(`container ${r}${d}: ${e instanceof Error ? e.message : e}`);
    });
  }

  const tasks: Array<[string, Parameters<typeof applyAcl>[1]]> = [
    [`${r}catalog/`, { read: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}official/observations/`, { read: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}official/photos/`, { read: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}interactions/`, { read: "auth", append: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}submissions/`, { append: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}decisions/`, { read: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}reports/`, { append: "auth", writeOwner: true, defaultForNew: true }],
    [`${r}child-links/`, { read: "auth", append: "auth", writeOwner: true, defaultForNew: true }],
  ];
  for (const [url, spec] of tasks) {
    // WebID lengkap dengan fragment — lihat catatan di initUserPod
    await applyAcl(url, spec, adminWebId).catch((e) => {
      failures.push(`acl ${url}: ${e instanceof Error ? e.message : e}`);
    });
  }
  if (failures.length > 0) {
    console.warn("[NatFun] Sebagian inisialisasi Official Pod gagal:\n" + failures.join("\n"));
  }
  return !existed;
}

/** Cari storage root WebID dengan profil; throw bila gagal (FR-AUTH-08). */
export async function findStorageOf(webId: string, profileStorage: string | null): Promise<string> {
  if (profileStorage) return storageRootOf(webId, profileStorage);
  // fallback: uji beberapa kandidat umum
  const u = new URL(webId.split("#")[0]);
  for (const candidate of [`${u.origin}/`, `${u.origin}/${u.pathname.split("/")[1]}/`]) {
    try {
      const res = await fetch(candidate, { method: "HEAD" });
      if (res.ok) return candidate;
    } catch {
      // lanjut kandidat berikutnya
    }
  }
  throw new Error("Storage Pod tidak ditemukan. Periksa profil WebID Anda (pim:storage).");
}
