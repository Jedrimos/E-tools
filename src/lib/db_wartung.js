// DB-Layer Wartungsprotokoll — localStorage only

const LS_KEY = "elektronikertools_wartung";

function loadLS()     { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function saveLS(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export async function loadWartungDB() {
  return loadLS();
}

export async function saveWartungDB(aufgabe) {
  const ls = loadLS();
  const idx = ls.findIndex(a => a.id === aufgabe.id);
  if (idx >= 0) ls[idx] = aufgabe; else ls.push(aufgabe);
  saveLS(ls);
}

export async function deleteWartungDB(id) {
  saveLS(loadLS().filter(a => a.id !== id));
}
