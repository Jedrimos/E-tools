// DB-Layer Prüfprotokoll — localStorage only

export async function loadProtokolleDB()   { return null; }
export async function saveProtokollDB()    { return null; }
export async function deleteProtokollDB()  {}

export async function loadProjekteForImport() {
  try {
    return JSON.parse(localStorage.getItem("vp_projekte") || "[]");
  } catch {
    return [];
  }
}
