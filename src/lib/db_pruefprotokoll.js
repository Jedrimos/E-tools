/**
 * Supabase-Layer für Prüfprotokolle
 *
 * Benötigte SQL-Migration in Supabase:
 *
 *   CREATE TABLE pruefprotokolle (
 *     id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     name              text NOT NULL DEFAULT 'Protokoll',
 *     auftraggeber      text DEFAULT '',
 *     auftragnummer     text DEFAULT '',
 *     anlagenstandort   text DEFAULT '',
 *     anlage_art        text DEFAULT 'Wohngebäude',
 *     nennspannung      text DEFAULT '230/400',
 *     pruefer           text DEFAULT '',
 *     datum             date,
 *     naechste_pruefung date,
 *     stromkreise       jsonb DEFAULT '[]',
 *     notiz             text DEFAULT '',
 *     verteiler_id      uuid REFERENCES projekte(id) ON DELETE SET NULL,
 *     created_at        timestamptz DEFAULT now(),
 *     updated_at        timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE pruefprotokolle ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON pruefprotokolle FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";
import { loadProjekteDB } from "./db.js";

const TABLE = "pruefprotokolle";

function toRow(p) {
  return {
    id:               p.db_id || undefined,
    name:             p.auftraggeber || p.anlagenstandort || "Protokoll",
    auftraggeber:     p.auftraggeber      || "",
    auftragnummer:    p.auftragnummer     || "",
    anlagenstandort:  p.anlagenstandort   || "",
    anlage_art:       p.anlage_art        || "Wohngebäude",
    nennspannung:     p.nennspannung      || "230/400",
    pruefer:          p.pruefer           || "",
    datum:            p.datum             || null,
    naechste_pruefung: p.naechste_pruefung || null,
    stromkreise:      p.stromkreise       || [],
    notiz:            p.notiz             || "",
    verteiler_id:     p.verteiler_id      || null,
    updated_at:       new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    db_id:             row.id,
    id:                row.id,
    auftraggeber:      row.auftraggeber      || "",
    auftragnummer:     row.auftragnummer     || "",
    anlagenstandort:   row.anlagenstandort   || "",
    anlage_art:        row.anlage_art        || "Wohngebäude",
    nennspannung:      row.nennspannung      || "230/400",
    pruefer:           row.pruefer           || "",
    datum:             row.datum             || "",
    naechste_pruefung: row.naechste_pruefung || "",
    stromkreise:       row.stromkreise       || [],
    notiz:             row.notiz             || "",
    verteiler_id:      row.verteiler_id      || null,
  };
}

export async function loadProtokolleDB() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from(TABLE).select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function saveProtokollDB(p) {
  if (!isSupabaseConfigured()) return null;
  const row = toRow(p);
  if (row.id) {
    const { data, error } = await supabase.from(TABLE).update(row).eq("id", row.id).select().single();
    if (error) throw error;
    return fromRow(data);
  } else {
    const { id: _unused, ...insert } = row;
    const { data, error } = await supabase.from(TABLE).insert(insert).select().single();
    if (error) throw error;
    return fromRow(data);
  }
}

export async function deleteProtokollDB(dbId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", dbId);
  if (error) throw error;
}

/**
 * Lädt Verteilerplaner-Projekte für den Import.
 * Supabase → localStorage-Fallback.
 */
export async function loadProjekteForImport() {
  // Supabase-Variante
  if (isSupabaseConfigured()) {
    try {
      const data = await loadProjekteDB();
      if (data && data.length > 0) return data;
    } catch (_) { /* fallthrough */ }
  }
  // localStorage-Fallback
  try {
    return JSON.parse(localStorage.getItem("vp_projekte") || localStorage.getItem("svp_projekte") || "[]");
  } catch {
    return [];
  }
}
