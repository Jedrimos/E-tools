/**
 * Supabase-Layer für das Stundenbuch
 *
 * Benötigte SQL-Migration in Supabase:
 *
 *   CREATE TABLE stunden (
 *     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     datum       date NOT NULL,
 *     von         text DEFAULT '',
 *     bis         text DEFAULT '',
 *     pause       integer DEFAULT 0,
 *     projekt     text DEFAULT '',
 *     taetigkeit  text DEFAULT '',
 *     notiz       text DEFAULT '',
 *     created_at  timestamptz DEFAULT now(),
 *     updated_at  timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE stunden ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON stunden FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

const TABLE = "stunden";

function toRow(e) {
  return {
    id:         e.db_id     || undefined,
    datum:      e.datum     || null,
    von:        e.von       || "",
    bis:        e.bis       || "",
    pause:      e.pause     ?? 0,
    projekt:    e.projekt   || "",
    taetigkeit: e.taetigkeit || "",
    notiz:      e.notiz     || "",
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    db_id:      row.id,
    id:         row.id,
    datum:      row.datum       || "",
    von:        row.von         || "",
    bis:        row.bis         || "",
    pause:      row.pause       ?? 0,
    projekt:    row.projekt     || "",
    taetigkeit: row.taetigkeit  || "",
    notiz:      row.notiz       || "",
  };
}

export async function loadStundenDB() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from(TABLE).select("*").order("datum", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function saveEintragDB(e) {
  if (!isSupabaseConfigured()) return null;
  const row = toRow(e);
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

export async function deleteEintragDB(dbId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", dbId);
  if (error) throw error;
}
