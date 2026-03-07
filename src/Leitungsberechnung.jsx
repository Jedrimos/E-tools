/**
 * Elektrorechner – Formelsammlung und Rechner für Elektrofachkräfte
 *
 * Tabs:
 *  1. Leitungsberechnung  — Querschnitt nach VDE 0100-520
 *  2. Strom & Leistung    — P/U/I/cosφ, 1P + 3P, S, Q
 *  3. Motorstrom          — Nennstrom, Anlaufstrom, Sicherung
 *  4. cos φ Korrektur     — Blindleistungskompensation, Kondensatorgröße
 *  5. Formelsammlung      — Referenz
 */

import React, { useState } from "react";

// ── Gemeinsame Stile ────────────────────────────────────────────────────────
const AKZENT = "#f97316";

const inp = (extra = {}) => ({
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text)", padding: "9px 12px", fontSize: 14, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", ...extra,
});

const lbl = {
  fontSize: 12, color: "var(--text3)", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
};

const card = (extra = {}) => ({
  background: "var(--bg2)", border: "1px solid var(--border)",
  borderRadius: 14, padding: "20px 24px", ...extra,
});

const resultBox = (color = AKZENT) => ({
  background: `${color}12`, border: `2px solid ${color}40`,
  borderRadius: 14, padding: "16px 24px", marginBottom: 20,
});

function Row({ label, value, unit, color, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--text3)" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: color || "var(--text)", fontFamily: mono ? "var(--mono)" : "inherit" }}>
        {value} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text3)" }}>{unit}</span>
      </span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, marginBottom: 10, marginTop: 20 }}>
      {children}
    </div>
  );
}

function NumInput({ label, value, onChange, placeholder, unit, step = "0.1", min = "0" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={lbl}>{label}{unit ? <span style={{ fontWeight: 400, marginLeft: 4, textTransform: "none" }}>({unit})</span> : ""}</div>
      <input type="number" min={min} step={step} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp({ width: "100%" })} />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={lbl}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={inp({ width: "100%" })}>
        {options.map(o => <option key={o.wert ?? o} value={o.wert ?? o}>{o.label ?? o}</option>)}
      </select>
    </label>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1: Leitungsberechnung
// ══════════════════════════════════════════════════════════════════════════════

const QS_STUFEN = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
const KAPPA = { Cu: 56, Al: 35 };
const U_N   = { "1P": 230, "3P": 400 };
const FAKTOR = { "1P": 2, "3P": Math.sqrt(3) };
const DU_MAX = 3;

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
const BELASTBAR_AL = Object.fromEntries(
  Object.entries(BELASTBAR_CU).map(([qs, v]) => [qs, Object.fromEntries(Object.entries(v).map(([t, a]) => [t, Math.round(a * 0.78)]))])
);

const VERLEGEARTEN = [
  { wert: "B1", label: "B1 – Rohr im Mauerwerk / Wand" },
  { wert: "B2", label: "B2 – Kabelkanal / eingebettet"  },
  { wert: "C",  label: "C  – Aufputz / Wand"            },
  { wert: "E",  label: "E  – Freiluft / Kabelrinne"     },
];

function berechneLtg({ strom, laenge, verlegeart, material, phasen, cosphy }) {
  const I = parseFloat(strom), L = parseFloat(laenge), cosPhi = parseFloat(cosphy) || 1;
  if (!I || !L || I <= 0 || L <= 0) return null;
  const kappa = KAPPA[material], UN = U_N[phasen], fak = FAKTOR[phasen];
  const duZul = (DU_MAX / 100) * UN;
  const aMin = (fak * I * L * cosPhi) / (kappa * duZul);
  const empfQs = QS_STUFEN.find(q => q >= aMin) || QS_STUFEN[QS_STUFEN.length - 1];
  const belastbar = material === "Cu" ? BELASTBAR_CU : BELASTBAR_AL;
  const tabelle = QS_STUFEN.filter(q => q >= aMin * 0.6).map(qs => {
    const du = (fak * I * L * cosPhi) / (kappa * qs);
    const duPct = (du / UN) * 100;
    const iMax = belastbar[qs]?.[verlegeart] ?? "–";
    const lMax = Math.floor((kappa * qs * duZul) / (fak * I * cosPhi));
    return { qs, du: du.toFixed(2), duPct: duPct.toFixed(1), iMax, lMax, ok: duPct <= DU_MAX && (iMax === "–" || I <= iMax) };
  });
  return { aMin: aMin.toFixed(3), empfQs, tabelle };
}

function TabLeitungsberechnung() {
  const [strom, setStrom]           = useState("");
  const [laenge, setLaenge]         = useState("");
  const [verlegeart, setVerlegeart] = useState("B1");
  const [material, setMaterial]     = useState("Cu");
  const [phasen, setPhasen]         = useState("1P");
  const [cosphy, setCosphy]         = useState("1");

  const erg = berechneLtg({ strom, laenge, verlegeart, material, phasen, cosphy });

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Mindest-Querschnitt und Spannungsfall nach VDE 0100-520 · ΔU ≤ 3 %
      </div>
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <NumInput label="Strom I" unit="A" value={strom} onChange={setStrom} placeholder="z.B. 16" />
          <NumInput label="Länge L" unit="m" value={laenge} onChange={setLaenge} placeholder="z.B. 25" step="1" />
          <SelectInput label="Verlegeart" value={verlegeart} onChange={setVerlegeart} options={VERLEGEARTEN} />
          <SelectInput label="Material" value={material} onChange={setMaterial} options={[{ wert: "Cu", label: "Kupfer (Cu) κ=56" }, { wert: "Al", label: "Aluminium (Al) κ=35" }]} />
          <SelectInput label="Phasenzahl" value={phasen} onChange={setPhasen} options={[{ wert: "1P", label: "Einphasig 230 V" }, { wert: "3P", label: "Drehstrom 400 V" }]} />
          <SelectInput label="cos φ" value={cosphy} onChange={setCosphy} options={[{ wert: "1", label: "1,0 — Ohmsche Last" }, { wert: "0.95", label: "0,95" }, { wert: "0.9", label: "0,90" }, { wert: "0.85", label: "0,85" }, { wert: "0.8", label: "0,80 — Motorlast" }]} />
        </div>
      </div>

      {!erg ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)" }}>Strom und Länge eingeben um die Berechnung zu starten</div>
      ) : (
        <>
          <div style={resultBox()}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Empfohlener Mindest-Querschnitt</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: AKZENT, fontFamily: "var(--mono)" }}>{erg.empfQs} mm²</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  Rechnerisch: {erg.aMin} mm² · {material} · {phasen === "1P" ? "230 V" : "400 V"}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Max. ΔU</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: AKZENT }}>{DU_MAX} %</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>VDE 0100-520</div>
              </div>
            </div>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>
              Querschnittsvergleich · {verlegeart} · {material}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)" }}>
                    {["Querschnitt", "ΔU (V)", "ΔU %", `I_max (${verlegeart})`, "L_max", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text3)", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {erg.tabelle.map(row => {
                    const isEmpf = row.qs === erg.empfQs;
                    return (
                      <tr key={row.qs} style={{ background: isEmpf ? "rgba(249,115,22,0.08)" : "transparent", borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px", color: isEmpf ? AKZENT : "var(--text)", fontWeight: isEmpf ? 700 : 400, whiteSpace: "nowrap" }}>
                          {row.qs} mm²
                          {isEmpf && <span style={{ marginLeft: 6, fontSize: 10, background: AKZENT, color: "#000", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>Empfohlen</span>}
                        </td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.du} V</td>
                        <td style={{ padding: "10px 16px", color: parseFloat(row.duPct) > DU_MAX ? "var(--red)" : "var(--green)", fontWeight: 600, whiteSpace: "nowrap" }}>{row.duPct} %</td>
                        <td style={{ padding: "10px 16px", color: typeof row.iMax === "number" && parseFloat(strom) > row.iMax ? "var(--red)" : "var(--text)", whiteSpace: "nowrap" }}>{row.iMax} A</td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>{row.lMax} m</td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                          {row.ok ? <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ OK</span> : <span style={{ color: "var(--red)", fontWeight: 700 }}>✗ Überschr.</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            ΔU = {phasen === "1P" ? "2" : "√3"} × I × L × cosφ / (κ × A) · κ({material}) = {KAPPA[material]} m/(Ω·mm²)
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2: Strom & Leistung
// ══════════════════════════════════════════════════════════════════════════════

function berechnePower({ solveFor, p, u, i, cosPhi, phasen }) {
  const P = parseFloat(p) * 1000; // kW → W
  const U = parseFloat(u);
  const I = parseFloat(i);
  const cos = parseFloat(cosPhi) || 1;
  const fak = phasen === "3P" ? Math.sqrt(3) : 1;
  const UN = phasen === "3P" ? 400 : 230;

  let res = {};

  if (solveFor === "P" && !isNaN(U) && !isNaN(I) && U > 0 && I > 0) {
    res.P = fak * U * I * cos;
    res.U = U; res.I = I;
  } else if (solveFor === "I" && !isNaN(P) && !isNaN(U) && P > 0 && U > 0) {
    res.P = P; res.U = U;
    res.I = P / (fak * U * cos);
  } else if (solveFor === "U" && !isNaN(P) && !isNaN(I) && P > 0 && I > 0) {
    res.P = P; res.I = I;
    res.U = P / (fak * I * cos);
  } else {
    return null;
  }

  const sinPhi = Math.sqrt(1 - cos * cos);
  res.S = res.P / cos;           // VA
  res.Q = res.S * sinPhi;        // VAr
  res.cosPhi = cos;
  res.phasen = phasen;
  return res;
}

function TabStromLeistung() {
  const [solveFor, setSolveFor] = useState("I");
  const [phasen, setPhasen]     = useState("1P");
  const [p, setP]               = useState("");
  const [u, setU]               = useState("");
  const [i, setI]               = useState("");
  const [cosPhi, setCosPhi]     = useState("1");

  // Ohm's law section
  const [ohmSolve, setOhmSolve] = useState("R");
  const [ohmU, setOhmU] = useState("");
  const [ohmI, setOhmI] = useState("");
  const [ohmR, setOhmR] = useState("");

  const erg = berechnePower({ solveFor, p, u, i, cosPhi, phasen });

  function ohmResult() {
    const U = parseFloat(ohmU), I = parseFloat(ohmI), R = parseFloat(ohmR);
    if (ohmSolve === "R" && !isNaN(U) && !isNaN(I) && I !== 0) return { R: (U / I).toFixed(4), U, I };
    if (ohmSolve === "U" && !isNaN(I) && !isNaN(R)) return { U: (I * R).toFixed(3), I, R };
    if (ohmSolve === "I" && !isNaN(U) && !isNaN(R) && R !== 0) return { I: (U / R).toFixed(4), U, R };
    return null;
  }
  const ohm = ohmResult();

  return (
    <div>
      {/* Leistungsrechner */}
      <SectionTitle>Leistungsrechner · {phasen === "1P" ? "Einphasig (230 V)" : "Drehstrom (400 V)"}</SectionTitle>
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 16 }}>
          <SelectInput label="Gesucht" value={solveFor} onChange={setSolveFor} options={[{ wert: "I", label: "Strom I (A)" }, { wert: "P", label: "Leistung P (kW)" }, { wert: "U", label: "Spannung U (V)" }]} />
          <SelectInput label="Phasenzahl" value={phasen} onChange={setPhasen} options={[{ wert: "1P", label: "Einphasig 230 V" }, { wert: "3P", label: "Drehstrom 400 V" }]} />
          <SelectInput label="cos φ" value={cosPhi} onChange={setCosPhi} options={[
            { wert: "1",    label: "1,00 — Ohmsche Last"  },
            { wert: "0.95", label: "0,95 — Heizung, LED"  },
            { wert: "0.9",  label: "0,90"                  },
            { wert: "0.85", label: "0,85"                  },
            { wert: "0.8",  label: "0,80 — Motorlast"     },
          ]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {solveFor !== "P" && <NumInput label="Wirkleistung P" unit="kW" value={p} onChange={setP} placeholder="z.B. 5.5" />}
          {solveFor !== "U" && <NumInput label="Spannung U" unit="V" value={u} onChange={setU} placeholder={phasen === "3P" ? "400" : "230"} />}
          {solveFor !== "I" && <NumInput label="Strom I" unit="A" value={i} onChange={setI} placeholder="z.B. 16" />}
        </div>
      </div>

      {erg ? (
        <div style={resultBox()}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            {[
              { label: "Wirkleistung P", value: (erg.P / 1000).toFixed(3), unit: "kW" },
              { label: "Strom I",        value: erg.I.toFixed(2),           unit: "A"  },
              { label: "Spannung U",     value: erg.U.toFixed(1),           unit: "V"  },
              { label: "Scheinleistung S", value: (erg.S / 1000).toFixed(3), unit: "kVA" },
              { label: "Blindleistung Q",  value: (erg.Q / 1000).toFixed(3), unit: "kVAr" },
              { label: "cos φ",          value: erg.cosPhi,                  unit: ""   },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: AKZENT, fontFamily: "var(--mono)" }}>
                  {value} <span style={{ fontSize: 13, fontWeight: 400 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)" }}>
            {erg.phasen === "1P" ? "P = U × I × cosφ" : "P = √3 × U × I × cosφ"}
            {" · "}S = P / cosφ{" · "}Q = S × sinφ
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text3)", fontSize: 13 }}>Fehlende Werte eingeben</div>
      )}

      {/* Ohmsches Gesetz */}
      <SectionTitle>Ohmsches Gesetz · U = R × I</SectionTitle>
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <SelectInput label="Gesucht" value={ohmSolve} onChange={setOhmSolve} options={[{ wert: "R", label: "Widerstand R (Ω)" }, { wert: "U", label: "Spannung U (V)" }, { wert: "I", label: "Strom I (A)" }]} />
          {ohmSolve !== "U" && <NumInput label="Spannung U" unit="V" value={ohmU} onChange={setOhmU} placeholder="z.B. 230" />}
          {ohmSolve !== "I" && <NumInput label="Strom I" unit="A" value={ohmI} onChange={setOhmI} placeholder="z.B. 2.5" />}
          {ohmSolve !== "R" && <NumInput label="Widerstand R" unit="Ω" value={ohmR} onChange={setOhmR} placeholder="z.B. 92" />}
        </div>
      </div>
      {ohm && (
        <div style={resultBox()}>
          <Row label={ohmSolve === "R" ? "Widerstand R" : ohmSolve === "U" ? "Spannung U" : "Strom I"}
            value={ohmSolve === "R" ? ohm.R : ohmSolve === "U" ? ohm.U : ohm.I}
            unit={ohmSolve === "R" ? "Ω" : ohmSolve === "U" ? "V" : "A"}
            color={AKZENT} mono />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3: Motorstrom
// ══════════════════════════════════════════════════════════════════════════════

// LSS-Nennstufen (empfohlene Sicherungsgrößen)
const LSS_STUFEN = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];

function lssEmpfehlung(i) {
  return LSS_STUFEN.find(s => s >= i * 1.25) ?? null; // LSS ≥ 1,25 × I_nenn
}

function TabMotor() {
  const [p,       setP]       = useState("");  // kW
  const [u,       setU]       = useState("400");
  const [cosPhi,  setCosPhi]  = useState("0.85");
  const [eta,     setEta]     = useState("90"); // % Wirkungsgrad
  const [faktor,  setFaktor]  = useState("6");  // Anlaufstrom-Faktor

  const P = parseFloat(p) * 1000;
  const U = parseFloat(u);
  const cos = parseFloat(cosPhi);
  const n = parseFloat(eta) / 100;
  const fak = parseFloat(faktor);
  const valid = P > 0 && U > 0 && cos > 0 && n > 0;

  const iNenn    = valid ? P / (Math.sqrt(3) * U * cos * n) : null;
  const iAnlauf  = iNenn ? iNenn * fak : null;
  const iSchutz  = iNenn ? lssEmpfehlung(iNenn) : null;

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Nennstrom und Anlaufstrom für Drehstrommotoren · I = P / (√3 × U × cosφ × η)
      </div>
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <NumInput label="Nennleistung P" unit="kW" value={p} onChange={setP} placeholder="z.B. 5.5" />
          <NumInput label="Nennspannung U" unit="V" value={u} onChange={setU} placeholder="400" step="1" />
          <SelectInput label="cos φ (Leistungsfaktor)" value={cosPhi} onChange={setCosPhi} options={[
            { wert: "0.95", label: "0,95" },
            { wert: "0.9",  label: "0,90" },
            { wert: "0.85", label: "0,85 — typisch" },
            { wert: "0.8",  label: "0,80" },
            { wert: "0.75", label: "0,75" },
          ]} />
          <NumInput label="Wirkungsgrad η" unit="%" value={eta} onChange={setEta} placeholder="90" step="1" min="1" />
          <SelectInput label="Anlaufstrom-Faktor" value={faktor} onChange={setFaktor} options={[
            { wert: "5", label: "5 × I_n (DOL klein)" },
            { wert: "6", label: "6 × I_n (DOL typisch)" },
            { wert: "7", label: "7 × I_n (DOL groß)" },
            { wert: "8", label: "8 × I_n (DOL schwer)" },
            { wert: "2", label: "2 × I_n (Stern-Dreieck / FU)" },
          ]} />
        </div>
      </div>

      {iNenn ? (
        <div style={resultBox()}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Nennstrom I_n",    value: iNenn.toFixed(2),   unit: "A",   color: AKZENT },
              { label: "Anlaufstrom I_a",  value: iAnlauf.toFixed(1), unit: "A",   color: "#f59e0b" },
              { label: "Empf. Sicherung",  value: iSchutz ?? "≥ 125", unit: "A",   color: "var(--green)" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "var(--mono)" }}>
                  {value} <span style={{ fontSize: 13, fontWeight: 400 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <Row label="Leitungsquerschnitt (Richtwert B1, Cu)" value={QS_STUFEN.find(q => BELASTBAR_CU[q]?.B1 >= iNenn) ?? "≥ 120"} unit="mm²" />
            <Row label="Anlaufstrom-Faktor" value={`${faktor} × ${iNenn.toFixed(2)} A`} unit="" />
            <Row label="Formel" value={`P / (√3 × U × cosφ × η) = ${p} kW / (√3 × ${u} V × ${cosPhi} × ${(n).toFixed(2)})`} unit="" />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text3)", fontSize: 13 }}>Werte eingeben um Motorstrom zu berechnen</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4: cos φ Korrektur / Blindleistungskompensation
// ══════════════════════════════════════════════════════════════════════════════

function TabKompensation() {
  const [p,       setP]       = useState("");   // kW
  const [cosIst,  setCosIst]  = useState("0.7");
  const [cosSoll, setCosSoll] = useState("0.95");
  const [u,       setU]       = useState("400"); // V (3P = 400 V, 1P = 230 V)
  const [f,       setF]       = useState("50");  // Hz

  const P = parseFloat(p) * 1000;
  const c1 = parseFloat(cosIst);
  const c2 = parseFloat(cosSoll);
  const U = parseFloat(u);
  const freq = parseFloat(f);
  const valid = P > 0 && c1 > 0 && c2 > 0 && U > 0 && freq > 0 && c1 < c2;

  const phi1 = valid ? Math.acos(c1) : 0;
  const phi2 = valid ? Math.acos(c2) : 0;
  const Qc   = valid ? P * (Math.tan(phi1) - Math.tan(phi2)) : 0; // VAr
  const C    = valid ? (Qc * 1000) / (2 * Math.PI * freq * U * U) * 1e6 : 0; // µF
  const Ired = valid ? (P / (Math.sqrt(3) * U)) * (1 / c1 - 1 / c2) : 0; // A gespart

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Benötigte Kondensatorleistung zur Blindleistungskompensation · Q_C = P × (tan φ₁ − tan φ₂)
      </div>
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <NumInput label="Wirkleistung P" unit="kW" value={p} onChange={setP} placeholder="z.B. 10" />
          <SelectInput label="cos φ IST (aktuell)" value={cosIst} onChange={setCosIst} options={[
            { wert: "0.5",  label: "0,50" }, { wert: "0.6",  label: "0,60" },
            { wert: "0.65", label: "0,65" }, { wert: "0.7",  label: "0,70" },
            { wert: "0.75", label: "0,75" }, { wert: "0.8",  label: "0,80" },
            { wert: "0.85", label: "0,85" }, { wert: "0.9",  label: "0,90" },
          ]} />
          <SelectInput label="cos φ SOLL (Ziel)" value={cosSoll} onChange={setCosSoll} options={[
            { wert: "0.9",  label: "0,90" }, { wert: "0.92", label: "0,92" },
            { wert: "0.95", label: "0,95 — EVU-Forderung" },
            { wert: "0.97", label: "0,97" }, { wert: "1",    label: "1,00" },
          ]} />
          <NumInput label="Netzspannung U" unit="V" value={u} onChange={setU} placeholder="400" step="1" />
          <SelectInput label="Netzfrequenz" value={f} onChange={setF} options={[{ wert: "50", label: "50 Hz (Europa)" }, { wert: "60", label: "60 Hz (USA)" }]} />
        </div>
        {parseFloat(cosIst) >= parseFloat(cosSoll) && <div style={{ marginTop: 12, color: "#f59e0b", fontSize: 12 }}>⚠ cos φ IST muss kleiner als cos φ SOLL sein</div>}
      </div>

      {valid ? (
        <div style={resultBox()}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Blindleistung Q_C",  value: (Qc / 1000).toFixed(2), unit: "kVAr", color: AKZENT },
              { label: "Kondensator C",       value: C.toFixed(1),           unit: "µF",   color: "#a855f7" },
              { label: "Stromeinsparung ΔI",  value: Ired.toFixed(2),        unit: "A",    color: "var(--green)" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "var(--mono)" }}>
                  {value} <span style={{ fontSize: 13, fontWeight: 400 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <Row label="Bisherige Scheinleistung S₁" value={(P / 1000 / c1).toFixed(2)} unit="kVA" />
            <Row label="Neue Scheinleistung S₂" value={(P / 1000 / c2).toFixed(2)} unit="kVA" />
            <Row label="Formel" value="Q_C = P × (tan φ₁ − tan φ₂)" unit="" />
            <Row label="Kondensator" value={`C = Q_C × 1000 / (2π × f × U²) = ${C.toFixed(1)} µF`} unit="" />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text3)", fontSize: 13 }}>Werte eingeben (cos φ IST muss kleiner sein als cos φ SOLL)</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 5: Abstandsrechner
// ══════════════════════════════════════════════════════════════════════════════

// Befestigungsabstände nach VDE 0100-520 / DIN VDE 0298
const BEFESTIGUNG_REF = [
  { typ: "NYM-J (Mantelleitung)",        horiz: 25,  vert: 40,  norm: "VDE 0100-520" },
  { typ: "NYY / NAYY (Erdkabel)",        horiz: 40,  vert: 80,  norm: "VDE 0100-520" },
  { typ: "H07V-K (Aderleitung, flex.)",  horiz: 25,  vert: 40,  norm: "VDE 0298-4"   },
  { typ: "Rohr starr (PVC/Metall)",      horiz: 80,  vert: 100, norm: "DIN EN 61386"  },
  { typ: "Rohr flexibel (Wellrohr)",     horiz: 50,  vert: 80,  norm: "DIN EN 61386"  },
  { typ: "Kabelkanal (Installationskanal)", horiz: 80, vert: 80, norm: "DIN EN 50085" },
  { typ: "Datenkabel (CAT, LWL)",        horiz: 40,  vert: 60,  norm: "VDE 0800"      },
];

function berechneAbstand({ laenge, anzahl, modus, wandabstand }) {
  const L = parseFloat(laenge);
  const N = parseInt(anzahl, 10);
  const d = parseFloat(wandabstand) || 0;
  if (!L || L <= 0 || !N || N < 1) return null;

  let abstand, wandOffset, positionen;

  if (modus === "sym") {
    // Gleichmäßig inkl. Randabstand: spacing = L / (N+1)
    abstand = L / (N + 1);
    wandOffset = abstand;
    positionen = Array.from({ length: N }, (_, i) => wandOffset + i * abstand);
  } else if (modus === "rand") {
    // Wand zu Wand: erstes und letztes Objekt an der Wand
    if (N < 2) {
      abstand = 0;
      wandOffset = 0;
      positionen = [0];
    } else {
      abstand = L / (N - 1);
      wandOffset = 0;
      positionen = Array.from({ length: N }, (_, i) => i * abstand);
    }
  } else {
    // Freier Wandabstand: Objekte mit d Abstand von Wand, Rest gleichmäßig verteilt
    if (d * 2 >= L) return null;
    if (N === 1) {
      positionen = [L / 2];
      abstand = 0;
      wandOffset = d;
    } else {
      abstand = (L - 2 * d) / (N - 1);
      wandOffset = d;
      positionen = Array.from({ length: N }, (_, i) => d + i * abstand);
    }
  }

  return { abstand, wandOffset, positionen, L, N };
}

function AbstandSVG({ erg, einheit }) {
  if (!erg) return null;
  const { positionen, L } = erg;
  const W = 560, H = 110, pad = 30;
  const scale = (W - 2 * pad) / L;

  const x = p => pad + p * scale;
  const BLAU = AKZENT;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block", overflow: "visible" }}>
      {/* Wände */}
      <line x1={pad} y1={30} x2={pad} y2={80} stroke="var(--text2)" strokeWidth="3" />
      <line x1={W - pad} y1={30} x2={W - pad} y2={80} stroke="var(--text2)" strokeWidth="3" />
      {/* Boden-Linie */}
      <line x1={pad} y1={55} x2={W - pad} y2={55} stroke="var(--border)" strokeWidth="1.5" />
      {/* Gesamt-Länge-Label */}
      <text x={W / 2} y={100} textAnchor="middle" fontSize="11" fill="var(--text3)">
        Gesamt: {L} {einheit}
      </text>

      {/* Objekte */}
      {positionen.map((p, i) => {
        const cx = x(p);
        const isFirst = i === 0, isLast = i === positionen.length - 1;
        return (
          <g key={i}>
            <circle cx={cx} cy={55} r={10} fill={BLAU} opacity="0.9" />
            <text x={cx} y={59} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">{i + 1}</text>
            {/* Wandabstand erstes/letztes */}
            {isFirst && p > 0.01 && (
              <>
                <line x1={pad} y1={20} x2={cx} y2={20} stroke={BLAU} strokeWidth="1" markerEnd="url(#arr)" markerStart="url(#arr)" />
                <text x={(pad + cx) / 2} y={15} textAnchor="middle" fontSize="10" fill={BLAU}>{p.toFixed(2)} {einheit}</text>
              </>
            )}
            {isLast && L - p > 0.01 && (
              <>
                <line x1={cx} y1={20} x2={W - pad} y2={20} stroke={BLAU} strokeWidth="1" />
                <text x={(cx + W - pad) / 2} y={15} textAnchor="middle" fontSize="10" fill={BLAU}>{(L - p).toFixed(2)} {einheit}</text>
              </>
            )}
          </g>
        );
      })}

      {/* Abstands-Labels zwischen je zwei Objekten */}
      {positionen.length > 1 && positionen.slice(0, -1).map((p, i) => {
        const cx1 = x(p), cx2 = x(positionen[i + 1]);
        const mid = (cx1 + cx2) / 2;
        const d = positionen[i + 1] - p;
        return (
          <g key={`sp${i}`}>
            <line x1={cx1 + 11} y1={70} x2={cx2 - 11} y2={70} stroke="var(--text3)" strokeWidth="1" strokeDasharray="3,2" />
            <text x={mid} y={84} textAnchor="middle" fontSize="10" fill="var(--text2)">{d.toFixed(2)} {einheit}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TabAbstandsrechner() {
  const [laenge,      setLaenge]      = useState("");
  const [anzahl,      setAnzahl]      = useState("3");
  const [modus,       setModus]       = useState("sym");
  const [wandabstand, setWandabstand] = useState("0.5");
  const [einheit,     setEinheit]     = useState("m");
  const [objekt,      setObjekt]      = useState("Lampe");

  const erg = berechneAbstand({ laenge, anzahl, modus, wandabstand });

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Gleichmäßige Verteilung von Objekten auf einer Strecke (Lampen, Rohrschellen, Steckdosen …)
      </div>

      {/* Eingaben */}
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <NumInput label="Gesamtlänge / Raummaß" unit={einheit} value={laenge} onChange={setLaenge} placeholder="z.B. 5.4" />
          <NumInput label="Anzahl Objekte" unit="Stück" value={anzahl} onChange={setAnzahl} placeholder="z.B. 3" step="1" min="1" />
          <SelectInput label="Einheit" value={einheit} onChange={setEinheit} options={[{ wert: "m", label: "Meter (m)" }, { wert: "cm", label: "Zentimeter (cm)" }]} />
          <SelectInput label="Verteilungs-Modus" value={modus} onChange={setModus} options={[
            { wert: "sym",  label: "Gleichmäßig inkl. Randabstand" },
            { wert: "rand", label: "Wand zu Wand (erstes/letztes an Wand)" },
            { wert: "frei", label: "Frei — Wandabstand vorgeben" },
          ]} />
          {modus === "frei" && (
            <NumInput label="Wandabstand" unit={einheit} value={wandabstand} onChange={setWandabstand} placeholder="z.B. 0.5" />
          )}
          <SelectInput label="Objekt-Bezeichnung" value={objekt} onChange={setObjekt} options={["Lampe", "Rohrschelle", "Steckdose", "Leuchte", "Befestigung", "Dübel"].map(o => ({ wert: o, label: o }))} />
        </div>
      </div>

      {/* Ergebnis */}
      {!erg && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text3)", fontSize: 13 }}>
          Gesamtlänge und Anzahl eingeben
        </div>
      )}

      {erg && (
        <>
          {/* Kennwerte */}
          <div style={resultBox()}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                { label: `Abstand zwischen ${objekt}n`, value: erg.abstand > 0 ? erg.abstand.toFixed(3) : "–", unit: einheit, color: AKZENT },
                { label: "Wandabstand (Rand)", value: erg.wandOffset > 0 ? erg.wandOffset.toFixed(3) : "0", unit: einheit, color: "var(--text2)" },
                { label: "Anzahl Objekte", value: erg.N, unit: "Stk.", color: "var(--text2)" },
              ].map(({ label, value, unit, color }) => (
                <div key={label} style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "var(--mono)" }}>
                    {value} <span style={{ fontSize: 12, fontWeight: 400 }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SVG-Visualisierung */}
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: "16px 8px", marginBottom: 12 }}>
              <AbstandSVG erg={erg} einheit={einheit} />
            </div>

            {/* Positions-Liste */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Positionen ab linker Wand
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {erg.positionen.map((p, i) => (
                  <div key={i} style={{
                    background: "var(--bg3)", border: `1px solid ${AKZENT}40`, borderRadius: 8,
                    padding: "5px 12px", fontSize: 13,
                  }}>
                    <span style={{ color: "var(--text3)", fontSize: 11 }}>{objekt} {i + 1}: </span>
                    <span style={{ fontWeight: 700, color: AKZENT, fontFamily: "var(--mono)" }}>{p.toFixed(3)} {einheit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modi-Erklärung */}
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 20 }}>
            {modus === "sym" && `Abstand = Gesamtlänge / (Anzahl + 1) = ${laenge} / (${anzahl} + 1) = ${erg.abstand.toFixed(3)} ${einheit}`}
            {modus === "rand" && parseInt(anzahl) >= 2 && `Abstand = Gesamtlänge / (Anzahl − 1) = ${laenge} / (${anzahl} − 1) = ${erg.abstand.toFixed(3)} ${einheit}`}
            {modus === "frei" && `Abstand = (Gesamtlänge − 2 × Wandabstand) / (Anzahl − 1) = (${laenge} − 2 × ${wandabstand}) / (${anzahl} − 1) = ${erg.abstand.toFixed(3)} ${einheit}`}
          </div>
        </>
      )}

      {/* Referenztabelle Befestigungsabstände */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>
          Referenz: Max. Befestigungsabstände nach VDE / DIN
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg3)" }}>
                {["Leitungstyp", "Horizontal (max.)", "Vertikal (max.)", "Norm"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text3)", fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BEFESTIGUNG_REF.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 16px" }}>{row.typ}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: AKZENT, fontFamily: "var(--mono)" }}>{row.horiz} cm</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--mono)" }}>{row.vert} cm</td>
                  <td style={{ padding: "10px 16px", color: "var(--text3)", fontSize: 12 }}>{row.norm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 6: Formelsammlung
// ══════════════════════════════════════════════════════════════════════════════

const FORMELN = [
  {
    gruppe: "Ohmsches Gesetz",
    icon: "⚡",
    items: [
      { formel: "U = R × I",               einheit: "Volt",     beschr: "Spannung" },
      { formel: "I = U / R",               einheit: "Ampere",   beschr: "Strom" },
      { formel: "R = U / I",               einheit: "Ohm",      beschr: "Widerstand" },
      { formel: "P = U × I = I² × R = U²/R", einheit: "Watt", beschr: "Leistung (Gleichstrom/ohmsch)" },
    ],
  },
  {
    gruppe: "Wechselstrom (1-phasig, 230 V)",
    icon: "🔌",
    items: [
      { formel: "P = U × I × cos φ",       einheit: "W",    beschr: "Wirkleistung" },
      { formel: "S = U × I",               einheit: "VA",   beschr: "Scheinleistung" },
      { formel: "Q = U × I × sin φ",       einheit: "VAr",  beschr: "Blindleistung" },
      { formel: "I = P / (U × cos φ)",     einheit: "A",    beschr: "Strom aus Leistung" },
      { formel: "cos φ = P / S",           einheit: "–",    beschr: "Leistungsfaktor" },
      { formel: "S² = P² + Q²",           einheit: "",     beschr: "Scheinleistungs-Dreieck" },
    ],
  },
  {
    gruppe: "Drehstrom (3-phasig, 400 V)",
    icon: "🔁",
    items: [
      { formel: "P = √3 × U × I × cos φ", einheit: "W",    beschr: "Wirkleistung (U = Leiterspannung)" },
      { formel: "I = P / (√3 × U × cos φ × η)", einheit: "A", beschr: "Nennstrom Motor" },
      { formel: "U_Str = U_L / √3",       einheit: "V",    beschr: "Strangspannung ≈ 230 V" },
      { formel: "√3 ≈ 1,732",             einheit: "",     beschr: "Umrechnungsfaktor" },
    ],
  },
  {
    gruppe: "Leitungsberechnung (VDE 0100-520)",
    icon: "📏",
    items: [
      { formel: "A_min = 2 × I × L × cos φ / (κ × ΔU_zul)",   einheit: "mm²", beschr: "Mindestquerschnitt einphasig" },
      { formel: "A_min = √3 × I × L × cos φ / (κ × ΔU_zul)",  einheit: "mm²", beschr: "Mindestquerschnitt Drehstrom" },
      { formel: "ΔU_zul = 3 % × U_N",                          einheit: "V",   beschr: "Max. Spannungsfall (VDE 0100-520)" },
      { formel: "κ(Cu) = 56 m/(Ω·mm²)",                        einheit: "",    beschr: "Spezif. Leitfähigkeit Kupfer" },
      { formel: "κ(Al) = 35 m/(Ω·mm²)",                        einheit: "",    beschr: "Spezif. Leitfähigkeit Aluminium" },
      { formel: "L_max = κ × A × ΔU_zul / (Faktor × I × cos φ)", einheit: "m", beschr: "Max. Leitungslänge" },
    ],
  },
  {
    gruppe: "Blindleistungskompensation",
    icon: "🔋",
    items: [
      { formel: "Q_C = P × (tan φ₁ − tan φ₂)",     einheit: "kVAr", beschr: "Benötigte Kompensationsleistung" },
      { formel: "C = Q_C × 1000 / (2π × f × U²)",  einheit: "µF",   beschr: "Kondensatorgröße (Δ-Schaltung)" },
      { formel: "tan φ = sin φ / cos φ",             einheit: "–",    beschr: "Tangens des Phasenwinkels" },
    ],
  },
  {
    gruppe: "Schutzmaßnahmen (VDE 0100-410 / -600)",
    icon: "🛡",
    items: [
      { formel: "R_iso ≥ 1 MΩ",            einheit: "",    beschr: "Isolationswiderstand (VDE 0100-600 §61.3.3)" },
      { formel: "t(FI) ≤ 300 ms @ I_ΔN",   einheit: "",    beschr: "FI-Abschaltzeit Typ AC/A" },
      { formel: "t(FI) ≤ 500 ms @ I_ΔN",   einheit: "",    beschr: "FI-Abschaltzeit Typ S (selektiv)" },
      { formel: "t(FI) ≤ 40 ms @ 5×I_ΔN",  einheit: "",    beschr: "FI-Abschaltzeit 5-facher Nennfehlerstrom" },
      { formel: "U_B ≤ 50 V AC",            einheit: "",    beschr: "Berührungsspannung AC (trockene Räume)" },
    ],
  },
  {
    gruppe: "Nützliche Konstanten",
    icon: "📊",
    items: [
      { formel: "f = 50 Hz",               einheit: "",    beschr: "Netzfrequenz Europa" },
      { formel: "U_N = 230/400 V",         einheit: "",    beschr: "Nennspannung (Strang/Leiter)" },
      { formel: "√2 ≈ 1,414",             einheit: "",    beschr: "Scheitelwert: U_peak = √2 × U_eff" },
      { formel: "√3 ≈ 1,732",             einheit: "",    beschr: "Drehstromfaktor" },
      { formel: "1 kWh = 3,6 MJ",         einheit: "",    beschr: "Energieumrechnung" },
      { formel: "ρ(Cu) = 0,0178 Ω·mm²/m", einheit: "",    beschr: "Spez. Widerstand Kupfer bei 20 °C" },
    ],
  },
];

function TabFormeln() {
  const [offen, setOffen] = useState(new Set(["Ohmsches Gesetz", "Wechselstrom (1-phasig, 230 V)"]));

  function toggle(g) {
    setOffen(prev => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g); else n.add(g);
      return n;
    });
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Wichtigste Formeln für Elektrofachkräfte — Tippen zum Auf-/Zuklappen
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FORMELN.map(g => (
          <div key={g.gruppe} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <button
              onClick={() => toggle(g.gruppe)}
              style={{
                width: "100%", background: "none", border: "none", padding: "14px 20px",
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                color: "var(--text)", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{g.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{g.gruppe}</span>
              <span style={{ color: "var(--text3)", fontSize: 12 }}>{offen.has(g.gruppe) ? "▲" : "▼"}</span>
            </button>
            {offen.has(g.gruppe) && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "4px 0 8px" }}>
                {g.items.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "baseline", gap: 12,
                    padding: "8px 20px", borderBottom: idx < g.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <code style={{
                      background: "var(--bg)", padding: "3px 10px", borderRadius: 6, fontSize: 13,
                      color: AKZENT, fontFamily: "var(--mono)", whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {item.formel}
                    </code>
                    <span style={{ fontSize: 13, color: "var(--text2)" }}>{item.beschr}</span>
                    {item.einheit && <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: "auto", flexShrink: 0 }}>[{item.einheit}]</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Haupt-Komponente
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "ltg",      label: "Leitungsberechnung", icon: "📏" },
  { id: "power",    label: "Strom & Leistung",   icon: "⚡" },
  { id: "motor",    label: "Motorstrom",         icon: "🔁" },
  { id: "komp",     label: "cos φ Korrektur",    icon: "🔋" },
  { id: "abstand",  label: "Abstandsrechner",    icon: "📐" },
  { id: "formel",   label: "Formelsammlung",     icon: "📖" },
];

export default function Leitungsberechnung() {
  const [activeTab, setActiveTab] = useState("ltg");

  return (
    <div style={{ padding: "20px 16px", maxWidth: 920, margin: "0 auto", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: AKZENT }}>⚡ Elektrorechner</h2>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          Rechner und Formelsammlung für Elektrofachkräfte · VDE 0100 · IEC 60364
        </div>
      </div>

      {/* Tab-Bar */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24, overflowX: "auto",
        borderBottom: "1px solid var(--border)", paddingBottom: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "none", border: "none", padding: "10px 14px",
              cursor: "pointer", color: activeTab === t.id ? AKZENT : "var(--text3)",
              fontWeight: activeTab === t.id ? 700 : 400,
              fontSize: 13, display: "flex", alignItems: "center", gap: 6,
              borderBottom: `2px solid ${activeTab === t.id ? AKZENT : "transparent"}`,
              marginBottom: -1, whiteSpace: "nowrap", transition: "color 0.15s",
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "ltg"     && <TabLeitungsberechnung />}
      {activeTab === "power"   && <TabStromLeistung />}
      {activeTab === "motor"   && <TabMotor />}
      {activeTab === "komp"    && <TabKompensation />}
      {activeTab === "abstand" && <TabAbstandsrechner />}
      {activeTab === "formel"  && <TabFormeln />}
    </div>
  );
}
