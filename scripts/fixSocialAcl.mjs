#!/usr/bin/env node
/**
 * Migrasi one-off (SOC-03): pasang ACL `read: auth` pada container
 * `natfun/social/` di Pod yang sudah ada (sebelumnya tanpa ACL → owner-only
 * → mutual tidak bisa dihitung lintas Pod).
 * Usage: source .env.seed && node scripts/fixSocialAcl.mjs <tokenA> <secretA> <tokenB> <secretB>
 * (idp dari SEED_IDP di .env.seed; credentials diteruskan sebagai argumen, bukan disimpan)
 */
import { Session } from "@inrupt/solid-client-authn-node";
import { buildAclTurtle } from "./aclTurtle.mjs";
import { fetchWithRetry } from "./retry.mjs";

const idp = process.env.SEED_IDP ?? "https://solidcommunity.net/";
const [aId, aSec, bId, bSec] = process.argv.slice(2);

async function fixPod(clientId, clientSecret) {
  const s = new Session();
  await s.login({ oidcIssuer: idp, clientId, clientSecret });
  const webId = s.info.webId;
  const f = (url, init) => fetchWithRetry(url, init, { fetchImpl: s.fetch.bind(s), maxAttempts: 5 });
  const social = `https://${webId.split("//")[1].split(".")[0]}.solidcommunity.net/natfun/social/`;
  const res = await f(`${social}.acl`, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: buildAclTurtle(social, webId, true),
  });
  console.log(`${webId}: ACL social/ → ${res.status}`);
  await s.logout();
  return res.ok;
}

const okA = await fixPod(aId, aSec);
const okB = await fixPod(bId, bSec);
if (!okA || !okB) process.exit(1);