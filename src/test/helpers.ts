import type { AppState } from "@/lib/appState";
import type { UserPodPaths } from "@/lib/podInit";

export function fakePaths(host: string): UserPodPaths {
  const r = `https://${host}/natfun/`;
  return {
    root: r,
    observations: `${r}observations/`,
    photos: `${r}photos/`,
    interactions: `${r}interactions/`,
    activitiesLikes: `${r}activities/likes/`,
    activitiesComments: `${r}activities/comments/`,
    following: `${r}social/following.jsonld`,
    inbox: `${r}inbox/`,
    sent: `${r}messages/sent/`,
    familyAcceptances: `${r}family/acceptances/`,
  };
}

export function fakeAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    profile: { webId: "https://alice.example/profile/card#me", name: "Alice", storage: "https://alice.example/" },
    role: "Parent",
    storage: "https://alice.example/",
    podPaths: fakePaths("alice.example"),
    officialRoot: "https://official.example/natfun/",
    catalog: { "@context": {}, "@type": "Collection", items: [] },
    isNewPod: false,
    ...overrides,
  };
}