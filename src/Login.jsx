import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getMyRole } from "./supabase";
import "./styles.css";

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
  e.preventDefault();
  setError(null);
  setLoading(true);
  const err = await signIn(email, password);
  console.log("signIn error:", err);
  if (err) {
    setError("Неверный email или пароль");
    setLoading(false);
    return;
  }
  const role = await getMyRole();
  console.log("role nach login:", role);
  setLoading(false);
  if (role === "admin") navigate("/admin");
  else if (role === "judge") navigate("/judge");
  else navigate("/");
}

  return (
    <>
      <div className="video-bg" aria-hidden="true">
        <video autoPlay muted playsInline preload="auto" loop>
          <source src="videos/tv-noise.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="top-marquee" aria-hidden="true">
        <div className="top-marquee-track">
          0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД • 0.49 GERMANY • СЫРОЙ БАТЛ • ПЕРВЫЙ ОТБОРОЧНЫЙ РАУНД •
        </div>
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <div className="font-[Montserrat] text-[11px] tracking-[0.18em] uppercase text-[rgba(245,232,207,0.35)] mb-2">
              0.49 — СЫРОЙ БАТЛ
            </div>
            <div className="font-[Montserrat] text-[26px] font-bold tracking-[0.04em] text-[#f5e8cf]">
              Войти
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-[oklch(26.9%_0_0/0.8)] border border-white/[0.12] rounded-xl p-7 flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="font-[Montserrat] text-[10px] font-bold tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-white/[0.06] border border-white/[0.12] rounded-lg text-[#f5e8cf] font-[Montserrat] text-[13px] px-3 py-2.5 outline-none transition-colors focus:border-[#d94b6a]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-[Montserrat] text-[10px] font-bold tracking-[0.12em] uppercase text-[rgba(245,232,207,0.35)]">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-white/[0.06] border border-white/[0.12] rounded-lg text-[#f5e8cf] font-[Montserrat] text-[13px] px-3 py-2.5 outline-none transition-colors focus:border-[#d94b6a]"
              />
            </div>

            {error && (
              <div className="font-[Montserrat] text-[12px] text-[#d94b6a] text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 px-4 py-2.5 rounded-full border border-[#d94b6a] bg-[rgba(217,75,106,0.15)] text-[#f5e8cf] font-[Montserrat] text-[12px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all hover:bg-[rgba(217,75,106,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Загрузка..." : "Войти"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/")}
              className="font-[Montserrat] text-[11px] tracking-[0.1em] uppercase text-[rgba(245,232,207,0.3)] hover:text-[rgba(245,232,207,0.6)] transition-colors bg-transparent border-0 cursor-pointer"
            >
              ← На главную
            </button>
          </div>
        </div>
      </main>
    </>
  );
}