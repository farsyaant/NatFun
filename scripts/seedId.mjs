import { createHash } from "node:crypto";

/** ID deterministik dari nama lokal (B4): re-seed menimpa resource yang sama
 *  (idempoten) alih-alih membuat entri duplikat. */
export function seedIdOf(localName) {
  return createHash("sha1").update(localName).digest("hex").slice(0, 8);
}