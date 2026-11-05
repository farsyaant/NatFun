import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getDefaultSession, type Session } from "@inrupt/solid-client-authn-browser";
import { restoreSession, startLogin, endLogout, currentSession } from "@/lib/auth";
import { loadAppState, loadCatalog, type AppState, type Role } from "@/lib/appState";
import type { CatalogIndex } from "@/lib/vocab";

interface AuthCtx {
  session: Session;
  ready: boolean;
  state: AppState | null;
  error: string | null;
  login: (idp: string) => void;
  logout: () => Promise<void>;
  refreshCatalog: (catalog?: CatalogIndex) => void;
  reloadCatalog: (force?: boolean) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: getDefaultSession(),
  ready: false,
  state: null,
  error: null,
  login: () => {},
  logout: async () => {},
  refreshCatalog: () => {},
  reloadCatalog: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(getDefaultSession());
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false); // StrictMode menjalankan effect dua kali — jangan dobel init

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const ok = await restoreSession();
        setSession(currentSession());
        if (ok) {
          const webId = currentSession().info.webId;
          if (webId) {
            try {
              setState(await loadAppState(webId));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Gagal memuat Pod.");
            }
          }
        }
      } catch {
        setError("Gagal memulihkan sesi.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback((idp: string) => {
    startLogin(idp);
  }, []);

  const logout = useCallback(async () => {
    await endLogout();
    setState(null);
    setSession(currentSession());
  }, []);

  const refreshCatalog = useCallback((catalog?: CatalogIndex) => {
    setState((prev) =>
      prev && catalog ? { ...prev, catalog } : prev,
    );
  }, []);

  const officialRoot = state?.officialRoot ?? null;
  // D6: katalog tidak lagi beku sejak login — refresh dari Official Pod
  // dengan throttle 30 detik agar navigasi antar halaman tidak menembak Pod.
  const lastCatalogLoad = useRef(0);
  const reloadCatalog = useCallback(
    async (force = false) => {
      if (!officialRoot) return;
      const now = Date.now();
      if (!force && now - lastCatalogLoad.current < 30_000) return;
      lastCatalogLoad.current = now;
      try {
        const catalog = await loadCatalog(officialRoot);
        setState((prev) => (prev ? { ...prev, catalog } : prev));
      } catch {
        // katalog lama tetap terpakai; error dicatat ringan
        console.warn("[NatFun] Gagal memuat ulang katalog — memakai cache.");
      }
    },
    [officialRoot],
  );

  return (
    <Ctx.Provider value={{ session, ready, state, error, login, logout, refreshCatalog, reloadCatalog }}>
      {children}
    </Ctx.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- hook context standar
export function useAuth(): AuthCtx {
  return useContext(Ctx);
}

export type { Role };
