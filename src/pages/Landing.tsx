import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { appConfig } from "@/config/appConfig";

export default function Landing() {
  const { ready, session, state, error, login } = useAuth();
  const [custom, setCustom] = useState("");
  const [preset, setPreset] = useState<string>(appConfig.idpPresets[0].url);

  if (session.info.isLoggedIn && state) {
    // Aplikasi memakai BrowserRouter (routing berbasis path) — redirect
    // deklaratif via <Navigate>, bukan window.location.hash (URL jadi
    // /#/browse dan pathname tetap "/", sehingga route tak pernah match).
    return <Navigate to="/browse" replace />;
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-leaf-50 to-stone-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-extrabold text-leaf-700">🌿 NatFun</h1>
        <p className="mt-2 text-center text-stone-500">{appConfig.appTagline}</p>
        <p className="mt-4 text-center text-sm text-stone-600">
          Foto dan data Anda tersimpan di <strong>Pod milik Anda sendiri</strong> (Solid).
          Aplikasi ini tidak menyimpan data pengguna.
        </p>

        {!ready ? (
          <p className="mt-8 text-center text-stone-400">Memuat…</p>
        ) : session.info.isLoggedIn ? (
          state ? (
            <p className="mt-8 text-center text-stone-500">Memuat Pod Anda…</p>
          ) : (
            <p className="mt-8 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
              {error ?? "Gagal memuat Pod Anda. Muat ulang halaman untuk mencoba lagi."}
            </p>
          )
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              login(preset);
            }}
          >
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-stone-700">Pilih Identity Provider</legend>
              {appConfig.idpPresets.map((p) => (
                <label key={p.url} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
                  <input
                    type="radio"
                    name="idp"
                    checked={preset === p.url}
                    onChange={() => setPreset(p.url)}
                  />
                  {p.label}
                </label>
              ))}
              <label className="block text-sm">
                <span className="text-stone-700">URL IdP lain:</span>
                <input
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    if (e.target.value) setPreset(e.target.value);
                  }}
                  placeholder="https://idp.contoh.org/"
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </fieldset>
            <button
              type="submit"
              className="w-full rounded-lg bg-leaf-600 py-2.5 font-semibold text-white hover:bg-leaf-700"
            >
              Masuk dengan WebID
            </button>
            <p className="text-center text-xs text-stone-400">
              Seluruh konten hanya dapat dilihat setelah login.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
