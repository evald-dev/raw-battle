import { createContext, useContext, useEffect, useState } from "react";
import { supabase, getMyRole, getMyJudgeId } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [judgeId, setJudgeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialer Session-Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRole();
      else setLoading(false);
    });

    // Auth-State-Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRole();
      else { setRole(null); setJudgeId(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRole() {
    const [r, j] = await Promise.all([getMyRole(), getMyJudgeId()]);
    setRole(r);
    setJudgeId(j);
    setLoading(false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, role, judgeId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}