/**
 * Supabase-Layer für den KNX-Planer
 *
 * Benötigte SQL-Migration in Supabase:
 *
 *   CREATE TABLE knx_gruppen (
 *     id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     hauptgruppe   integer NOT NULL DEFAULT 0,
 *     mittelgruppe  integer NOT NULL DEFAULT 0,
 *     untergruppe   integer NOT NULL DEFAULT 0,
 *     name          text NOT NULL DEFAULT '',
 *     funktion      text NOT NULL DEFAULT 'Licht',
 *     dpt           text NOT NULL DEFAULT '1.001',
 *     raum_id       uuid,
 *     notiz         text DEFAULT '',
 *     created_at    timestamptz DEFAULT now(),
 *     updated_at    timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE knx_gruppen ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON knx_gruppen FOR ALL USING (true) WITH CHECK (true);
 *
 *   CREATE TABLE knx_raeume (
 *     id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     name       text NOT NULL DEFAULT '',
 *     etage      text NOT NULL DEFAULT 'EG',
 *     typ        text NOT NULL DEFAULT 'Wohnzimmer',
 *     position   integer DEFAULT 0,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE knx_raeume ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON knx_raeume FOR ALL USING (true) WITH CHECK (true);
 *
 *   CREATE TABLE knx_checkliste (
 *     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     raum_id     uuid,
 *     kategorie   text NOT NULL DEFAULT 'Allgemein',
 *     bezeichnung text NOT NULL DEFAULT '',
 *     erledigt    boolean DEFAULT false,
 *     notiz       text DEFAULT '',
 *     position    integer DEFAULT 0,
 *     created_at  timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE knx_checkliste ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON knx_checkliste FOR ALL USING (true) WITH CHECK (true);
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

const LS_GA      = "knx_gruppen";
const LS_RAEUME  = "knx_raeume";
const LS_CHECK   = "knx_checkliste";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Gruppenandadressen ──────────────────────────────────────────────────────

export async function ladeGA() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("knx_gruppen").select("*")
      .order("hauptgruppe").order("mittelgruppe").order("untergruppe");
    if (!error && data) {
      localStorage.setItem(LS_GA, JSON.stringify(data));
      return data;
    }
  }
  return JSON.parse(localStorage.getItem(LS_GA) || "[]");
}

export async function speichereGA(ga) {
  const now = new Date().toISOString();
  const row = { ...ga, updated_at: now };
  if (!row.id) row.id = uid();
  if (isSupabaseConfigured()) {
    await supabase.from("knx_gruppen").upsert(row, { onConflict: "id" });
  }
  const list = JSON.parse(localStorage.getItem(LS_GA) || "[]");
  const idx = list.findIndex(x => x.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  localStorage.setItem(LS_GA, JSON.stringify(list));
  return row;
}

export async function loescheGA(id) {
  if (isSupabaseConfigured()) {
    await supabase.from("knx_gruppen").delete().eq("id", id);
  }
  const list = JSON.parse(localStorage.getItem(LS_GA) || "[]").filter(x => x.id !== id);
  localStorage.setItem(LS_GA, JSON.stringify(list));
}

// ── Räume ───────────────────────────────────────────────────────────────────

export async function ladeRaeume() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("knx_raeume").select("*").order("position").order("etage");
    if (!error && data) {
      localStorage.setItem(LS_RAEUME, JSON.stringify(data));
      return data;
    }
  }
  return JSON.parse(localStorage.getItem(LS_RAEUME) || "[]");
}

export async function speichereRaum(raum) {
  const row = { ...raum };
  if (!row.id) row.id = uid();
  if (isSupabaseConfigured()) {
    await supabase.from("knx_raeume").upsert(row, { onConflict: "id" });
  }
  const list = JSON.parse(localStorage.getItem(LS_RAEUME) || "[]");
  const idx = list.findIndex(x => x.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  localStorage.setItem(LS_RAEUME, JSON.stringify(list));
  return row;
}

export async function loescheRaum(id) {
  if (isSupabaseConfigured()) {
    await supabase.from("knx_raeume").delete().eq("id", id);
  }
  const list = JSON.parse(localStorage.getItem(LS_RAEUME) || "[]").filter(x => x.id !== id);
  localStorage.setItem(LS_RAEUME, JSON.stringify(list));
}

// ── Checkliste ──────────────────────────────────────────────────────────────

export async function ladeCheckliste() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("knx_checkliste").select("*").order("raum_id").order("position");
    if (!error && data) {
      localStorage.setItem(LS_CHECK, JSON.stringify(data));
      return data;
    }
  }
  return JSON.parse(localStorage.getItem(LS_CHECK) || "[]");
}

export async function speichereCheckItem(item) {
  const row = { ...item };
  if (!row.id) row.id = uid();
  if (isSupabaseConfigured()) {
    await supabase.from("knx_checkliste").upsert(row, { onConflict: "id" });
  }
  const list = JSON.parse(localStorage.getItem(LS_CHECK) || "[]");
  const idx = list.findIndex(x => x.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  localStorage.setItem(LS_CHECK, JSON.stringify(list));
  return row;
}

export async function loescheCheckItem(id) {
  if (isSupabaseConfigured()) {
    await supabase.from("knx_checkliste").delete().eq("id", id);
  }
  const list = JSON.parse(localStorage.getItem(LS_CHECK) || "[]").filter(x => x.id !== id);
  localStorage.setItem(LS_CHECK, JSON.stringify(list));
}
