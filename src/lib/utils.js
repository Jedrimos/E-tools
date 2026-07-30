// Gemeinsame Hilfsfunktionen
export function uid() {
  // crypto.randomUUID() ist praktisch kollisionsfrei (im Gegensatz zu reinem Math.random())
  // und in allen modernen Browsern im sicheren Kontext (HTTPS/localhost) verfügbar.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback für sehr alte Umgebungen ohne crypto.randomUUID
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
