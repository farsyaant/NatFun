import { postJsonToContainer, readJson, putJson, uuid, jsonLdContext, deleteResource } from "@/lib/ldp";
import { listContainer } from "@/lib/ldp";
import { fetch } from "@/lib/auth";
import { webIdExists } from "@/lib/profile";
import type { UserPodPaths } from "@/lib/podInit";

export interface ChildLink {
  linkId: string;
  parentWebId: string;
  childWebId: string;
  status: "pending" | "accepted" | "declined";
  created: string;
}

export interface ChildAcceptance {
  linkId: string;
  accepted: string;
}

/** FR-ROLE-02/03: Parent mengajukan link (validasi URL + profil fetch). */
export async function requestChildLink(
  officialRoot: string,
  parentWebId: string,
  childWebId: string,
): Promise<void> {
  const clean = childWebId.trim();
  if (!/^https?:\/\//.test(clean)) {
    throw new Error("WebID harus berupa URL https://...");
  }
  if (!(await webIdExists(clean))) {
    throw new Error("Profil WebID anak tidak dapat diambil. Periksa URL dan izinnya.");
  }
  await postJsonToContainer(`${officialRoot}child-links/`, {
    "@context": jsonLdContext(),
    "@type": "natfun:ChildLink",
    "natfun:linkId": uuid(),
    "natfun:parentWebId": parentWebId,
    "natfun:childWebId": clean,
    "natfun:status": "pending",
    "dcterms:created": new Date().toISOString(),
  });
}

/** FR-ROLE-04: daftar link request yang menunggu WebID ini. */
export async function pendingLinksFor(
  officialRoot: string,
  webId: string,
): Promise<ChildLink[]> {
  const urls = await listContainer(`${officialRoot}child-links/`).catch(() => [] as string[]);
  const out: ChildLink[] = [];
  for (const url of urls) {
    const doc = await readJson<Record<string, unknown>>(url);
    if (!doc) continue;
    const child = String(doc["natfun:childWebId"] ?? "");
    if (child.split("#")[0] !== webId.split("#")[0]) continue;
    const status = String(doc["natfun:status"] ?? "pending");
    if (status === "accepted") continue;
    out.push({
      linkId: String(doc["natfun:linkId"] ?? url.split("/").pop()?.replace(".jsonld", "")),
      parentWebId: String(doc["natfun:parentWebId"] ?? ""),
      childWebId: child,
      status: "pending",
      created: String(doc["dcterms:created"] ?? ""),
    });
  }
  return out;
}

/** FR-ROLE-05: anak menerima → tulis acceptance di Pod anak + update status link. */
export async function acceptChildLink(
  link: ChildLink,
  childPaths: UserPodPaths,
  officialRoot: string,
): Promise<void> {
  await putJson(`${childPaths.familyAcceptances}${link.linkId}.jsonld`, {
    "@context": jsonLdContext(),
    "@type": "natfun:ChildAcceptance",
    "natfun:linkId": link.linkId,
    "dcterms:created": new Date().toISOString(),
  });
  // tandai accepted di Official Pod (hanya Admin/pemilik Official Pod bisa menulis;
  // untuk prototipe, pengupdate-an status dilakukan Admin. Jika gagal, abaikan.)
  await updateLinkStatus(officialRoot, link.linkId, "accepted").catch(() => {});
}

export async function declineChildLink(
  officialRoot: string,
  linkId: string,
): Promise<void> {
  // FR-ROLE-06: Admin dapat menghapus link request
  await updateLinkStatus(officialRoot, linkId, "declined").catch(() => {});
}

/** Tulis status baru ke file link (dipakai oleh pihak berizin menulis). */
export async function updateLinkStatus(
  officialRoot: string,
  linkId: string,
  status: "accepted" | "declined",
): Promise<void> {
  const urls = await listContainer(`${officialRoot}child-links/`).catch(() => [] as string[]);
  for (const url of urls) {
    const doc = await readJson<Record<string, unknown>>(url);
    if (!doc) continue;
    if (String(doc["natfun:linkId"] ?? "") === linkId) {
      await putJson(url, { ...doc, "natfun:status": status });
      return;
    }
  }
}

/** FR-ROLE-08 (S): daftar anak yang di-link oleh Parent ini. */
export async function listMyChildLinks(
  officialRoot: string,
  parentWebId: string,
): Promise<ChildLink[]> {
  const urls = await listContainer(`${officialRoot}child-links/`).catch(() => [] as string[]);
  const out: ChildLink[] = [];
  for (const url of urls) {
    const doc = await readJson<Record<string, unknown>>(url);
    if (!doc) continue;
    if (String(doc["natfun:parentWebId"] ?? "").split("#")[0] !== parentWebId.split("#")[0]) continue;
    out.push({
      linkId: String(doc["natfun:linkId"] ?? ""),
      parentWebId: String(doc["natfun:parentWebId"] ?? ""),
      childWebId: String(doc["natfun:childWebId"] ?? ""),
      status: (String(doc["natfun:status"] ?? "pending") as "pending" | "accepted" | "declined"),
      created: String(doc["dcterms:created"] ?? ""),
    });
  }
  return out;
}

/** FR-ROLE-06: cabut acceptance dari Pod sendiri. */
export async function revokeAcceptance(
  childPaths: UserPodPaths,
  linkId: string,
): Promise<void> {
  await deleteResource(`${childPaths.familyAcceptances}${linkId}.jsonld`).catch(() => {});
}

export { fetch };
