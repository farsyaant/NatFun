# Product Requirements Document (PRD)

## NatFun (National Flora and Fauna): A Solid-Based Decentralized Web Application

| Field | Value |
|---|---|
| Version | 1.0 (Prototype) |
| Date | 2026-11-04 |
| Team | Group of two developers |
| Status | Draft for lecturer review |
| Companion document | `NatFun_SRS.md` (IEEE 830) |

---

## 1. Overview

**NatFun** is a web application that showcases the exotic flora and fauna of Indonesia through photographs organized by **province**, **taxonomy** and **habitat**. It aims to give internet users more exposure to Indonesia's biodiversity and to spark curiosity in children.

NatFun is built with **Solid**, a decentralized web technology: users store their photos, likes, comments, follow lists and messages in their **own Pods**. NatFun itself is only a *view* over those Pods and keeps no user data on any server.

This prototype is developed for a course assignment: *form a group of two, initiate an application using Decentralized Web Technology (Solid) and develop your own app, inspired by the existing Solid example apps.*

## 2. Problem and Opportunity

| Problem | Opportunity |
|---|---|
| Indonesian biodiversity is rarely presented in an organized, child-friendly way. | A curated and community-enriched photo catalog by province, taxonomy and habitat. |
| Today's web stores user data in application silos (lecture slides 3, 11), giving users little control or transparency. | A community platform where users own their photos and interactions and the app is replaceable. |
| Child-safe participation on social platforms is hard to guarantee. | A read-only Child role, adult-only interactions and admin curation of everything that is displayed. |

## 3. Goals and Non-Goals

### 3.1 Goals

1. Deliver a working prototype that **proves decentralization**: user data lives in users' Pods across at least two Solid providers, and any generic Solid browser can display it.
2. Provide a browsable catalog of Indonesian flora and fauna with search, filters and a province map.
3. Allow adult users to contribute photos, subject to automated checks and admin approval.
4. Provide basic social features (like, comment, follow, mutual, DM) implemented in the Solid way (pod-to-pod).
5. Provide a safe, read-only experience for children.

### 3.2 Non-Goals (prototype)

Quizzes, badges and other educational games (planned after the prototype); encryption of data; precise coordinates; multiple UI languages; push notifications; automated comment moderation; age verification; native mobile apps; global user search.

## 4. Target Users

| User | Description | Main needs |
|---|---|---|
| **Child** (illustrative persona: a primary-school student) | Learner whose WebID is linked by a parent. | Safe, visual, easy browsing of animals and plants by place and habitat. |
| **Parent** (illustrative persona: an adult nature enthusiast or caregiver) | Regular adult user. | Explore the catalog, contribute own photos, interact with others, supervise a child. |
| **Admin** | One specific WebID (maintainer). | Curate official content, approve or reject uploads, unlist inappropriate content. |
| **Lecturer / reviewer** (stakeholder) | Evaluates the assignment. | Clear evidence that the app is decentralized and uses Solid correctly. |

## 5. Product Principles

1. **Decentralization first**: data lives in Pods; the app holds no user data and has no backend.
2. **Safety by design**: login required for all content, children are read-only, admin gate for everything displayed.
3. **Open formats**: JSON-LD and standard vocabularies so other Solid apps can read the same data.
4. **Prototype pragmatism**: simple mechanisms that work within two weeks; limitations documented honestly.

## 6. Scope and Feature List

### 6.1 Must-have (approved)

| ID | Feature | Summary |
|---|---|---|
| F-01 | Solid login | WebID login with a choice of Identity Provider. |
| F-02 | Roles and child linking | Child, Parent, Admin; a Parent links a child's WebID and the child accepts. |
| F-03 | Official catalog | 30 to 50 curated entries (6+ provinces, both kingdoms) in the Official Pod. |
| F-04 | Browse, search, filter, map | Filter by province, taxonomy, habitat, conservation status; text search; clickable province map. |
| F-05 | Photo upload | Parents upload one photo (max 5 MB) with local name, scientific name, province, taxonomy, habitat, conservation status and license to their own Pod. |
| F-06 | Pre-upload validation | In-browser checks for inappropriate content and for "is this a plant or animal". |
| F-07 | Admin moderation | Approve, reject or unlist; only approved entries are listed in the catalog. |
| F-08 | Like and comment | Parents only; stored in the actor's Pod, referenced from the entry's owner. |
| F-09 | Follow and mutual | One-way follow; mutual computed from both follow lists. |
| F-10 | DM and share | Pod-to-pod messages between mutuals; sharing an entry is a DM with a link. |
| F-11 | Authenticated-only access | Nothing readable by the public or by visitors. |
| F-12 | Decentralization proof | Multi-provider operation and visibility of data in an external Pod browser. |

### 6.2 Should-have (approved)

| ID | Feature |
|---|---|
| S-01 | Profile page |
| S-02 | Report content button |
| S-03 | Simple in-app notifications (polling) |

### 6.3 Later (after the prototype)

Quizzes, badges and learning modes; encryption; multi-language; richer moderation tools; additional taxonomy depth.

## 7. User Stories and Acceptance Criteria

| # | User story | Acceptance criteria |
|---|---|---|
| US-01 | As a visitor, I can only log in; I cannot see any content before logging in. | Without a session only the landing and login page is shown. |
| US-02 | As a user, I log in with my own Solid IdP. | Login works with at least two different providers. |
| US-03 | As a Child, I browse animals and plants by province or habitat. | Filters and map work; no upload, like, comment, follow or DM controls are visible. |
| US-04 | As a Parent, I link my child's WebID. | The child sees a request, accepts, and from then on has the Child role. |
| US-05 | As a Parent, I upload a photo of a plant or animal to my Pod. | Invalid or inappropriate images are blocked; a valid upload shows as Pending. |
| US-06 | As the Admin, I review pending uploads. | Approve adds the entry to the catalog; reject records a reason; the uploader sees the status. |
| US-07 | As a Parent, I like and comment on an entry. | Like and comment appear in my Pod and in counts and lists for all viewers; deleting them removes them from counts. |
| US-08 | As a Parent, I follow another Parent and become mutual. | "Mutual" shows only when both follow each other. |
| US-09 | As a Parent, I send a message or share an entry with a mutual. | The message is written to the recipient's Pod inbox and shown only if we are mutual. |
| US-10 | As the lecturer, I can verify that data is in the users' Pods. | Demonstration script in the SRS (Appendix C) passes. |

## 8. Key User Flows

1. **Browse**: Login, Browse screen, filter or click a province on the map, open an entry, view photo, metadata, likes and comments.
2. **Contribute**: Upload form, in-browser validation, store in own Pod, Pending, Admin approval, entry appears in the catalog.
3. **Socialize**: Like and comment, follow an entry owner, mutual, DM or share.
4. **Family**: Parent adds child's WebID, child accepts, child browses read-only.
5. **Moderate**: Admin queue, approve, reject or unlist (also from reports).

## 9. How It Works (technical summary)

- **Frontend**: static single-page app; no application backend or database.
- **Identity**: Solid-OIDC; the user picks any IdP.
- **Data in user Pods**: photos, observation metadata (JSON-LD), likes and comments (Activity Streams), follow list, inbox.
- **Data in the Official Pod**: catalog index (links to approved entries), official entries, submissions, decisions, reports, child links.
- **Interactions**: the actor stores the like or comment in their own Pod and appends a small reference to the entry's interaction container, which viewers verify when computing counts.
- **Moderation**: the Admin gate controls what is *listed*; access control on resources is authenticated-only.
- **Validation**: in-browser ML models for inappropriate content and for plant or animal recognition; admin approval remains the final gate.
- **Suggested stack** (non-binding): React + TypeScript, Inrupt Solid client libraries, in-browser ML runtime, static hosting.

Inspiration from the Solid app showcase: Solidflix (media sharing), Proxion (messaging), Tired Bike (decentralized community platform), dokieli (social interactions).

## 10. Success Metrics

For a prototype assessed in a presentation, success is defined by demonstration:

| Metric | Target |
|---|---|
| Decentralization proven (SRS Appendix C) | All 8 demo steps pass |
| Providers supported simultaneously | At least 2 different Solid providers |
| Must-have features working end to end | 12 of 12 (F-01 to F-12) |
| Seed catalog | 30 to 50 official entries, 6+ provinces, both kingdoms |
| Child safety | Child role has no write, follow or DM controls |
| Should-have features | As many as time permits (S-01 to S-03) |

## 11. Plan (about 2 weeks, 2 developers)

Suggested split: **Developer A** focuses on the Solid data layer (auth, Pod structure, ACLs, moderation, interactions); **Developer B** focuses on UI, catalog and browse, upload validation and the map. Both pair on integration and the demo.

| Period | Milestones |
|---|---|
| Days 1 to 2 | Select providers and create test Pods; project setup; config; Solid login; data schemas; seed data collection started. |
| Days 3 to 5 | Official Pod and catalog index; Browse, filters, search and province map; entry detail. |
| Days 6 to 8 | Roles and child linking; upload with EXIF stripping; in-browser validation; submissions. |
| Days 9 to 11 | Admin moderation; like and comment; follow and mutual; DM and share. |
| Days 12 to 13 | Access control hardening; Should-have items; bug fixing; seed data completion. |
| Day 14 | Demo rehearsal following the acceptance script; documentation and presentation. |

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Solid provider downtime or missing WAC/ACP or Solid-OIDC support. | Demo failure. | Test providers on day 1; keep a self-hosted Community Solid Server as backup. |
| Cross-Pod interactions (likes, comments, DM) are more complex than they look. | Schedule slip. | Use the simple reference-container design in the SRS; implement like first, then reuse for comments. |
| In-browser ML accuracy or size. | Poor validation or slow upload. | Use small pre-trained models; thresholds in config; admin approval as final gate. |
| Photo licensing for seed data. | Legal and presentation risk. | Only use photos with verified open licenses; record the source and license. |
| Child restrictions are app-enforced, not server-enforced. | Limited assurance. | Documented as a limitation; children's content cannot enter the catalog. |
| Scope creep (games, extra social features). | Prototype not finished. | Quizzes and badges explicitly deferred; Must-have first. |

## 13. Decision Log (from requirement discussions)

| Topic | Decision |
|---|---|
| Technology | Solid (as in the course material and lecturer's examples); no preferred stack; Pods from existing providers. |
| Data format | Follow the lecture: JSON-LD/RDF and Activity Streams style activities. |
| Data ownership | Each user stores their own photos and interactions in their own Pod; official collection in the Admin's Official Pod. |
| Roles | Child, Parent, Admin; one Admin WebID. |
| Child accounts | Created when a Parent links the child's WebID; no upload, comment, like, follow or DM. |
| Visibility | Login required to see any content. |
| Metadata | Local name, scientific name, province, taxonomy (kingdom, class, family), habitat, conservation status; no coordinates. |
| Moderation | Admin curates what is displayed; in-browser checks for inappropriate content and flora/fauna. |
| Social | Follow is one-way; mutual is computed; DM is pod-to-pod; share is a DM with a link. |
| Search | Search and filters and an interactive province map; single UI language. |
| Photos | Maximum 5 MB, one photo per post; license chosen by uploader (default CC BY 4.0). |
| Deferred | Quizzes, badges and other educational features. |
| Documents | SRS in IEEE 830 format, English, Markdown. |

## 14. Open Items

1. Final host for the SPA and URL for the `natfun:` vocabulary.
2. Selection of in-browser ML models and thresholds.
3. Confirmation that the chosen Solid providers support the required access control mechanism and the OIDC flow.
4. Sources and licenses for the official seed photos.
