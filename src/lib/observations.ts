import { appConfig } from "@/config/appConfig";
import { stripExif, makeThumbnail, validatePhotoFile } from "@/lib/image";
import { putJson, postJsonToContainer, deleteResource, uuid, jsonLdContext } from "@/lib/ldp";
import { fetch } from "@/lib/auth";
import type { UserPodPaths } from "@/lib/podInit";
import type { CatalogEntry } from "@/lib/vocab";


export interface ObservationInput {
  localName: string;
  scientificName: string;
  province: string;
  kingdom: string;
  taxonClass: string;
  family: string;
  habitat: string;
  conservationStatus: string;
  licenseUrl: string;
}

export interface UploadResult {
  observationUrl: string;
  photoUrl: string;
  thumbUrl: string;
}



/**
 * Prototipe: FR-VAL hanya validasi file basic (ukuran/format) + EXIF strip.
 * ML nsfw/floafauna dilewati; validation record tetap ditulis (stub).
 */
export async function uploadObservation(
  file: File,
  input: ObservationInput,
  webId: string,
  paths: UserPodPaths,
): Promise<UploadResult> {
  validatePhotoFile(file, appConfig.maxPhotoBytes, appConfig.allowedPhotoTypes);

  const cleaned = await stripExif(file);
  const id = uuid();
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const photoUrl = `${paths.photos}${id}.${ext}`;
  const thumbUrl = `${paths.photos}${id}_thumb.jpg`;

  const photoRes = await fetch(photoUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: cleaned,
  });
  if (!photoRes.ok) throw new Error(`Gagal menyimpan foto: ${photoRes.status}`);

  const thumb = await makeThumbnail(cleaned, appConfig.thumbLongEdge);
  const thumbRes = await fetch(thumbUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: thumb,
  });
  if (!thumbRes.ok) throw new Error(`Gagal menyimpan thumbnail: ${thumbRes.status}`);

  const now = new Date().toISOString();
  const observation = {
    "@context": jsonLdContext(),
    "@id": "#this",
    "@type": ["schema:Photograph", "natfun:Observation"],
    "dwc:vernacularName": input.localName,
    "dwc:scientificName": input.scientificName,
    "dwc:kingdom": input.kingdom,
    "dwc:class": input.taxonClass,
    "dwc:family": input.family,
    "natfun:province": input.province,
    "natfun:habitat": input.habitat,
    "natfun:conservationStatus": input.conservationStatus,
    "schema:image": `../photos/${id}.${ext}`,
    "schema:thumbnailUrl": `../photos/${id}_thumb.jpg`,
    "dcterms:license": input.licenseUrl,
    "dcterms:creator": { "@id": webId },
    "dcterms:created": now,
    "natfun:validation": {
      "natfun:passed": appConfig.validationStub.passed,
      "natfun:modelId": appConfig.validationStub.modelId,
      "dcterms:created": now,
    },
  };

  const observationUrl = `${paths.observations}${id}.jsonld`;
  await putJson(observationUrl, observation);
  // C2: container interaksi per-observasi dibuat sekarang oleh PEMILIK, agar
  // komentar/like dari orang lain (yang hanya punya append) tidak gagal 403.
  const { ensureInteractionContainer } = await import("@/lib/interactions");
  await ensureInteractionContainer(paths, observationUrl).catch((e) => {
    console.warn("[NatFun] Container interaksi belum bisa dibuat (bisa dibuat ulang pemilik):", e);
  });
  return { observationUrl, photoUrl, thumbUrl };
}

/** FR-UPL-07: kirim submission ke Official Pod (Parent → moderasi). */
export async function submitForReview(
  officialRoot: string,
  observationUrl: string,
  webId: string,
): Promise<string> {
  return postJsonToContainer(`${officialRoot}submissions/`, {
    "@context": jsonLdContext(),
    "@type": "natfun:Submission",
    "natfun:observationUrl": observationUrl,
    "natfun:ownerWebId": webId,
    "dcterms:created": new Date().toISOString(),
  });
}

/** FR-UPL-09: hapus observasi sendiri (foto + dokumen).
 *  D9: observasi yang sudah hilang / tak terbaca tidak menggagalkan DELETE. */
export async function deleteOwnObservation(
  observationUrl: string,
): Promise<void> {
  let obs: Record<string, unknown> | null = null;
  try {
    const r = await fetch(observationUrl);
    obs = r.ok ? ((await r.json()) as Record<string, unknown>) : null;
  } catch {
    obs = null; // tidak terbaca → tetap coba hapus dokumennya
  }
  await deleteResource(observationUrl);
  const img = obs?.["schema:image"];
  const thumb = obs?.["schema:thumbnailUrl"];
  if (typeof img === "string") {
    await deleteResource(new URL(img, observationUrl).toString()).catch(() => {});
  }
  if (typeof thumb === "string") {
    await deleteResource(new URL(thumb, observationUrl).toString()).catch(() => {});
  }
}

export function toCatalogEntry(
  obs: Record<string, unknown>,
  observationUrl: string,
  ownerWebId: string,
  source: "official" | "community",
): CatalogEntry {
  const arr = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  return {
    id: observationUrl.split("/").pop()?.replace(".jsonld", "") ?? uuid(),
    source,
    observationUrl,
    ownerWebId,
    localName: String(arr(obs["dwc:vernacularName"]) ?? ""),
    scientificName: String(arr(obs["dwc:scientificName"]) ?? ""),
    kingdom: String(arr(obs["dwc:kingdom"]) ?? ""),
    taxonClass: String(arr(obs["dwc:class"]) ?? ""),
    family: String(arr(obs["dwc:family"]) ?? ""),
    province: String(arr(obs["natfun:province"]) ?? ""),
    habitat: String(arr(obs["natfun:habitat"]) ?? ""),
    conservationStatus: String(arr(obs["natfun:conservationStatus"]) ?? ""),
    thumbnailUrl: new URL(String(obs["schema:thumbnailUrl"] ?? ""), observationUrl).toString(),
    approvedAt: new Date().toISOString(),
  };
}
