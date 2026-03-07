/*
  Wartungsprotokoll – DB-Layer
  Supabase-Tabelle (SQL-Migration):

  create table wartungsaufgaben (
    id          text primary key,
    bezeichnung text not null,
    kategorie   text default '',
    intervall   text default 'jaehrlich',   -- 'monatlich','vierteljaehrlich','halbjaehrlich','jaehrlich','2jaehrlich'
    letzte      text default '',            -- ISO date YYYY-MM-DD
    naechste    text default '',            -- ISO date YYYY-MM-DD (auto-calculated)
    zustaendig  text default '',
    notiz       text default '',
    created_at  timestamptz default now()
  );
  alter table wartungsaufgaben enable row level security;
  create policy "allow all" on wartungsaufgaben for all using (true) with check (true);
*/

import { supabase, isSupabaseConfigured } from "./supabase.js";

const LS_KEY = "elektronikertools_wartung";
const TABLE  = "wartungsaufgaben";

function loadLS()         { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function saveLS(list)     { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export async function loadWartungDB() {
  if (!isSupabaseConfigured()) return loadLS();
  const { data, error } = await supabase.from(TABLE).select("*").order("naechste", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveWartungDB(aufgabe) {
  const ls = loadLS();
  const idx = ls.findIndex(a => a.id === aufgabe.id);
  if (idx >= 0) ls[idx] = aufgabe; else ls.push(aufgabe);
  saveLS(ls);

  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).upsert(aufgabe);
  if (error) throw error;
}

export async function deleteWartungDB(id) {
  const ls = loadLS().filter(a => a.id !== id);
  saveLS(ls);

  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
