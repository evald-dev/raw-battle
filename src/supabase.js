import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Gibt die Rolle des aktuellen Users zurück
export async function getMyRole() {
  const { data } = await supabase.rpc("get_my_role");
  return data;
}

// Gibt die judge_id des aktuellen Users zurück
export async function getMyJudgeId() {
  const { data } = await supabase.rpc("get_my_judge_id");
  return data;
}