import { createBrowserClient } from "@supabase/ssr";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CLIENT SUPABASE — facultatif par construction
 * ─────────────────────────────────────────────────────────────────────────────
 *  Sans variables d'environnement, `createBrowserClient(undefined, undefined)`
 *  lève « supabaseUrl is required ». Cet appel se fait dans le `useEffect` du
 *  Header, donc présent sur TOUTES les pages — y compris la landing, qui n'a
 *  aucun besoin d'authentification. Résultat : une page de présentation qui
 *  blanchit parce qu'une clé manque.
 *
 *  Ici, l'absence de configuration donne un client inerte : il se construit,
 *  chaque appel réseau échoue proprement et renvoie un utilisateur nul. Le
 *  site reste consultable, et les pages qui ont réellement besoin de l'auth
 *  (progression, réinitialisation) affichent leur état vide au lieu de casser.
 *
 *  Ce repli n'est pas un mode dégradé silencieux : quand Supabase sera
 *  configuré, ces valeurs ne seront simplement plus utilisées.
 */

const URL_DE_REPLI = "https://auth-non-configuree.supabase.co";
const CLE_DE_REPLI = "cle-anon-non-configuree";

/** Vrai quand l'authentification est réellement branchée. */
export function authConfiguree(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || URL_DE_REPLI,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || CLE_DE_REPLI
  );
}
