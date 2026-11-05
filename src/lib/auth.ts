import {
  fetch,
  handleIncomingRedirect,
  login,
  logout,
  getDefaultSession,
} from "@inrupt/solid-client-authn-browser";
import { appConfig } from "@/config/appConfig";

export type { Session } from "@inrupt/solid-client-authn-browser";

export async function restoreSession(): Promise<boolean> {
  await handleIncomingRedirect({ restorePreviousSession: true });
  return getDefaultSession().info.isLoggedIn;
}

export function currentSession() {
  return getDefaultSession();
}

export function startLogin(oidcIssuer: string): Promise<void> {
  return login({
    oidcIssuer,
    redirectUrl: window.location.href.split("?")[0],
    clientName: appConfig.appName,
  });
}

export function endLogout(): Promise<void> {
  return logout();
}

export { fetch };
