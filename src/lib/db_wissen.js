/**
 * Supabase-Layer für die Wissensdatenbank
 *
 * Benötigte SQL-Migration in Supabase:
 *
 *   CREATE TABLE wissensdatenbank (
 *     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     titel       text NOT NULL DEFAULT '',
 *     kategorie   text DEFAULT 'Allgemein',
 *     inhalt      text DEFAULT '',
 *     tags        text[] DEFAULT '{}',
 *     autor       text DEFAULT '',
 *     erstellt    date DEFAULT CURRENT_DATE,
 *     created_at  timestamptz DEFAULT now(),
 *     updated_at  timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE wissensdatenbank ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON wissensdatenbank FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

const TABLE = "wissensdatenbank";

function toRow(a) {
  return {
    id:        a.db_id     || undefined,
    titel:     a.titel     || "",
    kategorie: a.kategorie || "Allgemein",
    inhalt:    a.inhalt    || "",
    tags:      Array.isArray(a.tags) ? a.tags : (a.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    autor:     a.autor     || "",
    erstellt:  a.erstellt  || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row) {
  return {
    db_id:     row.id,
    id:        row.id,
    titel:     row.titel     || "",
    kategorie: row.kategorie || "Allgemein",
    inhalt:    row.inhalt    || "",
    tags:      Array.isArray(row.tags) ? row.tags : [],
    autor:     row.autor     || "",
    erstellt:  row.erstellt  || "",
  };
}

export async function loadWissenDB() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from(TABLE).select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function saveArtikelDB(a) {
  if (!isSupabaseConfigured()) return null;
  const row = toRow(a);
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

export async function deleteArtikelDB(dbId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", dbId);
  if (error) throw error;
}
