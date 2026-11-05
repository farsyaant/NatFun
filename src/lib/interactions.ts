import { postJsonToContainer, putJson, readJson, uuid, jsonLdContext, deleteResource, listContainer as listLdp } from "@/lib/ldp";
import { fetch as solidFetch } from "@/lib/auth";
import { fetchProfileCached, storageRootOf } from "@/lib/profile";
import { mapLimit } from "@/lib/concurrency";
import type { UserPodPaths } from "@/lib/podInit";

export interface InteractionItem {
  refUrl: string;
  resourceUrl: string;
  actor: string;
  kind: "Like" | "Note";
  content?: string;
  published: string;
}

export function observationIdOf(observationUrl: string): string {
  return observationUrl.split("/").pop()?.replace(".jsonld", "") ?? "";
}

/** FR-INT-02/04: simpan Like/Note di Pod aktor. */
async function storeInActorPod(
  paths: UserPodPaths,
  kind: "Like" | "Note",
  doc: Record<string, unknown>,
): Promise<string> {
  const container = kind === "Like" ? paths.activitiesLikes : paths.activitiesComments;
  const url = `${container}${uuid()}.jsonld`;
  await putJson(url, doc);
  return url;
}

/** Pastikan container interaksi per-observasi ada. Hanya PEMILIK Pod yang
 *  berhak membuatnya (write); pemanggil non-owner akan gagal 403. */
export async function ensureInteractionContainer(
  ownerPaths: UserPodPaths,
  observationUrl: string,
): Promise<void> {
  const container = `${ownerPaths.interactions}${observationIdOf(observationUrl)}/`;
  const probe = await solidFetch(container, { method: "GET" }).catch(() => null);
  if (probe?.ok) return;
  const created = await solidFetch(container, { method: "PUT" });
  if (!created.ok && created.status !== 409) {
    throw new Error(`Gagal membuat container interaksi: ${created.status}`);
  }
}

/** FR-INT-03: append InteractionRef ke interaction container milik pemilik entry.
 *  Container per-observasi dibuat oleh PEMILIK (saat upload / seed). Bila belum ada:
 *  - actor = owner  → buat container lalu POST ulang (self-healing di Pod sendiri);
 *  - actor ≠ owner  → error jelas (commenter hanya punya append, PUT = 403)
 *    dan doc di Pod aktor dibersihkan agar tidak jadi orphan. */
export async function addInteraction(
  actorWebId: string,
  actorPaths: UserPodPaths,
  observationUrl: string,
  ownerPaths: UserPodPaths,
  kind: "Like" | "Note",
  doc: Record<string, unknown>,
): Promise<void> {
  const resourceUrl = await storeInActorPod(actorPaths, kind, doc);
  const ref = {
    "@context": jsonLdContext(),
    "@type": "natfun:InteractionRef",
    "natfun:kind": kind,
    "as:actor": actorWebId,
    "natfun:resource": resourceUrl,
    "as:published": new Date().toISOString(),
  };
  const container = `${ownerPaths.interactions}${observationIdOf(observationUrl)}/`;
  const isOwner = ownerPaths.interactions === actorPaths.interactions;
  try {
    await postJsonToContainer(container, ref);
  } catch {
    if (!isOwner) {
      await deleteResource(resourceUrl).catch(() => {});
      throw new Error(
        "Komentar/suka gagal: container interaksi entri ini belum disiapkan pemiliknya " +
          "dan hanya pemilik yang berhak membuatnya.",
      );
    }
    await ensureInteractionContainer(ownerPaths, observationUrl);
    await postJsonToContainer(container, ref);
  }
}

export async function likeEntry(
  actorWebId: string,
  actorPaths: UserPodPaths,
  observationUrl: string,
  ownerPaths: UserPodPaths,
): Promise<void> {
  const doc = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "@id": "#this",
    type: "Like",
    "as:actor": actorWebId,
    "as:object": observationUrl,
    "as:published": new Date().toISOString(),
  };
  await addInteraction(actorWebId, actorPaths, observationUrl, ownerPaths, "Like", doc);
}

export async function commentEntry(
  actorWebId: string,
  actorPaths: UserPodPaths,
  observationUrl: string,
  ownerPaths: UserPodPaths,
  text: string,
): Promise<void> {
  const doc = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "@id": "#this",
    type: "Note",
    "as:attributedTo": actorWebId,
    "as:inReplyTo": observationUrl,
    "as:content": text.slice(0, 500),
    "as:published": new Date().toISOString(),
  };
  await addInteraction(actorWebId, actorPaths, observationUrl, ownerPaths, "Note", doc);
}

/** FR-INT-01: unlike = hapus resource Like di Pod aktor (ref gagal verifikasi otomatis). */
export async function removeLike(
  likeResourceUrl: string,
  refUrl: string,
  isOwnerOfRef: boolean,
): Promise<void> {
  await deleteResource(likeResourceUrl);
  if (isOwnerOfRef) await deleteResource(refUrl).catch(() => {});
}

/**
 * FR-INT-05: hitung like & comment dengan verifikasi.
 * Ref dihitung hanya jika: resource ada, berada di storage aktor, dan actor == WebID aktor.
 */
export async function verifiedInteractions(
  ownerPaths: UserPodPaths,
  observationUrl: string,
): Promise<{ likes: InteractionItem[]; comments: InteractionItem[]; staleRefs: string[] }> {
  const container = `${ownerPaths.interactions}${observationIdOf(observationUrl)}/`;
  const refs = await listLdp(container).catch(() => [] as string[]);
  const likes: InteractionItem[] = [];
  const comments: InteractionItem[] = [];
  const staleRefs: string[] = [];

  // B6: paralel dengan batas konkurensi — profil aktor di-cache sehingga
  // banyak like/komentar dari orang yang sama hanya mem-fetch profil sekali.
  await mapLimit(refs, 6, async (refUrl) => {
    const ref = await readJson<Record<string, unknown>>(refUrl);
    if (!ref) {
      // ref tidak terbaca/hilang → stale (dapat dibersihkan pemilik)
      staleRefs.push(refUrl);
      return;
    }
    const actor = String(ref["as:actor"] ?? ref["actor"] ?? "");
    const resource = String(ref["natfun:resource"] ?? "");
    const kind = String(ref["natfun:kind"] ?? "") as "Like" | "Note";
    if (!actor || !resource || !["Like", "Note"].includes(kind)) {
      staleRefs.push(refUrl);
      return;
    }

    // verifikasi: resource ada?
    const doc = await readJson<Record<string, unknown>>(resource).catch(() => null);
    if (!doc) {
      staleRefs.push(refUrl);
      return;
    }
    // verifikasi: resource di storage aktor & actor cocok
    try {
      const prof = await fetchProfileCached(actor);
      const storage = storageRootOf(actor, prof.storage);
      if (!resource.startsWith(storage)) {
        staleRefs.push(refUrl);
        return;
      }
      const docActor = String(doc["actor"] ?? doc["as:actor"] ?? doc["attributedTo"] ?? doc["as:attributedTo"] ?? "");
      const docActorId = docActor.split("#")[0];
      if (docActorId !== actor.split("#")[0]) {
        staleRefs.push(refUrl);
        return;
      }
      const item: InteractionItem = {
        refUrl,
        resourceUrl: resource,
        actor,
        kind,
        content: typeof doc["content"] === "string" ? doc["content"] : typeof doc["as:content"] === "string" ? doc["as:content"] : undefined,
        published: String(doc["published"] ?? doc["as:published"] ?? ""),
      };
      if (kind === "Like") likes.push(item);
      else comments.push(item);
    } catch {
      staleRefs.push(refUrl);
    }
  });
  const byPublished = (a: InteractionItem, b: InteractionItem) => a.published.localeCompare(b.published);
  likes.sort(byPublished);
  comments.sort(byPublished);
  return { likes, comments, staleRefs };
}

/** FR-INT-06: pemilik entry menyembunyikan comment (hapus ref dari container). */
export async function removeInteractionRef(refUrl: string): Promise<void> {
  await deleteResource(refUrl);
}

/** D5: pemilik membersihkan stale refs (like/komentar yang resource-nya
 *  sudah hilang) dari container interaksinya. Best effort per ref. */
export async function deleteStaleRefs(refUrls: string[]): Promise<void> {
  for (const refUrl of refUrls) {
    await deleteResource(refUrl).catch(() => {});
  }
}

/** Cari resource Like milik aktor untuk satu observasi (untuk toggle unlike). */
export async function findMyLike(
  actorWebId: string,
  actorPaths: UserPodPaths,
  observationUrl: string,
): Promise<string | null> {
  const urls = await listLdp(actorPaths.activitiesLikes).catch(() => [] as string[]);
  for (const url of urls) {
    const doc = await readJson<Record<string, unknown>>(url);
    if (!doc) continue;
    const obj = String(doc["as:object"] ?? doc["object"] ?? "");
    const act = String(doc["as:actor"] ?? doc["actor"] ?? "");
    if (obj === observationUrl && act.split("#")[0] === actorWebId.split("#")[0]) {
      return url;
    }
  }
  return null;
}
