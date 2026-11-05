/**
 * Generator Turtle ACL WAC (Appendix A.1): owner full control + read untuk
 * acl:AuthenticatedAgent. Owner HARUS berupa WebID lengkap (dengan fragment
 * bila ada, mis. .../profile/card#me) karena pencocokan WAC eksak terhadap
 * URI — WebID tanpa fragment TIDAK match dan akan menghasilkan 403.
 *
 * @param {string} resource  URL resource/container yang di-ACL-kan
 * @param {string} owner     WebID lengkap pemilik
 * @param {boolean} [def]    sertakan juga authorization acl:default (untuk container)
 * @returns {string} dokumen turtle siap PUT ke <resource>.acl
 */
export function buildAclTurtle(resource, owner, def = false) {
  const parts = [
    `<#owner> a acl:Authorization;\n  acl:agent <${owner}>;\n  acl:accessTo <${resource}>;\n  acl:mode acl:Read, acl:Write, acl:Control.`,
  ];
  if (def)
    parts.push(
      `<#ownerDefault> a acl:Authorization;\n  acl:agent <${owner}>;\n  acl:default <${resource}>;\n  acl:mode acl:Read, acl:Write, acl:Control.`,
    );
  parts.push(
    `<#read> a acl:Authorization;\n  acl:agentClass acl:AuthenticatedAgent;\n  acl:accessTo <${resource}>;\n  acl:mode acl:Read.`,
  );
  if (def)
    parts.push(
      `<#readDefault> a acl:Authorization;\n  acl:agentClass acl:AuthenticatedAgent;\n  acl:default <${resource}>;\n  acl:mode acl:Read.`,
    );
  return `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n${parts.join("\n\n")}`;
}