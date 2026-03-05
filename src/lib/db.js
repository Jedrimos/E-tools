import { supabase, isSupabaseConfigured } from "./supabase.js";

// ── Serialisierung: Projekt → DB-Row ──────────────────────────────────────
function toRow(p) {
  return {
    id:         p.db_id || undefined,
    name:       p.projekt?.name || p.name || "Unbekannt",
    ersteller:  p.projekt?.ersteller || "",
    adresse:    p.projekt?.adresse   || "",
    standort:   p.projekt?.standort  || "",
    kabel:       p.kabel       || [],
    sicherungen: p.sicherungen || [],
    fi_konfigs:  p.fiKonfigs   || [],
    stockwerke:  p.stockwerke  || [],
    raeume:      p.raeume      || [],
    sw_color_map: p.swColorMap || {},
    updated_at: new Date().toISOString(),
  };
}

// ── DB-Row → lokales Projekt-Objekt ──────────────────────────────────────
export function fromRow(row) {
  return {
    db_id:   row.id,
    id:      row.id,
    name:    row.name,
    datum:   row.created_at ? new Date(row.created_at).toLocaleDateString("de-DE") : "",
    projekt: {
      name:      row.name,
      ersteller: row.ersteller || "",
      adresse:   row.adresse   || "",
      standort:  row.standort  || "",
    },
    kabel:       row.kabel       || [],
    sicherungen: row.sicherungen || [],
    fiKonfigs:   row.fi_konfigs  || [],
    stockwerke:  row.stockwerke  || [],
    raeume:      row.raeume      || [],
    swColorMap:  row.sw_color_map || {},
  };
}

// ── Laden ─────────────────────────────────────────────────────────────────
export async function loadProjekteDB() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("projekte")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

// ── Speichern (upsert) ────────────────────────────────────────────────────
export async function saveProjektDB(projektState) {
  if (!isSupabaseConfigured()) return null;
  const row = toRow(projektState);

  if (row.id) {
    // Update
    const { data, error } = await supabase
      .from("projekte")
      .update(row)
      .eq("id", row.id)
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  } else {
    // Insert
    const { id: _unused, ...insert } = row;
    const { data, error } = await supabase
      .from("projekte")
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  }
}

// ── Löschen ───────────────────────────────────────────────────────────────
export async function deleteProjektDB(dbId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("projekte").delete().eq("id", dbId);
  if (error) throw error;
}
