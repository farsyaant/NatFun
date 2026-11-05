import { postJsonToContainer, putJson, readJson, listContainer, uuid, jsonLdContext, deleteResource } from "@/lib/ldp";
import type { UserPodPaths } from "@/lib/podInit";

export interface DirectMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  attachment?: string;
  published: string;
}

/** FR-DM-02: tulis ke inbox penerima + salinan ke sent pengirim. */
export async function sendMessage(
  senderWebId: string,
  recipientWebId: string,
  recipientStorage: string,
  content: string,
  attachmentUrl?: string,
  senderPaths?: UserPodPaths,
): Promise<void> {
  const body = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "@id": "#this",
    type: "Note",
    attributedTo: senderWebId,
    to: recipientWebId,
    content: content.slice(0, 1000),
    ...(attachmentUrl ? { attachment: attachmentUrl } : {}),
    published: new Date().toISOString(),
  };
  const inboxUrl = `${recipientStorage}natfun/inbox/`;
  await postJsonToContainer(inboxUrl, body);
  if (senderPaths) {
    await putJson(`${senderPaths.sent}${uuid()}.jsonld`, body);
  }
}

/** FR-DM-04: baca inbox; penerima memfilter mutual di level UI. */
export async function readInbox(myStorage: string): Promise<DirectMessage[]> {
  const inboxUrl = `${myStorage}natfun/inbox/`;
  const urls = await listContainer(inboxUrl).catch(() => [] as string[]);
  const out: DirectMessage[] = [];
  for (const url of urls) {
    const doc = await readJson<Record<string, unknown>>(url);
    if (!doc) continue;
    out.push({
      id: url,
      from: String(doc["as:attributedTo"] ?? doc["attributedTo"] ?? ""),
      to: String(doc["as:to"] ?? doc["to"] ?? ""),
      content: String(doc["as:content"] ?? doc["content"] ?? ""),
      attachment: doc["as:attachment"] as string | undefined,
      published: String(doc["as:published"] ?? doc["published"] ?? ""),
    });
  }
  out.sort((a, b) => a.published.localeCompare(b.published));
  return out;
}

/** FR-DM-05: hapus pesan di inbox sendiri. */
export async function deleteMessage(messageUrl: string): Promise<void> {
  await deleteResource(messageUrl);
}

/** Baca sent copy (untuk tampilan percakapan dua arah). */
export async function readSent(paths: UserPodPaths): Promise<DirectMessage[]> {
  const urls = await listContainer(paths.sent).catch(() => [] as string[]);
  const out: DirectMessage[] = [];
  for (const url of urls) {
    const doc = await readJson<Record<string, unknown>>(url);
    if (!doc) continue;
    out.push({
      id: url,
      from: String(doc["as:attributedTo"] ?? doc["attributedTo"] ?? ""),
      to: String(doc["as:to"] ?? doc["to"] ?? ""),
      content: String(doc["as:content"] ?? doc["content"] ?? ""),
      attachment: doc["as:attachment"] as string | undefined,
      published: String(doc["as:published"] ?? doc["published"] ?? ""),
    });
  }
  out.sort((a, b) => a.published.localeCompare(b.published));
  return out;
}

export { jsonLdContext };
