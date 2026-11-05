import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { displayName } from "@/lib/profile";

const navItems = [
  { to: "/browse", label: "Jelajahi", roles: ["Child", "Parent", "Admin"] },
  { to: "/upload", label: "Unggah", roles: ["Parent", "Admin"] },
  { to: "/submissions", label: "Kirimanku", roles: ["Parent", "Admin"] },
  { to: "/following", label: "Mengikuti", roles: ["Parent"] },
  { to: "/messages", label: "Pesan", roles: ["Parent"] },
  { to: "/family", label: "Keluarga", roles: ["Parent", "Child"] },
  { to: "/admin", label: "Moderasi", roles: ["Admin"] },
  { to: "/profile", label: "Profil", roles: ["Parent"] },
];

export default function Layout() {
  const { state, logout, session } = useAuth();
  const navigate = useNavigate();
  const role = state?.role;

  const items = navItems.filter((i) => !role || i.roles.includes(role));

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <NavLink to="/browse" className="text-lg font-bold text-leaf-700">
          🌿 NatFun
        </NavLink>
        <nav className="flex flex-wrap items-center gap-1">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-leaf-100 text-leaf-700" : "text-stone-600 hover:bg-stone-100"
                }`
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session.info.isLoggedIn && state && (
            <>
              <span className="hidden text-sm text-stone-500 sm:inline">
                {displayName(state.profile)} · {state.role}
              </span>
              <button
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
              >
                Keluar
              </button>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {state && !state.officialRoot && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800">
            Official Pod belum dapat diakses — set <code>VITE_NATFUN_ADMIN_WEBID</code> ke WebID
            Admin yang valid lalu muat ulang. Fitur katalog/moderasi dinonaktifkan sementara.
          </div>
        )}
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 bg-white px-4 py-2 text-center text-xs text-stone-400">
        NatFun — data Anda tersimpan di Pod Anda sendiri (Solid). Tidak terenkripsi end-to-end.
      </footer>
    </div>
  );
}
