import { appConfig } from "@/config/appConfig";

export const ns = {
  as: "https://www.w3.org/ns/activitystreams#",
  schema: "https://schema.org/",
  dwc: "http://rs.tdwg.org/dwc/terms/",
  dcterms: "http://purl.org/dc/terms/",
  natfun: appConfig.natfunNs,
  ldp: "http://www.w3.org/ns/ldp#",
  acl: "http://www.w3.org/ns/auth/acl#",
  foaf: "http://xmlns.com/foaf/0.1/",
  vcard: "http://www.w3.org/2006/vcard/ns#",
  pim: "http://www.w3.org/ns/pim/space#",
} as const;

// Predikat yang dipakai di dokumen JSON-LD (string penuh agar konsisten)
export const pred = {
  // dwc
  vernacularName: `${ns.dwc}vernacularName`,
  scientificName: `${ns.dwc}scientificName`,
  kingdom: `${ns.dwc}kingdom`,
  taxonClass: `${ns.dwc}class`,
  family: `${ns.dwc}family`,
  // schema
  image: `${ns.schema}image`,
  thumbnailUrl: `${ns.schema}thumbnailUrl`,
  // dcterms
  license: `${ns.dcterms}license`,
  creator: `${ns.dcterms}creator`,
  created: `${ns.dcterms}created`,
  // natfun
  province: `${ns.natfun}province`,
  habitat: `${ns.natfun}habitat`,
  conservationStatus: `${ns.natfun}conservationStatus`,
  validation: `${ns.natfun}validation`,
  validationPassed: `${ns.natfun}passed`,
  validationModel: `${ns.natfun}modelId`,
  kind: `${ns.natfun}kind`,
  resource: `${ns.natfun}resource`,
  // as
  actor: `${ns.as}actor`,
  object: `${ns.as}object`,
  items: `${ns.as}items`,
  content: `${ns.as}content`,
  attributedTo: `${ns.as}attributedTo`,
  to: `${ns.as}to`,
  attachment: `${ns.as}attachment`,
  published: `${ns.as}published`,
  type: "@type",
  id: "@id",
  context: "@context",
} as const;

export const types = {
  observation: [`${ns.schema}Photograph`, `${ns.natfun}Observation`],
  like: "Like",
  note: "Note",
  follow: "Follow",
  collection: "Collection",
  interactionRef: `${ns.natfun}InteractionRef`,
} as const;

export const statusEnum = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  unlisted: "Unlisted",
} as const;

export type ReviewStatus = (typeof statusEnum)[keyof typeof statusEnum];

// Struktur katalog (FR-CAT-02)
export interface CatalogEntry {
  id: string;
  source: "official" | "community";
  observationUrl: string;
  ownerWebId: string;
  localName: string;
  scientificName: string;
  kingdom: string;
  taxonClass: string;
  family: string;
  province: string;
  habitat: string;
  conservationStatus: string;
  thumbnailUrl: string;
  approvedAt: string;
}

export interface CatalogIndex {
  "@context": Record<string, string>;
  "@type": "Collection";
  items: CatalogEntry[];
}
