// DB-Layer KNX-Planer — localStorage only
import { uid } from "./utils.js";

const LS_GA     = "knx_gruppen";
const LS_RAEUME = "knx_raeume";
const LS_CHECK  = "knx_checkliste";

function lsGet(key)       { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function lsSet(key, list) { localStorage.setItem(key, JSON.stringify(list)); }

// ── Gruppenadressen ──────────────────────────────────────────────────────────

export async function ladeGA() {
  return lsGet(LS_GA).sort((a, b) =>
    a.hauptgruppe - b.hauptgruppe || a.mittelgruppe - b.mittelgruppe || a.untergruppe - b.untergruppe
  );
}

export async function speichereGA(ga) {
  const row = { ...ga, updated_at: new Date().toISOString() };
  if (!row.id) row.id = uid();
  const list = lsGet(LS_GA);
  const idx = list.findIndex(x => x.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  lsSet(LS_GA, list);
  return row;
}

export async function loescheGA(id) {
  lsSet(LS_GA, lsGet(LS_GA).filter(x => x.id !== id));
}

// ── Räume ────────────────────────────────────────────────────────────────────

export async function ladeRaeume() {
  return lsGet(LS_RAEUME).sort((a, b) => (a.position || 0) - (b.position || 0));
}

export async function speichereRaum(raum) {
  const row = { ...raum };
  if (!row.id) row.id = uid();
  const list = lsGet(LS_RAEUME);
  const idx = list.findIndex(x => x.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  lsSet(LS_RAEUME, list);
  return row;
}

export async function loescheRaum(id) {
  lsSet(LS_RAEUME, lsGet(LS_RAEUME).filter(x => x.id !== id));
}

// ── Checkliste ───────────────────────────────────────────────────────────────

export async function ladeCheckliste() {
  return lsGet(LS_CHECK).sort((a, b) => (a.position || 0) - (b.position || 0));
}

export async function speichereCheckItem(item) {
  const row = { ...item };
  if (!row.id) row.id = uid();
  const list = lsGet(LS_CHECK);
  const idx = list.findIndex(x => x.id === row.id);
  if (idx >= 0) list[idx] = row; else list.push(row);
  lsSet(LS_CHECK, list);
  return row;
}

export async function loescheCheckItem(id) {
  lsSet(LS_CHECK, lsGet(LS_CHECK).filter(x => x.id !== id));
}
