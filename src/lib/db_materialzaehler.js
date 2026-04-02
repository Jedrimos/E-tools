/**
 * Supabase-Layer für den Materialzähler
 *
 * Benötigte SQL-Migration in Supabase:
 *
 *   CREATE TABLE materialzaehler_projekte (
 *     id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     name         text NOT NULL DEFAULT '',
 *     ort          text DEFAULT '',
 *     notiz        text DEFAULT '',
 *     positionen   jsonb DEFAULT '[]',
 *     created_at   timestamptz DEFAULT now(),
 *     updated_at   timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE materialzaehler_projekte ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON materialzaehler_projekte FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

const TABLE = "materialzaehler_projekte";

function toRow(p) {
  return {
    id:         p.db_id    || undefined,
    name:       p.name     || "",
    ort:        p.ort      || "",
    notiz:      p.notiz    || "",
    positionen: p.positionen || [],
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    db_id:      row.id,
    id:         row.id,
    name:       row.name       || "",
    ort:        row.ort        || "",
    notiz:      row.notiz      || "",
    positionen: row.positionen || [],
  };
}

export async function loadProjekteDB() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function saveProjektDB(p) {
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

export async function deleteProjektDB(dbId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", dbId);
  if (error) throw error;
}
