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
};

/** Bewertet einen einzelnen Messwert. Gibt "ok", "fail" oder null zurück. */
export function evalNum(val, pass) {
  if (val === "" || val == null) return null;
  const n = parseFloat(String(val).replace(",", "."));
  if (isNaN(n)) return null;
  return pass(n) ? "ok" : "fail";
}

/** Bewertet einen Stromkreis vollständig. Gibt "offen", "ok" oder "fail" zurück. */
export function evalStromkreis(sk) {
  if (!sk) return "offen";
  const results = [
    evalNum(sk.pe_widerstand, () => true),           // PE: kein fixer Grenzwert
    evalNum(sk.riso_l1_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_l2_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_l3_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_n_pe,   v => v >= GW.riso_min),
  ].filter(r => r === "ok" || r === "fail");

  if (sk.fi_vorhanden) {
    const max_nenn = sk.fi_typ === "S" ? GW.fi_t_s_nenn : GW.fi_t_nenn;
    results.push(...[
      evalNum(sk.fi_t_nenn,  v => v <= max_nenn),
      evalNum(sk.fi_t_5fach, v => v <= GW.fi_t_5fach),
      evalNum(sk.fi_ub,      v => v <= GW.fi_ub_max),
    ].filter(Boolean));
    // ½×IΔN: wenn Wert eingetragen → RCD hat (unerlaubt) ausgelöst → Fehler
    if (sk.fi_t_halb !== "" && sk.fi_t_halb != null) results.push("fail");
  }

  if (results.length === 0) return "offen";
  if (results.includes("fail")) return "fail";
  return "ok";
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
