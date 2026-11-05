import { fetch } from "@/lib/auth";

/**
 * Helper WAC (Appendix A). Menulis resource .acl secara langsung dengan
 * acl:AuthenticatedAgent, karena universalAccess solid-client belum mengekspos
 * "authenticated agents only". Untuk server ACP-only, kupanggil fallback
 * universalAccess di pemanggil; jika gagal keduanya → FR-ACL-03.
 */

export interface AclSpec {
  read?: "auth" | "owner" | false;
  append?: "auth" | false;
  writeOwner?: boolean; // owner full control (write+control)
  defaultForNew?: boolean; // untuk container
}

function aclUrlFor(resourceUrl: string): string {
  return resourceUrl.endsWith("/") ? `${resourceUrl}.acl` : `${resourceUrl}.acl`;
}

function turtle(webId: string, spec: AclSpec, resource: string): string {
  const auth = "acl:agentClass acl:AuthenticatedAgent";
  const parts: string[] = [];

  if (spec.writeOwner) {
    parts.push(
      `<#owner> a acl:Authorization;\n  acl:agent <${webId}>;\n  acl:accessTo <${resource}>;\n  acl:mode acl:Read, acl:Write, acl:Control.`,
    );
    if (spec.defaultForNew) {
      parts.push(
        `<#ownerDefault> a acl:Authorization;\n  acl:agent <${webId}>;\n  acl:default <${resource}>;\n  acl:mode acl:Read, acl:Write, acl:Control.`,
      );
    }
  }

  if (spec.read === "auth") {
    parts.push(
      `<#read> a acl:Authorization;\n  ${auth};\n  acl:accessTo <${resource}>;\n  acl:mode acl:Read.`,
    );
    if (spec.defaultForNew) {
      parts.push(
        `<#readDefault> a acl:Authorization;\n  ${auth};\n  acl:default <${resource}>;\n  acl:mode acl:Read.`,
      );
    }
  }

  if (spec.append === "auth") {
    parts.push(
      `<#append> a acl:Authorization;\n  ${auth};\n  acl:accessTo <${resource}>;\n  acl:mode acl:Append.`,
    );
    if (spec.defaultForNew) {
      parts.push(
        `<#appendDefault> a acl:Authorization;\n  ${auth};\n  acl:default <${resource}>;\n  acl:mode acl:Append.`,
      );
    }
  }

  return `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n${parts.join("\n\n")}`;
}

/** Pasang ACL pada satu resource (membuat/menimpa .acl). */
export async function applyAcl(
  resourceUrl: string,
  spec: AclSpec,
  ownerWebId: string,
): Promise<void> {
  const url = aclUrlFor(resourceUrl);
  const body = turtle(ownerWebId, spec, resourceUrl);
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body,
  });
  if (!res.ok) throw new Error(`Gagal memasang ACL ${url}: ${res.status}`);
}

/** Pastikan container ada (PUT pada container path). */
export async function ensureContainer(containerUrl: string): Promise<void> {
  const res = await fetch(containerUrl, { method: "GET" });
  if (res.ok) return;
  const put = await fetch(containerUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: "",
  });
  if (!put.ok && put.status !== 409) {
    throw new Error(
      `Gagal membuat container ${containerUrl}: HTTP ${put.status}` +
        (put.status === 403
          ? " — pastikan Anda login sebagai PEMILIK Pod ini dan cek ACL-nya di SolidOS."
          : ""),
    );
  }
}
