/**
 * Leitungsberechnung – Eigenständiges Berechnungstool
 * VDE 0100-520: Querschnittsempfehlung, Spannungsfall, Max-Länge
 *
 * Formeln:
 *  Querschnitt (mm²): A = (2 × I × L) / (κ × ΔU_zul)       [Einphasig / AC]
 *                     A = (√3 × I × L) / (κ × ΔU_zul)      [Drehstrom]
 *  Spannungsfall:     ΔU = (2 × I × L) / (κ × A)            [Einphasig]
 *                     ΔU = (√3 × I × L) / (κ × A)           [Drehstrom]
 *  ΔU% = ΔU / U_N × 100
 *
 *  κ(Cu) = 56 m/(Ω·mm²)
 *  κ(Al) = 35 m/(Ω·mm²)
 *  U_N = 230 V (1P), 400 V (3P)
 */

import React, { useState } from "react";

// ── Normleitersätze ────────────────────────────────────────────────────────
const QS_STUFEN = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// Belastbarkeit nach VDE 0100-520, vereinfacht B1/B2/C/E für Cu
// [qs_mm2]: { B1, B2, C, E }  Ampere
const BELASTBAR_CU = {
  1.5:  { B1: 13.5, B2: 13,   C: 15.5, E: 17   },
  2.5:  { B1: 18,   B2: 17.5, C: 21,   E: 23   },
  4:    { B1: 24,   B2: 23,   C: 28,   E: 30   },
  6:    { B1: 31,   B2: 30,   C: 36,   E: 38   },
  10:   { B1: 42,   B2: 40,   C: 50,   E: 52   },
  16:   { B1: 56,   B2: 53,   C: 66,   E: 70   },
  25:   { B1: 73,   B2: 70,   C: 84,   E: 88   },
  35:   { B1: 89,   B2: 86,   C: 104,  E: 110  },
  50:   { B1: 108,  B2: 103,  C: 125,  E: 133  },
  70:   { B1: 136,  B2: 130,  C: 160,  E: 171  },
  95:   { B1: 164,  B2: 156,  C: 194,  E: 207  },
  120:  { B1: 188,  B2: 179,  C: 225,  E: 240  },
};

// Für Al ca. 78 % der Cu-Werte (Faustregel)
const BELASTBAR_AL = Object.fromEntries(
  Object.entries(BELASTBAR_CU).map(([qs, v]) => [
    qs,
    Object.fromEntries(Object.entries(v).map(([t, a]) => [t, Math.round(a * 0.78)])),
  ])
);

const VERLEGEARTEN = [
  { wert: "B1", label: "B1 – Rohr im Mauerwerk / Wand" },
  { wert: "B2", label: "B2 – Kabelkanal / eingebettet"  },
  { wert: "C",  label: "C  – Aufputz / Wand"            },
  { wert: "E",  label: "E  – Freiluft / Kabelrinne"     },
];

const KAPPA = { Cu: 56, Al: 35 };
const U_N   = { "1P": 230, "3P": 400 };
const FAKTOR = { "1P": 2, "3P": Math.sqrt(3) };
const DU_MAX = 3; // % Spannungsfall max (VDE 0100-520)

function berechne({ strom, laenge, verlegeart, material, phasen, cosphy }) {
  const I = parseFloat(strom);
  const L = parseFloat(laenge);
  const cosPhi = parseFloat(cosphy) || 1;
  if (!I || !L || I <= 0 || L <= 0) return null;

  const kappa  = KAPPA[material];
  const UN     = U_N[phasen];
  const fak    = FAKTOR[phasen];
  const duZul  = (DU_MAX / 100) * UN; // max erlaubter Spannungsabfall in V

  // Mindest-Querschnitt
  const aMin = (fak * I * L * cosPhi) / (kappa * duZul);

  // Nächst größere Normstufe
  const empfQs = QS_STUFEN.find(q => q >= aMin) || QS_STUFEN[QS_STUFEN.length - 1];

  // Tabelle: alle Querschnitte ab aMin
  const belastbar = material === "Cu" ? BELASTBAR_CU : BELASTBAR_AL;
  const tabelle = QS_STUFEN
    .filter(q => q >= aMin * 0.6) // zeige ab 60 % des Min-Qs
    .map(qs => {
      const du   = (fak * I * L * cosPhi) / (kappa * qs);
      const duPct = (du / UN) * 100;
      const iMax = belastbar[qs]?.[verlegeart] ?? "–";
      const lMax = Math.floor((kappa * qs * duZul) / (fak * I * cosPhi));
      return { qs, du: du.toFixed(2), duPct: duPct.toFixed(1), iMax, lMax, ok: duPct <= DU_MAX && (iMax === "–" || I <= iMax) };
    });

  return { aMin: aMin.toFixed(3), empfQs, tabelle, duZul };
}

// ── Eingabe-Stil ────────────────────────────────────────────────────────────
const inp = (extra = {}) => ({
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text)", padding: "9px 12px", fontSize: 14, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", ...extra,
});

// ══════════════════════════════════════════════════════════════════════════════
export default function Leitungsberechnung() {
  const [strom,      setStrom]      = useState("");
  const [laenge,     setLaenge]     = useState("");
  const [verlegeart, setVerlegeart] = useState("B1");
  const [material,   setMaterial]   = useState("Cu");
  const [phasen,     setPhasen]     = useState("1P");
  const [cosphy,     setCosphy]     = useState("1");

  const ergebnis = berechne({ strom, laenge, verlegeart, material, phasen, cosphy });

  return (
    <div style={{ padding: "20px 16px", maxWidth: 860, margin: "0 auto", color: "var(--text)" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f97316" }}>📐 Leitungsberechnung</h2>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          Querschnittsempfehlung nach VDE 0100-520 · ΔU ≤ 3 %
        </div>
      </div>

      {/* Eingaben */}
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "20px 24px", marginBottom: 20,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <label>
            <div style={lbl}>Strom I (A)</div>
            <input
              type="number" min="0" step="0.1"
              value={strom} onChange={e => setStrom(e.target.value)}
              placeholder="z.B. 16"
              style={inp({ width: "100%" })}
            />
          </label>

          <label>
            <div style={lbl}>Leitungslänge L (m)</div>
            <input
              type="number" min="0" step="1"
              value={laenge} onChange={e => setLaenge(e.target.value)}
              placeholder="z.B. 25"
              style={inp({ width: "100%" })}
            />
          </label>

          <label>
            <div style={lbl}>Verlegeart</div>
            <select value={verlegeart} onChange={e => setVerlegeart(e.target.value)} style={inp({ width: "100%" })}>
              {VERLEGEARTEN.map(v => <option key={v.wert} value={v.wert}>{v.label}</option>)}
            </select>
          </label>

          <label>
            <div style={lbl}>Material</div>
            <select value={material} onChange={e => setMaterial(e.target.value)} style={inp({ width: "100%" })}>
              <option value="Cu">Kupfer (Cu)  κ = 56</option>
              <option value="Al">Aluminium (Al)  κ = 35</option>
            </select>
          </label>

          <label>
            <div style={lbl}>Phasenzahl</div>
            <select value={phasen} onChange={e => setPhasen(e.target.value)} style={inp({ width: "100%" })}>
              <option value="1P">Einphasig (230 V)</option>
              <option value="3P">Drehstrom (400 V)</option>
            </select>
          </label>

          <label>
            <div style={lbl}>cos φ</div>
            <select value={cosphy} onChange={e => setCosphy(e.target.value)} style={inp({ width: "100%" })}>
              <option value="1">1,0 — Ohmsche Last</option>
              <option value="0.95">0,95</option>
              <option value="0.9">0,90</option>
              <option value="0.85">0,85</option>
              <option value="0.8">0,80 — Motorlast</option>
            </select>
          </label>
        </div>
      </div>

      {/* Ergebnis */}
      {!ergebnis && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📐</div>
          <div>Strom und Länge eingeben um die Berechnung zu starten</div>
        </div>
      )}

      {ergebnis && (
        <>
          {/* Empfehlung-Box */}
          <div style={{
            background: "rgba(249,115,22,0.08)", border: "2px solid rgba(249,115,22,0.4)",
            borderRadius: 14, padding: "16px 24px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Empfohlener Mindest-Querschnitt</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#f97316", fontFamily: "var(--mono)" }}>
                {ergebnis.empfQs} mm²
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                Rechnerisch: {ergebnis.aMin} mm² · Material: {material} · {phasen === "1P" ? "Einphasig 230 V" : "Drehstrom 400 V"}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Grenzwert ΔU</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f97316" }}>{DU_MAX} %</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>VDE 0100-520</div>
            </div>
          </div>

          {/* Tabelle */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>
              Querschnittsvergleich · Verlegeart {verlegeart} · {material}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)" }}>
                    <th style={th()}>Querschnitt</th>
                    <th style={th()}>Spannungsfall</th>
                    <th style={th()}>ΔU %</th>
                    <th style={th()}>Max. Strom ({verlegeart})</th>
                    <th style={th()}>Max. Länge</th>
                    <th style={th()}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ergebnis.tabelle.map(row => {
                    const isEmpf = row.qs === ergebnis.empfQs;
                    return (
                      <tr key={row.qs} style={{
                        background: isEmpf ? "rgba(249,115,22,0.08)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                      }}>
                        <td style={td(isEmpf ? "#f97316" : "var(--text)", true)}>
                          {row.qs} mm²
                          {isEmpf && <span style={{ marginLeft: 6, fontSize: 11, background: "#f97316", color: "#000", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>Empfohlen</span>}
                        </td>
                        <td style={td()}>{row.du} V</td>
                        <td style={td(parseFloat(row.duPct) > DU_MAX ? "var(--red)" : "var(--green)")}>
                          {row.duPct} %
                        </td>
                        <td style={td(typeof row.iMax === "number" && parseFloat(strom) > row.iMax ? "var(--red)" : "var(--text)")}>
                          {row.iMax} A
                        </td>
                        <td style={td()}>{row.lMax} m</td>
                        <td style={td()}>
                          {row.ok
                            ? <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ OK</span>
                            : <span style={{ color: "var(--red)", fontWeight: 700 }}>✗ Überschreitung</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formel-Info */}
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
            <strong>Formeln:</strong> ΔU = {phasen === "1P" ? "2 × I × L × cos φ / (κ × A)" : "√3 × I × L × cos φ / (κ × A)"}
            · κ({material}) = {KAPPA[material]} m/(Ω·mm²) · U_N = {U_N[phasen]} V
            · Grenzwert ΔU ≤ {DU_MAX} % nach VDE 0100-520 (Hausinstallation)
          </div>
        </>
      )}
    </div>
  );
}

const lbl = { fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };

function th(extra = {}) {
  return {
    padding: "10px 16px", textAlign: "left", fontWeight: 700,
    color: "var(--text3)", fontSize: 12, whiteSpace: "nowrap", ...extra,
  };
}

function td(color = "var(--text)", bold = false) {
  return { padding: "10px 16px", color, fontWeight: bold ? 700 : 400, whiteSpace: "nowrap" };
}
