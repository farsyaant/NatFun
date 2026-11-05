import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Browse from "@/pages/Browse";
import EntryDetail from "@/pages/EntryDetail";
import Upload from "@/pages/Upload";
import MySubmissions from "@/pages/MySubmissions";
import Following from "@/pages/Following";
import Messages from "@/pages/Messages";
import Family from "@/pages/Family";
import AdminQueue from "@/pages/AdminQueue";
import Profile from "@/pages/Profile";

function Gate({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { ready, session, state } = useAuth();
  if (!ready) return <p className="p-8 text-center text-stone-400">Memuat sesi…</p>;
  if (!session.info.isLoggedIn || !state) return <Navigate to="/" replace />;
  if (roles && !roles.includes(state.role)) return <Navigate to="/browse" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Gate><Layout /></Gate>}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/entry/:entryId" element={<EntryDetail />} />
            <Route path="/upload" element={<Gate roles={["Parent", "Admin"]}><Upload /></Gate>} />
            <Route path="/submissions" element={<Gate roles={["Parent", "Admin"]}><MySubmissions /></Gate>} />
            <Route path="/following" element={<Gate roles={["Parent"]}><Following /></Gate>} />
            <Route path="/messages" element={<Gate roles={["Parent"]}><Messages /></Gate>} />
            <Route path="/family" element={<Gate roles={["Parent", "Child"]}><Family /></Gate>} />
            <Route path="/admin" element={<Gate roles={["Admin"]}><AdminQueue /></Gate>} />
            <Route path="/profile" element={<Gate roles={["Parent"]}><Profile /></Gate>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
