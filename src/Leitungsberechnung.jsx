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
  const [wandabstand, setWandabstand] = useState("");
  const [einheit,     setEinheit]     = useState("m");
  const [objekt,      setObjekt]      = useState("Lampe");

  const erg = berechneAbstand({ laenge, anzahl, modus, wandabstand });

  const MODI = [
    {
      wert: "sym",
      icon: "↔",
      titel: "Auto-Abstand",
      beschr: "Alles gleichmäßig verteilt, Randabstand automatisch",
    },
    {
      wert: "rand",
      icon: "⇥",
      titel: "Wand zu Wand",
      beschr: "Erstes & letztes Objekt direkt an der Wand",
    },
    {
      wert: "frei",
      icon: "→◉",
      titel: "Eigener Randabstand",
      beschr: "Du gibst vor, wie weit das erste von der Wand weg ist",
    },
  ];

  const OBJEKTE = ["Lampe", "Steckdose", "Leuchte", "Rohrschelle", "Befestigung", "Dübel"];

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Gleichmäßige Verteilung von Objekten auf einer Strecke (Lampen, Rohrschellen, Steckdosen …)
      </div>

      {/* Eingaben */}
      <div style={{ ...card(), marginBottom: 16 }}>
        {/* Basis-Felder */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 18 }}>
          <NumInput label="Gesamtlänge / Raummaß" unit={einheit} value={laenge} onChange={setLaenge} placeholder="z.B. 4.60" />
          <NumInput label="Anzahl Objekte" unit="Stück" value={anzahl} onChange={setAnzahl} placeholder="3" step="1" min="1" />
          <SelectInput label="Einheit" value={einheit} onChange={setEinheit} options={[{ wert: "m", label: "Meter (m)" }, { wert: "cm", label: "Zentimeter (cm)" }]} />
        </div>

        {/* Objekt-Typ als Chip-Reihe */}
        <div style={{ marginBottom: 18 }}>
          <div style={lbl}>Objekt-Typ</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {OBJEKTE.map(o => (
              <button key={o} onClick={() => setObjekt(o)} style={{
                padding: "6px 12px", borderRadius: 20, border: `1px solid ${objekt === o ? AKZENT : "var(--border)"}`,
                background: objekt === o ? `${AKZENT}18` : "var(--bg)",
                color: objekt === o ? AKZENT : "var(--text2)", cursor: "pointer", fontSize: 12,
                fontWeight: objekt === o ? 700 : 400,
              }}>{o}</button>
            ))}
          </div>
        </div>

        {/* Modus-Wahl als sichtbare Karten */}
        <div style={lbl}>Verteilungs-Modus</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: modus === "frei" ? 14 : 0 }}>
          {MODI.map(m => (
            <button key={m.wert} onClick={() => setModus(m.wert)} style={{
              background: modus === m.wert ? `${AKZENT}18` : "var(--bg)",
              border: `2px solid ${modus === m.wert ? AKZENT : "var(--border)"}`,
              borderRadius: 10, padding: "10px 10px", cursor: "pointer", textAlign: "left",
              transition: "border-color 0.15s",
            }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{m.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: modus === m.wert ? AKZENT : "var(--text)", marginBottom: 2 }}>{m.titel}</div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.3 }}>{m.beschr}</div>
            </button>
          ))}
        </div>

        {/* Wandabstand-Eingabe nur bei "frei" */}
        {modus === "frei" && (
          <div style={{ marginTop: 14, maxWidth: 220 }}>
            <NumInput label="Abstand 1. Objekt von Wand" unit={einheit} value={wandabstand} onChange={setWandabstand} placeholder="z.B. 0.30" />
          </div>
        )}
      </div>

      {/* Ergebnis */}
      {!erg && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text3)", fontSize: 13 }}>
          Gesamtlänge und Anzahl eingeben — Ergebnis erscheint sofort
        </div>
      )}

      {erg && (
        <>
          {/* Kennwerte */}
          <div style={resultBox()}>
            {/* Formel-Zeile */}
            <div style={{ marginBottom: 14, padding: "8px 12px", background: "var(--bg)", borderRadius: 8, fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
              {modus === "sym" && `Abstand = ${laenge} / (${anzahl} + 1) = ${erg.abstand.toFixed(3)} ${einheit}`}
              {modus === "rand" && parseInt(anzahl) >= 2 && `Abstand = ${laenge} / (${anzahl} − 1) = ${erg.abstand.toFixed(3)} ${einheit}`}
              {modus === "frei" && `Abstand = (${laenge} − 2 × ${wandabstand}) / (${anzahl} − 1) = ${erg.abstand.toFixed(3)} ${einheit}`}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                { label: `Abstand zwischen ${objekt}n`, value: erg.abstand > 0 ? erg.abstand.toFixed(3) : "–", unit: einheit, color: AKZENT },
                { label: modus === "frei" ? "1. Objekt von Wand" : "Randabstand (auto)", value: erg.wandOffset > 0 ? erg.wandOffset.toFixed(3) : "0", unit: einheit, color: modus === "frei" ? AKZENT : "var(--text2)" },
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


function FormelCard({ titel, icon, formel, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "none", border: "none", padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--text)", textAlign: "left",
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{titel}</div>
          <code style={{ fontSize: 11, color: AKZENT, fontFamily: "var(--mono)" }}>{formel}</code>
        </div>
        <span style={{ color: "var(--text3)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px" }}>{children}</div>}
    </div>
  );
}

function ResultChip({ label, value, unit, color }) {
  return (
    <div style={{ textAlign: "center", background: "var(--bg)", border: `1px solid ${color || AKZENT}40`, borderRadius: 10, padding: "10px 8px", minWidth: 90 }}>
      <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || AKZENT, fontFamily: "var(--mono)" }}>
        {value}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

function MiniInput({ label, value, onChange, unit, placeholder }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 90px", minWidth: 80 }}>
      <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}{unit && ` (${unit})`}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inp({ padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box" })} />
    </label>
  );
}

function MiniSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 110px", minWidth: 100 }}>
      <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={inp({ padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box" })}>
        {options.map(o => <option key={o.wert ?? o} value={o.wert ?? o}>{o.label ?? o}</option>)}
      </select>
    </label>
  );
}

// ── Ohmsches Gesetz ─────────────────────────────────────────────────────────
function RechnerOhm() {
  const [solve, setSolve] = useState("R");
  const [u, setU] = useState(""); const [i, setI] = useState(""); const [r, setR] = useState("");
  const U = parseFloat(u), I = parseFloat(i), R = parseFloat(r);
  let erg = null;
  if (solve === "R" && U > 0 && I > 0) erg = { R: (U / I), U, I };
  else if (solve === "U" && I > 0 && R > 0) erg = { U: I * R, I, R };
  else if (solve === "I" && U > 0 && R > 0) erg = { I: U / R, U, R };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <MiniSelect label="Gesucht" value={solve} onChange={setSolve} options={[{ wert: "R", label: "R — Widerstand (Ω)" }, { wert: "U", label: "U — Spannung (V)" }, { wert: "I", label: "I — Strom (A)" }]} />
        {solve !== "U" && <MiniInput label="U" unit="V" value={u} onChange={setU} placeholder="z.B. 230" />}
        {solve !== "I" && <MiniInput label="I" unit="A" value={i} onChange={setI} placeholder="z.B. 16" />}
        {solve !== "R" && <MiniInput label="R" unit="Ω" value={r} onChange={setR} placeholder="z.B. 14.4" />}
      </div>
      {erg ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {solve === "R" && <ResultChip label="Widerstand R" value={erg.R.toFixed(4)} unit="Ω" />}
          {solve === "U" && <ResultChip label="Spannung U" value={erg.U.toFixed(3)} unit="V" />}
          {solve === "I" && <ResultChip label="Strom I" value={erg.I.toFixed(4)} unit="A" />}
          <ResultChip label="P = U·I" value={(((erg.U ?? U) * (erg.I ?? I))).toFixed(1)} unit="W" color="var(--text2)" />
        </div>
      ) : <div style={{ fontSize: 12, color: "var(--text3)" }}>Werte eingeben</div>}
    </div>
  );
}

// ── 1-phasiger Wechselstrom ──────────────────────────────────────────────────
function Rechner1P() {
  const [solve, setSolve] = useState("I");
  const [p, setP] = useState(""); const [u, setU] = useState("230"); const [i, setI] = useState(""); const [cos, setCos] = useState("1");
  const P = parseFloat(p) * 1000, U = parseFloat(u), I = parseFloat(i), c = parseFloat(cos) || 1;
  let erg = null;
  if (solve === "I" && P > 0 && U > 0) erg = { I: P / (U * c), P, U, c };
  else if (solve === "P" && U > 0 && I > 0) erg = { P: U * I * c, U, I, c };
  else if (solve === "U" && P > 0 && I > 0) erg = { U: P / (I * c), P, I, c };
  const sinPhi = erg ? Math.sqrt(Math.max(0, 1 - erg.c * erg.c)) : 0;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <MiniSelect label="Gesucht" value={solve} onChange={setSolve} options={[{ wert: "I", label: "I — Strom (A)" }, { wert: "P", label: "P — Leistung (kW)" }, { wert: "U", label: "U — Spannung (V)" }]} />
        {solve !== "P" && <MiniInput label="P" unit="kW" value={p} onChange={setP} placeholder="z.B. 2.3" />}
        {solve !== "U" && <MiniInput label="U" unit="V" value={u} onChange={setU} placeholder="230" />}
        {solve !== "I" && <MiniInput label="I" unit="A" value={i} onChange={setI} placeholder="z.B. 10" />}
        <MiniSelect label="cos φ" value={cos} onChange={setCos} options={[{ wert: "1", label: "1,0" }, { wert: "0.95", label: "0,95" }, { wert: "0.9", label: "0,90" }, { wert: "0.85", label: "0,85" }, { wert: "0.8", label: "0,80" }]} />
      </div>
      {erg ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {solve === "I" && <ResultChip label="Strom I" value={erg.I.toFixed(3)} unit="A" />}
          {solve === "P" && <ResultChip label="Leistung P" value={(erg.P / 1000).toFixed(3)} unit="kW" />}
          {solve === "U" && <ResultChip label="Spannung U" value={erg.U.toFixed(1)} unit="V" />}
          <ResultChip label="S Schein" value={((erg.P ?? P) / erg.c / 1000).toFixed(3)} unit="kVA" color="#a855f7" />
          <ResultChip label="Q Blind" value={((erg.P ?? P) / erg.c * sinPhi / 1000).toFixed(3)} unit="kVAr" color="#f59e0b" />
        </div>
      ) : <div style={{ fontSize: 12, color: "var(--text3)" }}>Werte eingeben</div>}
    </div>
  );
}

// ── 3-phasiger Drehstrom ─────────────────────────────────────────────────────
function Rechner3P() {
  const [solve, setSolve] = useState("I");
  const [p, setP] = useState(""); const [u, setU] = useState("400"); const [i, setI] = useState(""); const [cos, setCos] = useState("0.9");
  const P = parseFloat(p) * 1000, U = parseFloat(u), I = parseFloat(i), c = parseFloat(cos) || 1;
  const sq3 = Math.sqrt(3);
  let erg = null;
  if (solve === "I" && P > 0 && U > 0) erg = { I: P / (sq3 * U * c), P, U, c };
  else if (solve === "P" && U > 0 && I > 0) erg = { P: sq3 * U * I * c, U, I, c };
  else if (solve === "U" && P > 0 && I > 0) erg = { U: P / (sq3 * I * c), P, I, c };
  const UStr = erg ? (erg.U ?? U) / sq3 : null;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <MiniSelect label="Gesucht" value={solve} onChange={setSolve} options={[{ wert: "I", label: "I — Strom (A)" }, { wert: "P", label: "P — Leistung (kW)" }, { wert: "U", label: "U_L — Leiterspannung (V)" }]} />
        {solve !== "P" && <MiniInput label="P" unit="kW" value={p} onChange={setP} placeholder="z.B. 11" />}
        {solve !== "U" && <MiniInput label="U_L" unit="V" value={u} onChange={setU} placeholder="400" />}
        {solve !== "I" && <MiniInput label="I" unit="A" value={i} onChange={setI} placeholder="z.B. 20" />}
        <MiniSelect label="cos φ" value={cos} onChange={setCos} options={[{ wert: "1", label: "1,0" }, { wert: "0.95", label: "0,95" }, { wert: "0.9", label: "0,90" }, { wert: "0.85", label: "0,85" }, { wert: "0.8", label: "0,80" }]} />
      </div>
      {erg ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {solve === "I" && <ResultChip label="Strom I" value={erg.I.toFixed(3)} unit="A" />}
          {solve === "P" && <ResultChip label="Leistung P" value={(erg.P / 1000).toFixed(3)} unit="kW" />}
          {solve === "U" && <ResultChip label="U_Leiter" value={erg.U.toFixed(1)} unit="V" />}
          <ResultChip label="U_Strang" value={UStr.toFixed(1)} unit="V" color="var(--text2)" />
          <ResultChip label="S Schein" value={((erg.P ?? P) / erg.c / 1000).toFixed(3)} unit="kVA" color="#a855f7" />
        </div>
      ) : <div style={{ fontSize: 12, color: "var(--text3)" }}>Werte eingeben</div>}
    </div>
  );
}

// ── Leitungsquerschnitt (mini) ───────────────────────────────────────────────
function RechnerQuerschnitt() {
  const [i, setI] = useState(""); const [l, setL] = useState(""); const [ph, setPh] = useState("1P"); const [mat, setMat] = useState("Cu");
  const I = parseFloat(i), L = parseFloat(l);
  const kappa = KAPPA[mat], UN = U_N[ph], fak = FAKTOR[ph];
  const duZul = 0.03 * UN;
  const aMin = (I > 0 && L > 0) ? (fak * I * L) / (kappa * duZul) : null;
  const empf = aMin ? QS_STUFEN.find(q => q >= aMin) ?? QS_STUFEN[QS_STUFEN.length - 1] : null;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <MiniInput label="I" unit="A" value={i} onChange={setI} placeholder="z.B. 16" />
        <MiniInput label="L" unit="m" value={l} onChange={setL} placeholder="z.B. 20" />
        <MiniSelect label="Phase" value={ph} onChange={setPh} options={[{ wert: "1P", label: "1P — 230 V" }, { wert: "3P", label: "3P — 400 V" }]} />
        <MiniSelect label="Material" value={mat} onChange={setMat} options={[{ wert: "Cu", label: "Kupfer (κ=56)" }, { wert: "Al", label: "Aluminium (κ=35)" }]} />
      </div>
      {aMin ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ResultChip label="Mindest-QS" value={`${aMin.toFixed(2)}`} unit="mm²" color="var(--text2)" />
          <ResultChip label="Empfohlener QS" value={empf} unit="mm²" />
          <ResultChip label="ΔU_zul" value={(duZul).toFixed(1)} unit="V" color="var(--green)" />
        </div>
      ) : <div style={{ fontSize: 12, color: "var(--text3)" }}>Strom und Länge eingeben (cos φ = 1, ΔU ≤ 3 %)</div>}
    </div>
  );
}

// ── Blindleistungskompensation (mini) ─────────────────────────────────────────
function RechnerKompensation() {
  const [p, setP] = useState(""); const [c1, setC1] = useState("0.7"); const [c2, setC2] = useState("0.95");
  const [u, setU] = useState("400"); const [f, setF] = useState("50");
  const P = parseFloat(p) * 1000, cos1 = parseFloat(c1), cos2 = parseFloat(c2), U = parseFloat(u), freq = parseFloat(f);
  const valid = P > 0 && cos1 > 0 && cos2 > cos1 && U > 0 && freq > 0;
  const Qc = valid ? P * (Math.tan(Math.acos(cos1)) - Math.tan(Math.acos(cos2))) : null;
  const C = valid ? (Qc * 1000) / (2 * Math.PI * freq * U * U) * 1e6 : null;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <MiniInput label="P" unit="kW" value={p} onChange={setP} placeholder="z.B. 10" />
        <MiniSelect label="cos φ IST" value={c1} onChange={setC1} options={[{ wert: "0.5", label: "0,50" }, { wert: "0.6", label: "0,60" }, { wert: "0.65", label: "0,65" }, { wert: "0.7", label: "0,70" }, { wert: "0.75", label: "0,75" }, { wert: "0.8", label: "0,80" }, { wert: "0.85", label: "0,85" }]} />
        <MiniSelect label="cos φ SOLL" value={c2} onChange={setC2} options={[{ wert: "0.9", label: "0,90" }, { wert: "0.92", label: "0,92" }, { wert: "0.95", label: "0,95" }, { wert: "0.97", label: "0,97" }, { wert: "1", label: "1,00" }]} />
        <MiniInput label="U" unit="V" value={u} onChange={setU} placeholder="400" />
        <MiniSelect label="f" value={f} onChange={setF} options={[{ wert: "50", label: "50 Hz" }, { wert: "60", label: "60 Hz" }]} />
      </div>
      {valid && Qc ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ResultChip label="Q_C" value={(Qc / 1000).toFixed(2)} unit="kVAr" />
          <ResultChip label="Kondensator C" value={C.toFixed(1)} unit="µF" color="#a855f7" />
        </div>
      ) : <div style={{ fontSize: 12, color: "var(--text3)" }}>Werte eingeben (cos φ IST {'<'} cos φ SOLL)</div>}
    </div>
  );
}

// ── Schutzmaßnahmen + Konstanten (Referenz) ───────────────────────────────────
const SCHUTZ_REF = [
  { label: "Isolationswiderstand", wert: "R_iso ≥ 1 MΩ", norm: "VDE 0100-600 §61.3.3" },
  { label: "FI-Abschaltzeit AC/A", wert: "t ≤ 300 ms @ I_ΔN", norm: "VDE 0100-410" },
  { label: "FI-Abschaltzeit Typ S", wert: "t ≤ 500 ms @ I_ΔN", norm: "VDE 0100-410" },
  { label: "FI schnell (5×I_ΔN)", wert: "t ≤ 40 ms", norm: "VDE 0100-410" },
  { label: "Berührungsspannung", wert: "U_B ≤ 50 V AC", norm: "VDE 0100-410 (Trockene Räume)" },
];
const KONST_REF = [
  { label: "Netzfrequenz", wert: "f = 50 Hz", info: "Europa" },
  { label: "Nennspannung", wert: "230 / 400 V", info: "Strang / Leiter" },
  { label: "√2", wert: "≈ 1,4142", info: "U_peak = √2 × U_eff" },
  { label: "√3", wert: "≈ 1,7321", info: "Drehstromfaktor" },
  { label: "κ Kupfer", wert: "56 m/(Ω·mm²)", info: "bei 20 °C" },
  { label: "κ Aluminium", wert: "35 m/(Ω·mm²)", info: "bei 20 °C" },
  { label: "ρ Kupfer", wert: "0,0178 Ω·mm²/m", info: "Spez. Widerstand 20 °C" },
  { label: "1 kWh", wert: "= 3,6 MJ", info: "Energieumrechnung" },
];

function RefTabelle({ rows, cols }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
              {cols.map((col, j) => (
                <td key={j} style={{ padding: "8px 12px", color: j === 1 ? AKZENT : j === 0 ? "var(--text)" : "var(--text3)", fontFamily: j === 1 ? "var(--mono)" : "inherit", fontWeight: j === 1 ? 700 : 400, fontSize: j === 2 ? 11 : 13, whiteSpace: "nowrap" }}>
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabFormelrechner() {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Formeln direkt berechnen — Werte eingeben, Ergebnis erscheint sofort
      </div>

      <FormelCard titel="Ohmsches Gesetz" icon="⚡" formel="U = R × I" defaultOpen>
        <RechnerOhm />
      </FormelCard>

      <FormelCard titel="Wechselstrom (1-phasig, 230 V)" icon="🔌" formel="P = U × I × cos φ">
        <Rechner1P />
      </FormelCard>

      <FormelCard titel="Drehstrom (3-phasig, 400 V)" icon="🔁" formel="P = √3 × U × I × cos φ">
        <Rechner3P />
      </FormelCard>

      <FormelCard titel="Leitungsquerschnitt (ΔU ≤ 3 %)" icon="📏" formel="A_min = Faktor × I × L × cos φ / (κ × ΔU_zul)">
        <RechnerQuerschnitt />
      </FormelCard>

      <FormelCard titel="Blindleistungskompensation" icon="🔋" formel="Q_C = P × (tan φ₁ − tan φ₂)">
        <RechnerKompensation />
      </FormelCard>

      <FormelCard titel="Schutzmaßnahmen (VDE 0100-410 / -600)" icon="🛡">
        <RefTabelle rows={SCHUTZ_REF} cols={["label", "wert", "norm"]} />
      </FormelCard>

      <FormelCard titel="Nützliche Konstanten" icon="📊">
        <RefTabelle rows={KONST_REF} cols={["label", "wert", "info"]} />
      </FormelCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab: Maßstabsrechner
// ══════════════════════════════════════════════════════════════════════════════

const MASSSTAB_VORGABEN = [
  { wert: "20",   label: "1:20" },
  { wert: "25",   label: "1:25" },
  { wert: "50",   label: "1:50" },
  { wert: "75",   label: "1:75" },
  { wert: "100",  label: "1:100" },
  { wert: "200",  label: "1:200" },
  { wert: "500",  label: "1:500" },
  { wert: "1000", label: "1:1000" },
];

function TabMassstab() {
  const [massstab, setMassstab] = useState("100");
  const [planMm, setPlanMm]     = useState("");
  const [realM, setRealM]       = useState("");

  const M = parseFloat(massstab) || 100;
  const planVal = parseFloat(planMm);
  const realVal = parseFloat(realM);

  // Plan → Real
  const realMm  = !isNaN(planVal) && planVal > 0 ? planVal * M : null;
  const realCm  = realMm ? realMm / 10 : null;
  const realMet = realMm ? realMm / 1000 : null;

  // Real → Plan
  const planResult = !isNaN(realVal) && realVal > 0 ? (realVal * 1000) / M : null;

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        Umrechnung zwischen Plan-Maß und Wirklichkeit — für Grundrisse und Aufmaße
      </div>

      {/* Maßstab-Wahl */}
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Maßstab</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {MASSSTAB_VORGABEN.map(s => (
            <button key={s.wert} onClick={() => setMassstab(s.wert)}
              style={{
                padding: "8px 14px", borderRadius: 8, border: `2px solid ${massstab === s.wert ? AKZENT : "var(--border)"}`,
                background: massstab === s.wert ? `${AKZENT}18` : "var(--bg)",
                color: massstab === s.wert ? AKZENT : "var(--text)", fontWeight: massstab === s.wert ? 700 : 400,
                cursor: "pointer", fontSize: 13, fontFamily: "var(--mono)",
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Eigener Maßstab 1 :</span>
          <input type="number" min="1" value={massstab} onChange={e => setMassstab(e.target.value)}
            style={inp({ width: 90, padding: "7px 10px", fontSize: 14, fontFamily: "var(--mono)" })} />
        </div>
      </div>

      {/* Plan → Real */}
      <div style={{ ...card(), marginBottom: 16 }}>
        <SectionTitle>Plan-Maß → Wirklichkeit</SectionTitle>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <MiniInput label="Maß auf Plan" unit="mm" value={planMm} onChange={setPlanMm} placeholder="z.B. 45" />
          <div style={{ fontSize: 18, color: "var(--text3)", paddingBottom: 8, flexShrink: 0 }}>→</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {realMm ? (
              <>
                <ResultChip label="in Millimeter" value={realMm.toFixed(0)} unit="mm" />
                <ResultChip label="in Zentimeter" value={realCm.toFixed(1)} unit="cm" color="var(--text2)" />
                <ResultChip label="in Meter" value={realMet.toFixed(3)} unit="m" color="var(--green)" />
              </>
            ) : <div style={{ fontSize: 12, color: "var(--text3)", paddingBottom: 8 }}>Plan-Maß eingeben</div>}
          </div>
        </div>
        {realMm && (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {planMm} mm × {M} = {realMm.toFixed(0)} mm = {realMet?.toFixed(3)} m
          </div>
        )}
      </div>

      {/* Real → Plan */}
      <div style={{ ...card(), marginBottom: 20 }}>
        <SectionTitle>Wirklichkeit → Plan-Maß</SectionTitle>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <MiniInput label="Reales Maß" unit="m" value={realM} onChange={setRealM} placeholder="z.B. 4.5" />
          <div style={{ fontSize: 18, color: "var(--text3)", paddingBottom: 8, flexShrink: 0 }}>→</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {planResult ? (
              <>
                <ResultChip label="Auf Plan" value={planResult.toFixed(2)} unit="mm" />
                <ResultChip label="Auf Plan" value={(planResult / 10).toFixed(2)} unit="cm" color="var(--text2)" />
              </>
            ) : <div style={{ fontSize: 12, color: "var(--text3)", paddingBottom: 8 }}>Reales Maß eingeben</div>}
          </div>
        </div>
        {planResult && (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {realM} m ÷ {M} = {planResult.toFixed(2)} mm auf dem Plan
          </div>
        )}
      </div>

      {/* Referenztabelle */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>
          Typische Maßstäbe &amp; Anwendungsbereiche
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg3)" }}>
              {["Maßstab", "1 mm Plan =", "Typischer Einsatz"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "var(--text3)", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["1:20",   "2 cm",   "Detailzeichnungen, Schalter, Steckdosen"],
              ["1:50",   "5 cm",   "Raumgrundrisse, Elektropläne"],
              ["1:100",  "10 cm",  "Gebäudegrundrisse (Standard)"],
              ["1:200",  "20 cm",  "Übersichtspläne Gebäude"],
              ["1:500",  "50 cm",  "Lagepläne, Außenanlagen"],
              ["1:1000", "1 m",    "Städtebau, Übersicht"],
            ].map(([m, mm, info]) => (
              <tr key={m} style={{ borderBottom: "1px solid var(--border)", background: massstab === m.split(":")[1] ? `${AKZENT}08` : "transparent" }}>
                <td style={{ padding: "9px 14px", fontWeight: 700, color: AKZENT, fontFamily: "var(--mono)" }}>{m}</td>
                <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", color: "var(--text)" }}>{mm}</td>
                <td style={{ padding: "9px 14px", color: "var(--text3)", fontSize: 12 }}>{info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Haupt-Komponente
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "ltg",      label: "Leitungsberechnung", icon: "📏", beschr: "Querschnitt & ΔU" },
  { id: "power",    label: "Strom & Leistung",   icon: "⚡", beschr: "P · U · I · cos φ" },
  { id: "motor",    label: "Motorstrom",         icon: "🔁", beschr: "I_n · I_a · Sicherung" },
  { id: "komp",     label: "cos φ Korrektur",    icon: "🔋", beschr: "Kompensation · C" },
  { id: "abstand",  label: "Abstandsrechner",    icon: "📐", beschr: "Lampen · Dübel · Objekte" },
  { id: "massstab", label: "Maßstab",            icon: "🗺",  beschr: "Plan ↔ Wirklichkeit" },
  { id: "formel",   label: "Formelrechner",      icon: "📖", beschr: "Alle Formeln interaktiv" },
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

      {/* Tab-Nav als Kachelgitter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: activeTab === t.id ? `${AKZENT}18` : "var(--bg2)",
            border: `2px solid ${activeTab === t.id ? AKZENT : "var(--border)"}`,
            borderRadius: 12, padding: "12px 8px",
            cursor: "pointer", color: activeTab === t.id ? AKZENT : "var(--text)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            transition: "border-color 0.15s, background 0.15s",
          }}>
            <span style={{ fontSize: 24 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: activeTab === t.id ? 700 : 500, textAlign: "center", lineHeight: 1.3, color: activeTab === t.id ? AKZENT : "var(--text)" }}>{t.label}</span>
            <span style={{ fontSize: 10, color: "var(--text3)", textAlign: "center", lineHeight: 1.2 }}>{t.beschr}</span>
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "ltg"      && <TabLeitungsberechnung />}
      {activeTab === "power"    && <TabStromLeistung />}
      {activeTab === "motor"    && <TabMotor />}
      {activeTab === "komp"     && <TabKompensation />}
      {activeTab === "abstand"  && <TabAbstandsrechner />}
      {activeTab === "massstab" && <TabMassstab />}
      {activeTab === "formel"   && <TabFormelrechner />}
    </div>
  );
}
