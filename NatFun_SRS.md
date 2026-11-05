# Software Requirements Specification (IEEE Std 830)

## NatFun (National Flora and Fauna): A Solid-Based Decentralized Web Application

| Field | Value |
|---|---|
| Document version | 1.0 (Prototype) |
| Date | 2026-11-04 |
| Authors | NatFun team (group of two) |
| Status | Draft for lecturer review |
| Companion document | `NatFun_PRD.md` |

### Revision History

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-11-04 | First complete draft for the prototype scope |

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements of **NatFun**, a web application that documents Indonesian flora and fauna through photographs, grouped by province, taxonomy and habitat. NatFun is built on **Solid (Social Linked Data)** so that user data lives in personal online data stores (Pods) owned by the users, and the application acts only as a *view* over those Pods.

The document is intended for the two developers, the course lecturer (reviewer) and any future contributor.

### 1.2 Scope

NatFun (the "System") shall:

- let authenticated users browse a curated catalog of Indonesian flora and fauna observations;
- let adult users (Parents) upload their own photos with metadata to **their own Pod**;
- filter uploaded content through client-side validation and **administrator approval** before it appears in the catalog;
- let Parents like, comment, follow, become mutuals and exchange direct messages (DM) pod-to-pod;
- let Children view content in a read-only mode, with accounts created through Parent-initiated WebID linking;
- demonstrably follow the decentralized web paradigm taught in the course: *end users become data owners, apps become views, interfaces become queries*.

The System shall **not** (in this prototype): provide quizzes, badges or other gamified learning, store precise coordinates, support more than one UI language, encrypt data at rest or end-to-end, verify the age of users, or run its own application server or database.

### 1.3 Definitions, Acronyms and Abbreviations

| Term | Definition |
|---|---|
| Solid | Social Linked Data: a set of specifications that let people store data in Pods and grant applications access to it. |
| Pod | Personal Online Data Store hosted on a Solid server. |
| WebID | A URL identifying a person or agent, dereferenceable to a profile document. |
| Solid-OIDC | The OpenID Connect profile used by Solid for authentication. |
| IdP | Identity Provider that authenticates the user and issues tokens for the WebID. |
| WAC / ACP | Web Access Control / Access Control Policy: the two Solid authorization mechanisms. |
| ACL | Access control list or rules attached to a resource or container. |
| LDP | Linked Data Platform: containers and resources model used by Solid servers. |
| RDF / JSON-LD | Resource Description Framework and its JSON serialization (see lecture slides 20-23). |
| Observation | One photo plus its metadata describing one flora or fauna entry. |
| Catalog | Index of approved observations, stored in the Official Pod. |
| Official Pod | The Pod owned by the Admin WebID, hosting the catalog and shared registries. |
| Official entry | An observation curated and published by the Admin. |
| Community entry | An observation uploaded by a Parent and approved by the Admin. |
| Interaction container | Container that collects references to likes and comments about one observation. |
| Parent | Adult regular user. |
| Child | User whose WebID has been linked and accepted by a Parent; read-only role. |
| Admin | The single administrator identified by one configured WebID. |
| IUCN | International Union for Conservation of Nature; conservation status categories EX, EW, CR, EN, VU, NT, LC, DD, NE. |
| EXIF | Metadata embedded in image files (may include GPS location). |
| SPA | Single-page application. |

### 1.4 References

1. Decentralized Web (lecture slides), Universitas Gadjah Mada, Dr. techn. Kabul Kurniawan.
2. Solid Project: https://solidproject.org/ and Solid specifications https://solidproject.org/TR/
3. Solid application showcase: https://solidproject.org/apps
4. IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.
5. W3C Activity Streams 2.0 (https://www.w3.org/TR/activitystreams-core/).
6. Darwin Core terms (https://dwc.tdwg.org/terms/) and schema.org.
7. IUCN Red List categories and criteria.

### 1.5 Overview

Section 2 describes the product context, users, constraints and assumptions. Section 3 lists specific, verifiable requirements, the logical data design and quality attributes. Appendices contain the Pod layout and access control table, key flows, the demonstration script that proves decentralization, a traceability matrix and known limitations.

---

## 2. Overall Description

### 2.1 Product Perspective

NatFun follows the three paradigms from the lecture:

| Paradigm (slides 15-18) | Realization in NatFun |
|---|---|
| End users become data owners | Photos, likes, comments, follow lists and messages are stored in the acting user's own Pod. |
| Apps become views | The NatFun SPA only renders data it reads from Pods; any other Solid app can read the same data. |
| Interfaces become queries | The SPA queries the catalog and several Pods directly using Solid HTTP/LDP; there is no NatFun backend API. |

**Logical architecture**

```
                    +--------------------------------------+
                    |  NatFun SPA (static hosting, no DB)  |
                    |  - Solid-OIDC login                  |
                    |  - Browse / filter / map             |
                    |  - Client-side image validation (ML) |
                    +-----+------------------+-------------+
                          | HTTPS / Solid    | HTTPS / Solid
        +-----------------v---+          +---v-------------------+
        | Official Pod (Admin)|          |  User Pods (Parents,  |
        | - catalog index     |          |  Children) on any     |
        | - official entries  |<-------->|  Solid server         |
        | - submissions       |  links   |  - observations/photos|
        | - decisions/reports |          |  - likes/comments     |
        | - child links       |          |  - following, inbox   |
        +---------------------+          +-----------------------+
                          ^
                          | OIDC
                   +------+------+
                   | Identity    |
                   | Providers   |
                   +-------------+
```

External systems: Solid servers hosting Pods, Identity Providers, static web host for the SPA and ML model files. NatFun owns **no** server-side state.

### 2.2 Product Functions (summary)

| ID | Function | Priority |
|---|---|---|
| F-01 | Solid login (WebID / OIDC) with choice of IdP | Must |
| F-02 | Roles (Child, Parent, Admin) and Parent-initiated child linking | Must |
| F-03 | Official catalog in the Official Pod with seed data | Must |
| F-04 | Browse by province, taxonomy and habitat; search, filter, province map | Must |
| F-05 | Photo upload by Parents to their own Pod with metadata and license | Must |
| F-06 | Pre-upload validation: inappropriate content and flora/fauna check | Must |
| F-07 | Admin moderation queue (approve, reject, unlist) | Must |
| F-08 | Like and comment (Parents only) | Must |
| F-09 | Follow and mutual | Must |
| F-10 | Direct message between mutuals, also used as "share" | Must |
| F-11 | Authenticated-only access control on all content | Must |
| F-12 | Decentralization verifiability (multi-provider, external pod browser) | Must |
| S-01 | Profile page | Should |
| S-02 | Report content button | Should |
| S-03 | Simple in-app notifications | Should |

### 2.3 User Classes and Characteristics

| User class | Description | Technical level |
|---|---|---|
| Visitor (unauthenticated) | Anyone who has not logged in. Sees only the landing and login page. | n/a |
| Child | Young learner. Own WebID/Pod linked by a Parent. Read-only. | Low |
| Parent | Adult user. Can upload, like, comment, follow, DM, link children. | Low to medium |
| Admin | Exactly one WebID configured in the application. Curates content. | Medium |

**Permission matrix**

| Capability | Visitor | Child | Parent | Admin |
|---|---|---|---|---|
| See landing / login page | Yes | Yes | Yes | Yes |
| Browse catalog, view details, likes and comments | No | Yes | Yes | Yes |
| Upload observation | No | No | Yes | Yes (official entries) |
| Like / comment | No | No | Yes | Yes |
| Follow / mutual / DM / share | No | No | Yes | No |
| Link a child | No | No | Yes | No |
| Approve / reject / unlist content | No | No | No | Yes |
| View report queue | No | No | No | Yes |

### 2.4 Operating Environment

- Latest two stable versions of Chrome, Firefox, Edge and Safari (desktop and mobile), responsive layout from 360 px width.
- Pods on any Solid-compliant server supporting Solid-OIDC and WAC or ACP.
- SPA served as static files over HTTPS.

### 2.5 Design and Implementation Constraints

- **C-01** The System shall use Solid (Solid-OIDC, LDP, WAC/ACP) for identity and data storage, as required by the course assignment.
- **C-02** Data conventions follow the lecture: JSON-LD/RDF documents and Activity Streams for Like and comment style activities.
- **C-03** No application backend or database. Only static hosting is allowed.
- **C-04** Machine-learning checks shall run in the browser.
- **C-05** The prototype is developed by two people in approximately two weeks.
- **C-06** Only province-level location and habitat may be stored; no coordinates.

### 2.6 Assumptions and Dependencies

- **A-01** Test users can obtain Pods from at least two different Solid providers (for example solidcommunity.net and a self-hosted Community Solid Server). Provider availability is outside the team's control and shall be checked at project start.
- **A-02** The lecture slides write the Activity Streams context as `http://www.w3.org/2006/activityStreams#`; this SRS uses the registered context `https://www.w3.org/ns/activitystreams`, which is semantically the same vocabulary.
- **A-03** A user without an accepted child link is treated as an adult (Parent). Age is not verified.
- **A-04** The Admin WebID is the owner of the Official Pod and is set in an application configuration file.
- **A-05** The `natfun:` vocabulary namespace is hosted as a static document of the SPA; its final URL replaces the placeholder `https://natfun.example/ns#` in this document.

### 2.7 Apportioning of Requirements (deferred)

Quizzes, badges and other educational games; encryption of data; precise coordinates; multi-language UI; push notifications; automatic text moderation; age verification; native mobile applications; global user search.

---

## 3. Specific Requirements

Priority: **M** = Must, **S** = Should. Requirement keywords follow RFC 2119 style ("shall" is mandatory).

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces

| Screen | Roles | Purpose |
|---|---|---|
| Landing / Login | All | Short description, IdP selection, login button. |
| Browse | Child, Parent, Admin | Catalog list, filters, search, province map. |
| Entry detail | Child, Parent, Admin | Photo, metadata, owner, license, likes, comments. |
| Upload | Parent, Admin | Form and validation feedback. |
| My submissions | Parent | Status of uploads (Pending, Approved, Rejected, Unlisted). |
| Following / Mutuals | Parent | Manage follows, open conversations. |
| Messages | Parent | Conversation view and composer. |
| Family | Parent, Child | Link a child, accept or decline a link request. |
| Admin queue | Admin | Pending submissions, reports, unlist action. |
| Profile (S) | Parent | Display name, approved entries, following count. |

UI language is a single language (English, assumed; configurable at build time). The UI shall be child-friendly in tone for the Child role (large images, no free-text inputs).

#### 3.1.2 Software Interfaces

| Interface | Use |
|---|---|
| Solid Protocol (HTTP, LDP, WAC/ACP) | Read and write resources and containers in Pods. |
| Solid-OIDC | Authentication of users at their IdP. |
| WebID profile documents | Display name and storage location discovery. |
| In-browser ML runtime | Execution of image classification models. |

#### 3.1.3 Hardware and Communications Interfaces

No special hardware. All communication uses HTTPS. DM delivery is by writing to the recipient's Pod (no WebRTC, no custom socket server).

### 3.2 Functional Requirements

#### 3.2.1 Authentication and Session (F-01)

| ID | Pri | Requirement |
|---|---|---|
| FR-AUTH-01 | M | The System shall authenticate users with Solid-OIDC using the IdP chosen by the user. |
| FR-AUTH-02 | M | The login screen shall offer a preset list of IdPs (at least solidcommunity.net) and a field to enter any IdP issuer URL. |
| FR-AUTH-03 | M | The System shall restore an existing session after a page reload where the authentication library supports it. |
| FR-AUTH-04 | M | The System shall provide a logout action that ends the local session. |
| FR-AUTH-05 | M | Unauthenticated visitors shall see only the landing and login screen; no catalog data, photos, likes or comments shall be requested or displayed. |
| FR-AUTH-06 | M | After login the System shall read the WebID profile to obtain the display name and the Pod storage root; if no name exists, the WebID shall be displayed. |
| FR-AUTH-07 | M | On the first login of a Parent the System shall, after explicit user confirmation, create the NatFun container structure in the user's Pod and apply the ACLs defined in Appendix A. |
| FR-AUTH-08 | M | If the Pod is not writable or its storage cannot be found, the System shall display an actionable error and disable write features. |

#### 3.2.2 Roles and Family Linking (F-02)

| ID | Pri | Requirement |
|---|---|---|
| FR-ROLE-01 | M | The System shall resolve the role of a logged-in user in this order: (1) WebID equals the configured Admin WebID: Admin; (2) an accepted child link exists for the WebID: Child; (3) otherwise Parent. |
| FR-ROLE-02 | M | A Parent shall be able to enter a child's WebID; the System shall validate the URL format and that the profile document can be fetched. |
| FR-ROLE-03 | M | A child link request shall be stored as a resource in the Official Pod container `child-links/` containing: link id, parent WebID, child WebID, creation time. |
| FR-ROLE-04 | M | When a user logs in and a pending link request targets their WebID, the System shall show the request (including the requesting parent's name) and offer Accept and Decline. |
| FR-ROLE-05 | M | Accepting shall write an acceptance record, referencing the link id, in the accepting user's own Pod. The Child role becomes effective only when both the link request and the acceptance record exist. |
| FR-ROLE-06 | M | The link shall be revocable by deleting the acceptance record (Pod owner) or by the Admin removing the link request. |
| FR-ROLE-07 | M | Restricted actions shall be hidden in the UI **and** refused by application logic for the Child role (see Limitation L-03 on enforcement). |
| FR-ROLE-08 | S | A Parent shall see the list of linked children with status Pending or Accepted. |

#### 3.2.3 Official Catalog (F-03)

| ID | Pri | Requirement |
|---|---|---|
| FR-CAT-01 | M | The Official Pod shall host official observations under `official/observations/` and the catalog index at `catalog/index.jsonld`. |
| FR-CAT-02 | M | Each catalog index entry shall contain: entry id, source (`official` or `community`), observation URL, owner WebID, local name, scientific name, kingdom, class, family, province, habitat, conservation status, thumbnail URL, approval time. |
| FR-CAT-03 | M | The System shall ship with 30 to 50 official entries covering at least 6 provinces, at least 4 habitat types and both kingdoms (Animalia and Plantae). |
| FR-CAT-04 | M | Every official photo shall have a documented license and source; photos without a verifiable license shall not be used. |
| FR-CAT-05 | M | Only the Admin shall have write permission to the catalog index and official observations; this shall be enforced by Pod ACL, not only by the UI. |
| FR-CAT-06 | M | The catalog index shall be the only source for listing content. Observations not in the index shall never be listed. |

#### 3.2.4 Browse, Search, Filter and Map (F-04)

| ID | Pri | Requirement |
|---|---|---|
| FR-BRW-01 | M | The Browse screen shall list entries with thumbnail, local name, scientific name, province and a conservation status badge. |
| FR-BRW-02 | M | The System shall provide combinable filters: province, kingdom, class, family, habitat, conservation status and source (official or community), with result count and a reset action. |
| FR-BRW-03 | M | The System shall provide text search over local name and scientific name (case-insensitive, substring). |
| FR-BRW-04 | M | The System shall display an interactive map of Indonesian provinces; selecting a province applies the province filter, and each province shall show its entry count. |
| FR-BRW-05 | M | The entry detail screen shall show: photo, local name, scientific name, taxonomy, province, habitat, conservation status, license, owner (name and link to profile), source type, like count and comments. |
| FR-BRW-06 | M | Filtering and search shall be executed in the client on the loaded catalog index. |
| FR-BRW-07 | M | Empty results and loading errors shall display clear messages. |
| FR-BRW-08 | M | Entries whose observation resource can no longer be fetched (deleted or permission revoked) shall be hidden from the list. |
| FR-BRW-09 | S | The list shall be sortable by name and by approval date. |

#### 3.2.5 Photo Upload (F-05)

| ID | Pri | Requirement |
|---|---|---|
| FR-UPL-01 | M | The upload form (Parent, Admin) shall require: one photo (JPEG, PNG or WebP, maximum 5 MB), local name, scientific name, province, kingdom, class, family, habitat, conservation status, license and an own-work declaration checkbox. |
| FR-UPL-02 | M | Province, habitat, conservation status and license shall be selected from controlled lists (Section 3.4.3). |
| FR-UPL-03 | M | One photo per observation. |
| FR-UPL-04 | M | The System shall strip EXIF and other embedded metadata from the photo before it is stored. |
| FR-UPL-05 | S | The System shall generate and store a thumbnail (about 480 px on the long edge). |
| FR-UPL-06 | M | The photo and the observation document shall be stored in the uploader's own Pod (Appendix A). |
| FR-UPL-07 | M | After a successful store the System shall create a submission record in the Official Pod `submissions/` container with status Pending. |
| FR-UPL-08 | M | The "My submissions" screen shall show each submission with status Pending, Approved, Rejected (with reason) or Unlisted. |
| FR-UPL-09 | M | A user shall be able to delete their own observation, which removes it from their Pod; the catalog entry becomes unavailable per FR-BRW-08. |
| FR-UPL-10 | M | Admin uploads create official entries directly (no moderation step) in the Official Pod and are added to the catalog index. |

#### 3.2.6 Content Validation (F-06)

| ID | Pri | Requirement |
|---|---|---|
| FR-VAL-01 | M | Before storing, the System shall run an inappropriate-content check in the browser; photos above the configured threshold shall be blocked with an explanatory message. |
| FR-VAL-02 | M | Before storing, the System shall run a flora/fauna check in the browser; photos not recognized as a plant or an animal shall be blocked with an explanatory message and the user may retry with another photo. |
| FR-VAL-03 | M | The photo shall not be sent to any third-party server for validation. |
| FR-VAL-04 | M | Thresholds shall be configurable without code changes to the validation logic. |
| FR-VAL-05 | M | The validation outcome (passed flag, model identifier and version, timestamp) shall be recorded in the observation metadata. |
| FR-VAL-06 | M | If a model fails to load, the System shall block the upload (fail closed) and show a retry option. |
| FR-VAL-07 | M | Passing validation shall not publish content; Admin approval is always required for community entries. |

#### 3.2.7 Moderation (F-07)

| ID | Pri | Requirement |
|---|---|---|
| FR-MOD-01 | M | The Admin queue shall list pending submissions with photo preview and all metadata. |
| FR-MOD-02 | M | Approve shall add the entry to the catalog index and write a decision record (status Approved) to `decisions/`. |
| FR-MOD-03 | M | Reject shall write a decision record with a reason from a fixed list or free text (maximum 200 characters). |
| FR-MOD-04 | M | Decision records shall be readable by authenticated users so the owner's application can display the status. |
| FR-MOD-05 | M | The Admin shall be able to unlist an approved entry, which removes it from the index and writes a decision record (status Unlisted). |
| FR-MOD-06 | M | Moderation actions shall be authorized by Pod-level write permission to the Official Pod. A non-Admin shall be unable to modify the catalog index by crafted requests. |
| FR-MOD-07 | S | The Admin queue shall also show reports (see FR-REP-01). |

#### 3.2.8 Likes and Comments (F-08)

| ID | Pri | Requirement |
|---|---|---|
| FR-INT-01 | M | A Parent shall be able to like an entry once and remove the like. |
| FR-INT-02 | M | A like shall be stored as an Activity Streams `Like` resource in the **actor's** Pod (Section 3.4.4). |
| FR-INT-03 | M | After writing the like, the System shall append a small reference resource to the entry's **interaction container** (in the owner's Pod, or the Official Pod for official entries) pointing to the actor's resource. |
| FR-INT-04 | M | A Parent shall be able to post a plain-text comment (maximum 500 characters) and delete their own comment. A comment shall be stored as an Activity Streams `Note` (with `inReplyTo`) in the actor's Pod, with a reference in the interaction container. |
| FR-INT-05 | M | To display counts and comments, the System shall list the interaction container and verify each reference by fetching the referenced resource; the reference counts only if the resource exists, lies in the storage of the stated actor, and its `actor` equals that WebID. Deleted likes and comments therefore disappear from counts without needing delete rights on the container. |
| FR-INT-06 | M | The owner of an entry (the Admin for official entries) shall be able to remove references from the entry's interaction container to hide unwanted comments. |
| FR-INT-07 | M | Children shall see like counts and comments but shall not be offered or permitted to like or comment. |
| FR-INT-08 | M | Comment text shall be rendered as escaped plain text (no HTML or script execution). |

#### 3.2.9 Follow and Mutual (F-09)

| ID | Pri | Requirement |
|---|---|---|
| FR-SOC-01 | M | A Parent shall be able to follow and unfollow another Parent, discoverable through catalog entry owners and profile pages. |
| FR-SOC-02 | M | The follow list shall be stored in the follower's Pod at `social/following.jsonld` (list of WebIDs with timestamps). |
| FR-SOC-03 | M | Two Parents are **mutual** when each appears in the other's follow list. The System shall compute this at display time by reading both lists and shall not store the mutual relation. |
| FR-SOC-04 | M | Follow targets shall be restricted to users resolved as Parent; Children shall not follow and shall not be followable. |
| FR-SOC-05 | M | The Following screen shall list followed users and mark which ones are mutual. |

#### 3.2.10 Direct Message and Share (F-10)

| ID | Pri | Requirement |
|---|---|---|
| FR-DM-01 | M | Mutual Parents shall be able to exchange text messages (maximum 1000 characters). |
| FR-DM-02 | M | Sending a message shall write a message resource to the recipient's `inbox/` container and a copy to the sender's `messages/sent/` container. |
| FR-DM-03 | M | **Share** shall be a DM containing a link to a catalog entry and optional text. |
| FR-DM-04 | M | The recipient's application shall display only messages whose sender is currently mutual with the recipient and shall ignore all other inbox items. |
| FR-DM-05 | M | The recipient shall be able to delete messages in their own inbox. |
| FR-DM-06 | M | Sending to a non-mutual user or to a Child shall be blocked by the application. |
| FR-DM-07 | M | The Messages screen shall refresh by polling at an interval of at least 10 seconds. Push delivery is out of scope. |
| FR-DM-08 | M | Messages are not end-to-end encrypted; this shall be disclosed to users in the Messages screen. |

#### 3.2.11 Access Control (F-11)

| ID | Pri | Requirement |
|---|---|---|
| FR-ACL-01 | M | No NatFun resource shall be readable by unauthenticated agents. Read access shall be granted to authenticated agents, to named agents, or to the owner only, as specified in Appendix A. |
| FR-ACL-02 | M | The owner's application shall apply the Appendix A ACLs on first login (FR-AUTH-07) using the access-control mechanism (WAC or ACP) supported by the user's server. |
| FR-ACL-03 | M | If the server supports neither mechanism, the System shall show a message and disable write features. |
| FR-ACL-04 | M | The inbox and interaction containers shall allow Append for authenticated agents and shall not allow them to read inbox contents. |

#### 3.2.12 Decentralization Verifiability (F-12)

| ID | Pri | Requirement |
|---|---|---|
| FR-DEC-01 | M | All user-generated data (photos, observations, likes, comments, follow lists, messages) shall be stored only in the Pod of the user who created it. The application host shall store no user data. |
| FR-DEC-02 | M | The System shall operate with users whose Pods are on at least two different Solid servers or providers at the same time. |
| FR-DEC-03 | M | All NatFun data shall be stored in standard formats (JSON-LD with common vocabularies, standard image formats) so that generic Solid browsers can display it, subject to permissions. |
| FR-DEC-04 | M | Revoking a permission or deleting a resource in a Pod shall make the content disappear from NatFun without any change to the application. |
| FR-DEC-05 | M | The data schemas shall be documented (this SRS, Section 3.4) so that another application can read and write the same data. |
| FR-DEC-06 | M | The SPA shall be deployable as static files with no server-side state. |

#### 3.2.13 Should-Have Functions

| ID | Pri | Requirement |
|---|---|---|
| FR-PRO-01 | S | The profile page shall show display name, number of approved entries, the entries themselves and the number of followed users. |
| FR-REP-01 | S | A Parent shall be able to report an entry with a reason; the report shall be appended to the Official Pod `reports/` container (readable by the Admin only). |
| FR-NTF-01 | S | The System shall show in-app notifications (polling) for: new message, comment or like on own entries, new follower, submission decision. |

### 3.3 Performance Requirements

The prototype targets a demonstration scale; the following are targets, not guarantees.

| ID | Requirement |
|---|---|
| PR-01 | With 200 catalog entries, the Browse screen shall display the first results within 3 seconds on a 4 Mbps connection. |
| PR-02 | Applying a filter or search term shall update results within 500 ms (client-side). |
| PR-03 | Thumbnails and photos shall load lazily. |
| PR-04 | Client-side validation of a photo shall complete within 10 seconds on a mid-range laptop. |
| PR-05 | Displaying like and comment data for one entry shall issue at most one container listing plus one verification fetch per displayed reference; results shall be cached for the session. |

### 3.4 Logical Data Requirements

#### 3.4.1 Container layout

See Appendix A for the full tree and ACL table.

#### 3.4.2 Vocabularies

| Prefix | Namespace | Used for |
|---|---|---|
| `as` | `https://www.w3.org/ns/activitystreams#` | Like, Note, Follow, message activities |
| `schema` | `https://schema.org/` | Photograph, image, thumbnail |
| `dwc` | `http://rs.tdwg.org/dwc/terms/` | Scientific name, vernacular name, kingdom, class, family |
| `dcterms` | `http://purl.org/dc/terms/` | License, creator, created |
| `vcard` / `foaf` | W3C | Profile names (read only) |
| `natfun` | `https://natfun.example/ns#` (placeholder) | Province, habitat, conservation status, validation, review status |

#### 3.4.3 Controlled vocabularies

- **Province**: the official list of Indonesian provinces, maintained in a configuration file.
- **Habitat** (initial, extendable by configuration): Tropical Rainforest, Montane Forest, Mangrove, Coral Reef and Marine, Savanna, Wetland and Freshwater, Coastal and Beach.
- **Conservation status**: EX, EW, CR, EN, VU, NT, LC, DD, NE.
- **License**: CC BY 4.0 (default), CC BY-NC 4.0, CC0 1.0.
- **Kingdom**: Animalia, Plantae. Class and family are free text, normalized (trimmed, capitalized) and offered as filter facets from the values present in the catalog.

#### 3.4.4 Resource schemas (illustrative values)

**Observation** (`/natfun/observations/{id}.jsonld`)

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "dwc": "http://rs.tdwg.org/dwc/terms/",
    "dcterms": "http://purl.org/dc/terms/",
    "natfun": "https://natfun.example/ns#"
  },
  "@id": "#this",
  "@type": ["schema:Photograph", "natfun:Observation"],
  "dwc:vernacularName": "Orangutan Kalimantan",
  "dwc:scientificName": "Pongo pygmaeus",
  "dwc:kingdom": "Animalia",
  "dwc:class": "Mammalia",
  "dwc:family": "Hominidae",
  "natfun:province": "Kalimantan Tengah",
  "natfun:habitat": "Tropical Rainforest",
  "natfun:conservationStatus": "CR",
  "schema:image": "../photos/3f2a.jpg",
  "schema:thumbnailUrl": "../photos/3f2a_thumb.jpg",
  "dcterms:license": "https://creativecommons.org/licenses/by/4.0/",
  "dcterms:creator": { "@id": "https://alice.example/profile/card#me" },
  "dcterms:created": "2026-11-05T08:00:00Z",
  "natfun:validation": {
    "natfun:passed": true,
    "natfun:modelId": "nsfw-v1,floafauna-v1",
    "dcterms:created": "2026-11-05T08:00:00Z"
  }
}
```

**Like** (`/natfun/activities/likes/{uuid}.jsonld`, same shape as lecture slide 25)

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Like",
  "actor": "https://alice.example/profile/card#me",
  "object": "https://bob.example/natfun/observations/3f2a.jsonld#this",
  "published": "2026-11-06T08:00:00Z"
}
```

**Comment** (`/natfun/activities/comments/{uuid}.jsonld`)

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Note",
  "attributedTo": "https://alice.example/profile/card#me",
  "inReplyTo": "https://bob.example/natfun/observations/3f2a.jsonld#this",
  "content": "Such a beautiful photo!",
  "published": "2026-11-06T08:05:00Z"
}
```

**Interaction reference** (`/natfun/interactions/{observationId}/{uuid}.jsonld`, in the entry owner's Pod)

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams", { "natfun": "https://natfun.example/ns#" }],
  "type": "natfun:InteractionRef",
  "natfun:kind": "Like",
  "actor": "https://alice.example/profile/card#me",
  "natfun:resource": "https://alice.example/natfun/activities/likes/9d1c.jsonld",
  "published": "2026-11-06T08:00:00Z"
}
```

**Follow list** (`/natfun/social/following.jsonld`)

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Collection",
  "actor": "https://alice.example/profile/card#me",
  "items": [
    { "type": "Follow", "object": "https://bob.example/profile/card#me", "published": "2026-11-06T09:00:00Z" }
  ]
}
```

**Message** (written to the recipient's `/natfun/inbox/{uuid}.jsonld`)

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Note",
  "attributedTo": "https://alice.example/profile/card#me",
  "to": "https://bob.example/profile/card#me",
  "content": "Look at this one!",
  "attachment": "https://official.natfun.example/natfun/official/observations/e12.jsonld#this",
  "published": "2026-11-06T09:10:00Z"
}
```

**Submission, decision, report, child link, child acceptance**

| Resource | Location | Key fields |
|---|---|---|
| Submission | Official Pod `submissions/{uuid}.jsonld` | observation URL, owner WebID, submitted time |
| Decision | Official Pod `decisions/{submissionId}.jsonld` | status (Approved, Rejected, Unlisted), reason, decided time |
| Report | Official Pod `reports/{uuid}.jsonld` | entry id, reporter WebID, reason, time |
| Child link | Official Pod `child-links/{linkId}.jsonld` | link id, parent WebID, child WebID, created time |
| Child acceptance | Child's Pod `natfun/family/acceptances/{linkId}.jsonld` | link id, accepted time |

### 3.5 Design Constraints

See Section 2.5. In addition, the recommended implementation stack (non-binding) is a React + TypeScript SPA, the Inrupt `solid-client` and `solid-client-authn-browser` libraries and an in-browser ML runtime (for example TensorFlow.js), deployed on static hosting.

### 3.6 Software System Attributes

| Attribute | Requirement |
|---|---|
| Security | HTTPS only. Authentication tokens handled by the Solid authentication library (no custom token storage). All user text rendered escaped. A content security policy shall restrict script sources. No third-party analytics. No secrets in the client bundle. Admin authority is derived from Pod write permissions, not from UI checks. |
| Privacy | No coordinates stored; EXIF stripped; photos not sent to third parties; Children have no free-text input; no tracking. |
| Reliability | Failure of one user's Pod shall only affect that user's content; the rest of the catalog remains usable (FR-BRW-08). |
| Availability | Depends on the SPA host, the Official Pod server and user Pod servers; no further target for the prototype. |
| Maintainability | Solid access in a single data-access module; configuration (Admin WebID, provinces, habitats, thresholds, IdP list) in one config file. |
| Portability | Any Solid-compliant server (WAC or ACP); modern browsers. |
| Usability | A new Parent shall be able to log in and upload a photo in under 5 minutes without instructions. Children use browse-only screens. |
| Interoperability | Data readable by generic Solid browsers (PodOS Browser, SolidOS Databrowser and similar) when permissions allow. |

### 3.7 Other Requirements

- **Legal and licensing**: every photo carries a license; uploaders declare ownership; official photos must have verified licenses.
- **Children's data**: Children's accounts hold minimal data (link acceptance only). Parents are responsible for creating and controlling the child's Pod and WebID.

---

## Appendix A. Pod Layout and Access Control

### A.1 Official Pod (owner: Admin)

| Path under `/natfun/` | Contents | Read | Append | Write / Control |
|---|---|---|---|---|
| `catalog/index.jsonld` | Approved entry index | Authenticated | - | Admin |
| `official/observations/` and `official/photos/` | Official entries | Authenticated | - | Admin |
| `interactions/{entryId}/` | References for official entries | Authenticated | Authenticated | Admin |
| `submissions/` | Pending submissions | Admin | Authenticated | Admin |
| `decisions/` | Moderation decisions | Authenticated | - | Admin |
| `reports/` | Reports (S) | Admin | Authenticated | Admin |
| `child-links/` | Child link requests | Authenticated | Authenticated | Admin |

### A.2 User Pod (owner: the user)

| Path under `/natfun/` | Contents | Read | Append | Write / Control |
|---|---|---|---|---|
| `observations/`, `photos/` | Own observations and photos | Authenticated | - | Owner |
| `interactions/{observationId}/` | Like and comment references for own entries | Authenticated | Authenticated | Owner |
| `activities/likes/`, `activities/comments/` | Own likes and comments | Authenticated | - | Owner |
| `social/following.jsonld` | Follow list | Authenticated | - | Owner |
| `inbox/` | Incoming messages and notifications | Owner | Authenticated | Owner |
| `messages/sent/` | Copies of sent messages | Owner | - | Owner |
| `family/acceptances/` | Child acceptance records | Authenticated | - | Owner |

"Authenticated" means any logged-in Solid user (authenticated agents), never the public.

## Appendix B. Key Flows

**B.1 Upload and approval**

1. Parent selects photo and fills the form.
2. SPA strips EXIF, runs content and flora/fauna checks; blocks on failure.
3. SPA writes photo, thumbnail and observation to the Parent's Pod.
4. SPA appends a submission to the Official Pod; status shown as Pending.
5. Admin opens the queue, reviews and approves: Admin's SPA adds the entry to `catalog/index.jsonld` and writes the decision.
6. The Parent's SPA reads the decision and shows Approved; the entry appears in Browse for all authenticated users.

**B.2 Like**

1. Parent clicks Like on an entry owned by another user.
2. SPA writes the Like resource to the Parent's own Pod.
3. SPA appends an interaction reference to the entry owner's interaction container.
4. Any viewer's SPA lists the container, verifies each reference and displays the count.
5. Unlike deletes the Like resource; the reference then fails verification and no longer counts.

**B.3 Mutual and DM**

1. Alice follows Bob (written in Alice's Pod); Bob follows Alice (written in Bob's Pod).
2. Both SPAs compute "mutual" by reading both follow lists.
3. Alice sends a message: written to Bob's `inbox/` and to Alice's `messages/sent/`.
4. Bob's SPA polls the inbox and shows only messages from current mutuals.

**B.4 Child linking**

1. Parent enters the child's WebID; SPA appends a link request to the Official Pod.
2. The child logs in, sees the request, accepts; an acceptance record is written to the child's Pod.
3. From the next login the child's role resolves to Child (read-only).

## Appendix C. Demonstration and Acceptance Script (proof of decentralization)

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in as Alice (Pod on provider X) and Bob (Pod on provider Y). | Both succeed; both see the catalog. |
| 2 | Alice uploads a photo; Admin approves. | Entry appears in Browse for Bob. |
| 3 | Open Alice's Pod with a generic Pod browser (for example PodOS Browser or SolidOS Databrowser). | Photo, observation, likes and comments are visible as standard files. |
| 4 | Bob likes and comments; Alice and Bob follow each other; Bob sends a DM. | Data appears in Bob's Pod (like, comment, follow list) and Alice's inbox and interaction container. |
| 5 | Alice revokes read access on the observation or deletes it. | The entry disappears from Browse and detail views without any app change (FR-DEC-04). |
| 6 | Log in as a linked Child. | Browse works; no upload, like, comment, follow or DM controls. |
| 7 | Log in as an unauthenticated visitor. | Only the landing and login page is visible. |
| 8 | Inspect the SPA host. | Only static files; no user data stored. |

## Appendix D. Traceability Matrix

| Feature | Requirements |
|---|---|
| F-01 | FR-AUTH-01 to 08 |
| F-02 | FR-ROLE-01 to 08 |
| F-03 | FR-CAT-01 to 06 |
| F-04 | FR-BRW-01 to 09 |
| F-05 | FR-UPL-01 to 10 |
| F-06 | FR-VAL-01 to 07 |
| F-07 | FR-MOD-01 to 07 |
| F-08 | FR-INT-01 to 08 |
| F-09 | FR-SOC-01 to 05 |
| F-10 | FR-DM-01 to 08 |
| F-11 | FR-ACL-01 to 04 |
| F-12 | FR-DEC-01 to 06 |
| S-01, S-02, S-03 | FR-PRO-01, FR-REP-01, FR-NTF-01 |

## Appendix E. Known Limitations and Open Issues

| ID | Limitation or risk | Mitigation or decision |
|---|---|---|
| L-01 | Solid has no global search across Pods. | Discovery goes through the catalog index in the Official Pod. Followers of a user cannot be enumerated; only the follower's own follow list and mutual checks are available. |
| L-02 | Unapproved observations are readable by any authenticated user who knows the (unguessable) URL. Moderation controls **discoverability** (catalog), not access. | Accepted for the prototype; document in the report. |
| L-03 | Child restrictions are enforced by the application and catalog, not by the Solid server; a technically skilled user could write to their own Pod directly. Such data would still not appear in the catalog or be counted in any other user's view unless referenced. | Accepted; Children's content cannot enter the catalog. |
| L-04 | Age is not verified; a Child may skip the acceptance step. | Accepted; Parent responsibility. |
| L-05 | The inbox accepts Append from any authenticated user, so spam is possible. | Receiver-side filtering to mutuals only (FR-DM-04). |
| L-06 | Interaction references cannot be deleted by the actor (Append only). | Lazy verification (FR-INT-05). |
| L-07 | Client-side ML models can be wrong or bypassed. | Admin approval is mandatory (FR-VAL-07). |
| L-08 | Comment text is not automatically moderated. | Entry owner and Admin can hide comments (FR-INT-06); reports (S). |
| L-09 | Messages are not encrypted. | Disclosed to users (FR-DM-08). |
| L-10 | Dependence on third-party Solid providers' availability and feature support (WAC or ACP, Solid-OIDC). | Check providers at project start; keep a self-hosted server as fallback. |
| O-01 | Final URL of the `natfun:` namespace and the SPA host. | Decide at deployment. |
| O-02 | Exact ML models and thresholds for validation. | Select and test during implementation week 1 to 2. |
