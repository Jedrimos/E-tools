// Supabase wurde entfernt — die App speichert ausschließlich in localStorage.
export const supabase = null;
export const isSupabaseConfigured = () => false;

export function supabaseFehlermeldung(error) {
  if (!error) return "Unbekannter Fehler";
  const msg = error.message || String(error);
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}
