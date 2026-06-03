import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import App from "./App";
import Tabelle from "./Tabelle";
import Admin from "./Admin";
import Judge from "./Judge";
import Login from "./Login";

// ── Route Guards ──────────────────────────────────────────────────────────

function RequireAdmin({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[rgba(245,232,207,0.4)] font-[Montserrat] text-[12px] tracking-[0.1em] uppercase">Загрузка...</div>;
  if (!user || role !== "admin") return <Navigate to="/login" replace />;
  return children;
}

function RequireJudge({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[rgba(245,232,207,0.4)] font-[Montserrat] text-[12px] tracking-[0.1em] uppercase">Загрузка...</div>;
  if (!user || role !== "judge") return <Navigate to="/login" replace />;
  return children;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[rgba(245,232,207,0.4)] font-[Montserrat] text-[12px] tracking-[0.1em] uppercase">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── App ───────────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/raw-battle/">
    <AuthProvider>
      <Routes>
        {/* Öffentlich */}
        <Route path="/"       element={<App />} />
        <Route path="/login"  element={<Login />} />

        {/* Tabelle — öffentlich ODER eingeloggt, Sichtbarkeit wird in Tabelle.jsx geprüft */}
        <Route path="/tabelle" element={<Tabelle />} />

        {/* Nur für Richter */}
        <Route path="/judge" element={
          <RequireJudge><Judge /></RequireJudge>
        } />

        {/* Nur für Admin */}
        <Route path="/admin" element={
          <RequireAdmin><Admin /></RequireAdmin>
        } />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);