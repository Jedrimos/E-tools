/**
 * VDE-Grenzwerte und Bewertungslogik nach DIN VDE 0100-600
 * Exportiert für Verwendung in Pruefprotokoll.jsx und Unit-Tests.
 */

export const GW = {
  riso_min:    1.0,   // ≥ 1 MΩ  (§61.3.3)
  fi_t_nenn:   300,   // ≤ 300 ms bei IΔN (Typ AC/A/F/B)
  fi_t_s_nenn: 500,   // ≤ 500 ms bei IΔN (Typ S, selektiv)
  fi_t_5fach:   40,   // ≤ 40 ms bei 5×IΔN
  fi_ub_max:    50,   // ≤ 50 V Berührungsspannung
  u0:          230,   // Nennspannung gegen Erde (TN-System)
};

// Auslösefaktor (Ia = Faktor × In) nach IEC 60898-1 für den Nachweis der Abschaltbedingung
// Zs × Ia ≤ U0 (§61.3.6). K und gG haben keinen einheitlichen Faktor (herstellerabhängig
// bzw. Schmelzsicherungs-Kennlinie) und werden daher nicht automatisch bewertet.
const IA_FAKTOR = { B: 5, C: 10, D: 20 };

/** Bewertet einen einzelnen Messwert. Gibt "ok", "fail" oder null zurück. */
export function evalNum(val, pass) {
  if (val === "" || val == null) return null;
  const n = parseFloat(String(val).replace(",", "."));
  if (isNaN(n)) return null;
  return pass(n) ? "ok" : "fail";
}

/** Max. zulässige Schleifenimpedanz Zs (Ω) für den Stromkreis, oder null falls nicht ermittelbar. */
export function zsGrenzwert(sk) {
  if (!sk) return null;
  const faktor = IA_FAKTOR[sk.sicherungstyp];
  const nennstrom = parseFloat(String(sk.nennstrom).replace(",", "."));
  if (!faktor || isNaN(nennstrom) || nennstrom <= 0) return null;
  return GW.u0 / (faktor * nennstrom);
}

/** Bewertet einen Stromkreis vollständig. Gibt "offen", "ok" oder "fail" zurück. */
export function evalStromkreis(sk) {
  if (!sk) return "offen";
  const zsMax = zsGrenzwert(sk);
  const ia = zsMax != null ? GW.u0 / zsMax : null;
  const results = [
    evalNum(sk.pe_widerstand, () => true),           // PE: kein fixer Grenzwert
    evalNum(sk.riso_l1_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_l2_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_l3_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_n_pe,   v => v >= GW.riso_min),
    zsMax != null ? evalNum(sk.zs, v => v <= zsMax) : null,
    ia != null    ? evalNum(sk.ik, v => v >= ia)    : null,
  ].filter(r => r === "ok" || r === "fail");

  if (sk.fi_vorhanden) {
    const max_nenn = sk.fi_typ === "S" ? GW.fi_t_s_nenn : GW.fi_t_nenn;
    results.push(...[
      evalNum(sk.fi_t_nenn,  v => v <= max_nenn),
      evalNum(sk.fi_t_5fach, v => v <= GW.fi_t_5fach),
      evalNum(sk.fi_ub,      v => v <= GW.fi_ub_max),
    ].filter(Boolean));
    // ½×IΔN: wenn Wert eingetragen (kein reiner Leerraum) → RCD hat (unerlaubt) ausgelöst → Fehler
    if (String(sk.fi_t_halb ?? "").trim() !== "") results.push("fail");
  }

  if (results.length === 0) return "offen";
  if (results.includes("fail")) return "fail";
  return "ok";
}

/** Gesamtstatus einer Liste von Stromkreisen: "fail" sobald einer fehlschlägt,
 *  "ok" nur wenn ALLE Stromkreise explizit geprüft und iO sind, sonst "offen". */
export function gesamtStatus(stromkreise) {
  const statuses = (stromkreise || []).map(evalStromkreis);
  if (statuses.includes("fail")) return "fail";
  if (statuses.length > 0 && statuses.every(s => s === "ok")) return "ok";
  return "offen";
}

/** Gibt den kleinsten gemessenen Riso-Wert zurück (als formatierter String). */
export function risoMin(sk) {
  if (!sk) return "";
  const vals = [sk.riso_l1_pe, sk.riso_l2_pe, sk.riso_l3_pe, sk.riso_n_pe]
    .filter(v => v !== "")
    .map(v => parseFloat(String(v).replace(",", ".")))
    .filter(n => !isNaN(n));
  if (!vals.length) return "";
  return Math.min(...vals).toFixed(2);
}
