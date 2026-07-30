// DB-Layer Verteilerplaner — localStorage only

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

export async function loadProjekteDB()         { return null; }
export async function saveProjektDB()          { return null; }
export async function deleteProjektDB()        {}
