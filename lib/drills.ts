import { createBrowserSupabase } from "./supabase/client";
import type { DrillReport } from "./drillReport";
import type { DrillRow } from "./drillMastery";

// Sauvegarde best-effort : si l'utilisateur n'est pas connecté, on ne fait rien (drill anonyme).
export async function saveDrill(theme: string, report: DrillReport): Promise<void> {
  try {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("drills").insert({
      user_id: data.user.id,
      theme,
      score: report.score,
      report,
    });
  } catch {
    // best-effort : un échec de sauvegarde ne casse jamais l'affichage du rapport
  }
}

export async function loadDrillRows(): Promise<DrillRow[]> {
  try {
    const supabase = createBrowserSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    const { data } = await supabase
      .from("drills")
      .select("theme, score, created_at")
      .order("created_at", { ascending: false });
    return (data as DrillRow[]) ?? [];
  } catch {
    return [];
  }
}
