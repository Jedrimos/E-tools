import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseAnonKey);

/**
 * Konvertiert Supabase/Postgres-Fehler in verständliche deutsche Meldungen.
 * Gibt einen String zurück, der dem Nutzer angezeigt werden kann.
 */
export function supabaseFehlermeldung(error) {
  if (!error) return "Unbekannter Fehler";
  const msg = error.message || String(error);
  const code = error.code || (error.details && error.details.code) || "";

  // Tabelle existiert nicht → SQL-Migration nötig
  if (code === "42P01" || msg.includes("does not exist") || msg.includes("relation") && msg.includes("not exist")) {
    return "Tabelle fehlt in der Datenbank → SQL-Migration ausführen (docs/supabase.sql)";
  }
  // Authentifizierung abgelaufen
  if (code === "PGRST301" || msg.includes("JWT") || msg.includes("expired")) {
    return "Sitzung abgelaufen → Seite neu laden oder API-Key prüfen";
  }
  // Verbindung nicht möglich
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
    return "Datenbank nicht erreichbar → Verbindung oder Supabase-URL prüfen";
  }
  // Eindeutigkeitsverstoß
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("unique")) {
    return "Datensatz existiert bereits in der Datenbank";
  }
  // RLS / Zugriff verweigert
  if (code === "42501" || msg.includes("permission denied") || msg.includes("policy")) {
    return "Zugriff verweigert → Row Level Security (RLS) in Supabase prüfen";
  }
  // Fallback: Original-Meldung kürzen
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}
