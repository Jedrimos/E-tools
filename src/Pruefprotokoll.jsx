import React, { useState, useEffect } from "react";
import Toast, { useToasts } from "./components/Toast.jsx";
import {
  loadProtokolleDB, saveProtokollDB, deleteProtokollDB,
  loadProjekteForImport,
} from "./lib/db_pruefprotokoll.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }

const LS_KEY = "elektronikertools_pruefprotokoll";
function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function save(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)); }

// ── VDE-Grenzwerte ────────────────────────────────────────────────────────────
const GW = {
  riso_min:    1.0,   // ≥ 1 MΩ  (VDE 0100-600 §61.3)
  fi_t_nenn:   300,   // ≤ 300 ms bei IΔN (Typ AC/A/F/B)
  fi_t_s_nenn: 500,   // ≤ 500 ms bei IΔN (Typ S)
  fi_t_5fach:   40,   // ≤ 40 ms bei 5×IΔN
  fi_ub_max:    50,   // ≤ 50 V Berührungsspannung
};

function evalNum(val, pass) {
  if (val === "" || val == null) return null;
  const n = parseFloat(String(val).replace(",", "."));
  if (isNaN(n)) return null;
  return pass(n) ? "ok" : "fail";
}

function evalStromkreis(sk) {
  const results = [
    evalNum(sk.pe_widerstand, () => true),             // PE nur Messung, kein Grenzwert ohne Kabellänge
    evalNum(sk.riso_l1_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_l2_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_l3_pe,  v => v >= GW.riso_min),
    evalNum(sk.riso_n_pe,   v => v >= GW.riso_min),
    // Schleife: kein einfacher globaler Grenzwert (abhängig von Sicherung) → nur Info
  ].filter(r => r === "ok" || r === "fail");

  if (sk.fi_vorhanden) {
    const max_nenn = sk.fi_typ === "S" ? GW.fi_t_s_nenn : GW.fi_t_nenn;
    results.push(...[
      evalNum(sk.fi_t_nenn,  v => v <= max_nenn),
      evalNum(sk.fi_t_5fach, v => v <= GW.fi_t_5fach),
      evalNum(sk.fi_ub,      v => v <= GW.fi_ub_max),
    ].filter(Boolean));
    // ½×IΔN: wenn Wert eingetragen → RCD hat ausgelöst → Fehler
    if (sk.fi_t_halb !== "" && sk.fi_t_halb != null) results.push("fail");
  }

  if (results.length === 0) return "offen";
  if (results.includes("fail")) return "fail";
  return "ok";
}

function risoMin(sk) {
  const vals = [sk.riso_l1_pe, sk.riso_l2_pe, sk.riso_l3_pe, sk.riso_n_pe]
    .filter(v => v !== "")
    .map(v => parseFloat(String(v).replace(",", ".")))
    .filter(n => !isNaN(n));
  if (!vals.length) return "";
  return Math.min(...vals).toFixed(2);
}

// ── Stammdaten ────────────────────────────────────────────────────────────────
const mkStromkreis = () => ({
  id: uid(),
  bezeichnung: "",
  nennstrom: "",
  sicherungstyp: "B",
  dreipolig: false,
  // PE
  pe_widerstand: "",
  // Riso
  riso_l1_pe: "", riso_l2_pe: "", riso_l3_pe: "", riso_n_pe: "",
  // Schleife
  zs: "", ik: "",
  // FI
  fi_vorhanden: false,
  fi_nennstrom: "30", fi_typ: "A",
  fi_t_nenn: "", fi_t_5fach: "", fi_t_halb: "", fi_ub: "",
  // Notiz
  notiz: "",
});

const mkProtokoll = () => ({
  id: uid(),
  db_id:             null,
  verteiler_id:      null,
  datum:             new Date().toISOString().slice(0, 10),
  naechste_pruefung: "",
  auftraggeber:      "",
  auftragnummer:     "",
  anlagenstandort:   "",
  anlage_art:        "Wohngebäude",
  nennspannung:      "230/400",
  pruefer:           "",
  stromkreise:       [mkStromkreis()],
  notiz:             "",
});

// ── Verteilerplaner → Prüfprotokoll Import ────────────────────────────────────
function importAusVerteiler(projekt) {
  const kabelById = Object.fromEntries((projekt.kabel || []).map(k => [k.id, k]));
  const stromkreise = (projekt.sicherungen || [])
    .filter(si => si.kabelIds && si.kabelIds.length > 0)
    .map(si => {
      const bezeichnung = si.kabelIds
        .map(id => kabelById[id])
        .filter(Boolean)
        .map(k => k.bezeichnung || k.raum || "Kabel")
        .join(" + ");
      const match = (si.sicherung || "B16").match(/([A-Z]+)(\d+)/);
      return {
        ...mkStromkreis(),
        bezeichnung,
        nennstrom:     match ? match[2] : "16",
        sicherungstyp: match ? match[1] : "B",
        dreipolig:     !!si.dreipolig,
      };
    });
  return {
    ...mkProtokoll(),
    auftraggeber:    projekt.projekt?.name || projekt.name || "",
    anlagenstandort: [projekt.projekt?.adresse, projekt.projekt?.standort].filter(Boolean).join(", "),
    pruefer:         projekt.projekt?.ersteller || "",
    verteiler_id:    projekt.db_id || null,
    stromkreise:     stromkreise.length > 0 ? stromkreise : [mkStromkreis()],
  };
}

// ── Verteilerplaner-Import-Modal ──────────────────────────────────────────────
function ImportModal({ onSelect, onClose }) {
  const [projekte, setProjekte] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    loadProjekteForImport()
      .then(setProjekte)
      .catch(() => setProjekte([]))
      .finally(() => setLaden(false));
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>⚡ Aus Verteilerplaner importieren</div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
          Stromkreise werden aus dem gespeicherten Verteiler übernommen. Messwerte müssen noch eingetragen werden.
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {laden ? (
            <div style={{ textAlign: "center", color: "var(--text3)", padding: "32px 0" }}>Lade Projekte …</div>
          ) : projekte.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text3)", padding: "32px 0" }}>
              Keine gespeicherten Verteiler gefunden.
            </div>
          ) : (
            projekte.map(p => (
              <button
                key={p.id || p.db_id}
                onClick={() => onSelect(importAusVerteiler(p))}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                  cursor: "pointer", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = AMBER + "80"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>
                  ⚡ {p.projekt?.name || p.name || "Unbenannt"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {p.projekt?.adresse && <span>📍 {p.projekt.adresse}</span>}
                  {p.datum && <span>📅 {p.datum}</span>}
                  {(p.sicherungen || []).length > 0 && (
                    <span>⚡ {(p.sicherungen || []).filter(s => s.kabelIds?.length > 0).length} Stromkreise</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const AMBER = "#f59e0b";

const inp = (extra = {}) => ({
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7,
  color: "var(--text)", padding: "7px 9px", fontSize: 13,
  fontFamily: "inherit", width: "100%", ...extra,
});

const sel = (extra = {}) => ({
  ...inp(), appearance: "none", WebkitAppearance: "none", ...extra,
});

const bPrim = {
  background: AMBER, border: "none", color: "#000", borderRadius: 8,
  padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700,
};

const bSec = {
  background: "transparent", border: `1px solid var(--border2)`, color: "var(--text2)",
  borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12,
};

const bDanger = {
  background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)",
  color: "var(--red)", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12,
};

// ── Bewertungs-Badge ──────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    ok:    { label: "✓ OK",      bg: "rgba(82,217,138,0.12)", color: "var(--green)",  border: "rgba(82,217,138,0.3)"  },
    fail:  { label: "✗ Fehler",  bg: "rgba(255,107,107,0.1)", color: "var(--red)",    border: "rgba(255,107,107,0.3)" },
    offen: { label: "— Offen",   bg: "transparent",            color: "var(--text3)",  border: "var(--border)"         },
  };
  const s = map[status] || map.offen;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

// ── Inline-Wert mit Ampel ─────────────────────────────────────────────────────
function Val({ val, pass, unit = "" }) {
  if (val === "" || val == null) return <span style={{ color: "var(--text3)" }}>—</span>;
  const n = parseFloat(String(val).replace(",", "."));
  const ok = !isNaN(n) && pass(n);
  return (
    <span style={{ color: ok ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
      {val}{unit}
    </span>
  );
}

// ── Formular-Zeile ────────────────────────────────────────────────────────────
function FL({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

// ── Stromkreis-Formular (aufgeklappt) ─────────────────────────────────────────
function StromkreisForm({ sk, onChange, onDelete }) {
  const set = (key, val) => onChange({ ...sk, [key]: val });

  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 4 }}>
      {/* Grunddaten */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 12 }}>
        <FL label="Bezeichnung">
          <input style={inp()} value={sk.bezeichnung} onChange={e => set("bezeichnung", e.target.value)} placeholder="z.B. L1 Küche" />
        </FL>
        <FL label="Nennstrom (A)">
          <input style={inp()} value={sk.nennstrom} onChange={e => set("nennstrom", e.target.value)} placeholder="16" />
        </FL>
        <FL label="Sicherung">
          <select style={sel()} value={sk.sicherungstyp} onChange={e => set("sicherungstyp", e.target.value)}>
            {["B","C","D","K","gG"].map(t => <option key={t}>{t}</option>)}
          </select>
        </FL>
        <FL label="3-polig">
          <label style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={sk.dreipolig} onChange={e => set("dreipolig", e.target.checked)} />
            <span style={{ fontSize: 12, color: "var(--text2)" }}>Ja</span>
          </label>
        </FL>
      </div>

      {/* PE-Durchgangswiderstand */}
      <SectionHead>PE-Durchgangswiderstand</SectionHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 12 }}>
        <FL label="R_PE (Ω)">
          <input style={inp()} value={sk.pe_widerstand} onChange={e => set("pe_widerstand", e.target.value)} placeholder="0,42" />
        </FL>
        <div style={{ paddingTop: 18, fontSize: 12, color: "var(--text3)" }}>
          Grenzwert abhängig von Kabellänge/Querschnitt (kein fester Grenzwert)
        </div>
      </div>

      {/* Isolationswiderstand */}
      <SectionHead>Isolationswiderstand (Riso) — Grenzwert: ≥ 1 MΩ</SectionHead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        <FL label="L1-PE (MΩ)">
          <input style={inp()} value={sk.riso_l1_pe} onChange={e => set("riso_l1_pe", e.target.value)} placeholder="1,00" />
        </FL>
        <FL label={sk.dreipolig ? "L2-PE (MΩ)" : "L2-PE (MΩ)"}>
          <input style={inp({ opacity: sk.dreipolig ? 1 : 0.4 })} value={sk.riso_l2_pe}
            onChange={e => set("riso_l2_pe", e.target.value)} placeholder="—" disabled={!sk.dreipolig} />
        </FL>
        <FL label="L3-PE (MΩ)">
          <input style={inp({ opacity: sk.dreipolig ? 1 : 0.4 })} value={sk.riso_l3_pe}
            onChange={e => set("riso_l3_pe", e.target.value)} placeholder="—" disabled={!sk.dreipolig} />
        </FL>
        <FL label="N-PE (MΩ)">
          <input style={inp()} value={sk.riso_n_pe} onChange={e => set("riso_n_pe", e.target.value)} placeholder="1,00" />
        </FL>
      </div>

      {/* Schleifenimpedanz */}
      <SectionHead>Schleifenimpedanz</SectionHead>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8, marginBottom: 12 }}>
        <FL label="Zs (Ω)">
          <input style={inp()} value={sk.zs} onChange={e => set("zs", e.target.value)} placeholder="0,42" />
        </FL>
        <FL label="Ik (A)">
          <input style={inp()} value={sk.ik} onChange={e => set("ik", e.target.value)} placeholder="550" />
        </FL>
        <div style={{ paddingTop: 18, fontSize: 12, color: "var(--text3)" }}>
          Grenzwert: Zs ≤ U₀ / (5 × Ia) — abhängig von Sicherungstyp und Nennstrom
        </div>
      </div>

      {/* FI / RCD */}
      <SectionHead>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={sk.fi_vorhanden} onChange={e => set("fi_vorhanden", e.target.checked)} />
          FI / RCD-Prüfung
        </label>
      </SectionHead>
      {sk.fi_vorhanden && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <FL label="IΔN (mA)">
              <select style={sel()} value={sk.fi_nennstrom} onChange={e => set("fi_nennstrom", e.target.value)}>
                {["10","30","100","300","500"].map(v => <option key={v}>{v}</option>)}
              </select>
            </FL>
            <FL label="Typ">
              <select style={sel()} value={sk.fi_typ} onChange={e => set("fi_typ", e.target.value)}>
                {["AC","A","F","B","S"].map(t => <option key={t}>{t}</option>)}
              </select>
            </FL>
            <FL label={`t @ IΔN (ms) — ≤${sk.fi_typ === "S" ? 500 : 300}ms`}>
              <input style={inp()} value={sk.fi_t_nenn} onChange={e => set("fi_t_nenn", e.target.value)} placeholder="—" />
            </FL>
            <FL label="t @ 5×IΔN (ms) — ≤40ms">
              <input style={inp()} value={sk.fi_t_5fach} onChange={e => set("fi_t_5fach", e.target.value)} placeholder="—" />
            </FL>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
            <FL label="t @ ½×IΔN (ms) — leer = nicht ausgelöst ✓">
              <input style={inp()} value={sk.fi_t_halb} onChange={e => set("fi_t_halb", e.target.value)} placeholder="leer lassen" />
            </FL>
            <FL label="UB (V) — ≤50V">
              <input style={inp()} value={sk.fi_ub} onChange={e => set("fi_ub", e.target.value)} placeholder="—" />
            </FL>
          </div>
        </div>
      )}

      {/* Notiz + Löschen */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <FL label="Notiz / Bemerkung">
            <input style={inp()} value={sk.notiz} onChange={e => set("notiz", e.target.value)} placeholder="Optionale Bemerkung …" />
          </FL>
        </div>
        <button style={{ ...bDanger, marginBottom: 8 }} onClick={onDelete}>✕ Löschen</button>
      </div>
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <div style={{
      fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: "0.8px",
      fontWeight: 700, marginBottom: 8, paddingBottom: 4,
      borderBottom: `1px solid rgba(245,158,11,0.2)`,
    }}>{children}</div>
  );
}

// ── Protokoll-Editor ──────────────────────────────────────────────────────────
function ProtokollEditor({ protokoll, onSave, onBack, config }) {
  const [p, setP] = useState(protokoll);
  const [expanded, setExpanded] = useState(new Set());

  function setField(key, val) { setP(x => ({ ...x, [key]: val })); }

  function setStromkreis(id, updated) {
    setP(x => ({ ...x, stromkreise: x.stromkreise.map(s => s.id === id ? updated : s) }));
  }

  function addStromkreis() {
    const sk = mkStromkreis();
    setP(x => ({ ...x, stromkreise: [...x.stromkreise, sk] }));
    setExpanded(e => new Set([...e, sk.id]));
  }

  function deleteStromkreis(id) {
    setP(x => ({ ...x, stromkreise: x.stromkreise.filter(s => s.id !== id) }));
    setExpanded(e => { const n = new Set(e); n.delete(id); return n; });
  }

  function toggleExpand(id) {
    setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const bestanden = p.stromkreise.every(s => evalStromkreis(s) !== "fail");
  const hatMessungen = p.stromkreise.some(s => evalStromkreis(s) !== "offen");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
      {/* Kopfzeile */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button style={{ ...bSec, padding: "8px 12px" }} onClick={onBack}>← Zurück</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>
            {p.auftraggeber || p.anlagenstandort || "Neues Protokoll"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>{p.datum}</div>
        </div>
        {hatMessungen && <Badge status={bestanden ? "ok" : "fail"} />}
        <button style={bPrim} onClick={() => onSave(p)}>Speichern</button>
      </div>

      {/* Kopfdaten */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: AMBER, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, marginBottom: 12 }}>Anlagendaten</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <FL label="Auftraggeber / Kunde">
            <input style={inp()} value={p.auftraggeber} onChange={e => setField("auftraggeber", e.target.value)} placeholder="Mustermann GmbH" />
          </FL>
          <FL label="Anlagenstandort">
            <input style={inp()} value={p.anlagenstandort} onChange={e => setField("anlagenstandort", e.target.value)} placeholder="Musterstr. 1, 80000 München" />
          </FL>
          <FL label="Auftragsnummer">
            <input style={inp()} value={p.auftragnummer} onChange={e => setField("auftragnummer", e.target.value)} placeholder="2026-0042" />
          </FL>
          <FL label="Anlagenart">
            <select style={sel()} value={p.anlage_art} onChange={e => setField("anlage_art", e.target.value)}>
              {["Wohngebäude","Gewerbe","Industrie","Büro","Außenanlage","Sonstiges"].map(v => <option key={v}>{v}</option>)}
            </select>
          </FL>
          <FL label="Nennspannung (V)">
            <select style={sel()} value={p.nennspannung} onChange={e => setField("nennspannung", e.target.value)}>
              {["230/400","120/208","400"].map(v => <option key={v}>{v}</option>)}
            </select>
          </FL>
          <FL label="Prüfer">
            <input style={inp()} value={p.pruefer || config?.mitarbeiter || ""} onChange={e => setField("pruefer", e.target.value)} placeholder={config?.mitarbeiter || "Name des Prüfers"} />
          </FL>
          <FL label="Prüfdatum">
            <input type="date" style={inp()} value={p.datum} onChange={e => setField("datum", e.target.value)} />
          </FL>
          <FL label="Nächste Prüfung">
            <input type="date" style={inp()} value={p.naechste_pruefung} onChange={e => setField("naechste_pruefung", e.target.value)} />
          </FL>
          <FL label="Notiz">
            <input style={inp()} value={p.notiz} onChange={e => setField("notiz", e.target.value)} placeholder="Optionale Anmerkungen …" />
          </FL>
        </div>
      </div>

      {/* Stromkreis-Tabelle */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 12 }}>
          <div style={{ fontSize: 11, color: AMBER, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700, flex: 1 }}>
            Stromkreise ({p.stromkreise.length})
          </div>
          <button style={bPrim} onClick={addStromkreis}>+ Stromkreis</button>
        </div>

        {/* Tabellen-Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 70px 70px 80px 70px 80px 100px",
          gap: 4, padding: "6px 10px",
          fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.6px",
          borderBottom: "1px solid var(--border)",
        }}>
          <span>Bezeichnung</span>
          <span>Nennstrom</span>
          <span>R_PE (Ω)</span>
          <span>Riso min (MΩ)</span>
          <span>Zs (Ω)</span>
          <span>FI-t/IΔN (ms)</span>
          <span style={{ textAlign: "right" }}>Bewertung</span>
        </div>

        {p.stromkreise.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text3)", padding: "32px 0", fontSize: 13 }}>
            Noch keine Stromkreise — "Stromkreis hinzufügen"
          </div>
        )}

        {p.stromkreise.map((sk, idx) => {
          const status = evalStromkreis(sk);
          const open = expanded.has(sk.id);
          return (
            <div key={sk.id}>
              {/* Tabellenzeile */}
              <div
                onClick={() => toggleExpand(sk.id)}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 70px 70px 80px 70px 80px 100px",
                  gap: 4, padding: "9px 10px", cursor: "pointer",
                  borderBottom: open ? "none" : "1px solid var(--border)",
                  background: open ? "rgba(245,158,11,0.04)" : "transparent",
                  transition: "background 0.1s",
                  alignItems: "center",
                }}
                onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                  <span style={{ color: "var(--text3)", marginRight: 6, fontWeight: 400 }}>{idx + 1}.</span>
                  {sk.bezeichnung || <span style={{ color: "var(--text3)" }}>Unbenannt</span>}
                  {sk.dreipolig && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--purple)", fontWeight: 700 }}>3~</span>}
                  <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text3)" }}>
                    {open ? "▲" : "▼"}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  {sk.nennstrom ? `${sk.sicherungstyp}${sk.nennstrom}` : "—"}
                </span>
                <span style={{ fontSize: 12 }}>
                  {sk.pe_widerstand ? <span style={{ color: "var(--text2)" }}>{sk.pe_widerstand}</span> : <span style={{ color: "var(--text3)" }}>—</span>}
                </span>
                <span style={{ fontSize: 12 }}>
                  {risoMin(sk)
                    ? <Val val={risoMin(sk)} pass={v => v >= GW.riso_min} unit=" MΩ" />
                    : <span style={{ color: "var(--text3)" }}>—</span>}
                </span>
                <span style={{ fontSize: 12 }}>
                  {sk.zs ? <span style={{ color: "var(--text2)" }}>{sk.zs}</span> : <span style={{ color: "var(--text3)" }}>—</span>}
                </span>
                <span style={{ fontSize: 12 }}>
                  {sk.fi_vorhanden && sk.fi_t_nenn
                    ? <Val val={sk.fi_t_nenn} pass={v => v <= (sk.fi_typ === "S" ? GW.fi_t_s_nenn : GW.fi_t_nenn)} unit=" ms" />
                    : <span style={{ color: "var(--text3)" }}>{sk.fi_vorhanden ? "— (FI)" : "kein FI"}</span>}
                </span>
                <span style={{ textAlign: "right" }}>
                  <Badge status={status} />
                </span>
              </div>

              {/* Aufgeklapptes Formular */}
              {open && (
                <div style={{ padding: "0 0 12px 0", borderBottom: "1px solid var(--border)" }}>
                  <StromkreisForm
                    sk={sk}
                    onChange={updated => setStromkreis(sk.id, updated)}
                    onDelete={() => deleteStromkreis(sk.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fußzeile */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button style={bSec} onClick={onBack}>Abbrechen</button>
        <button style={bPrim} onClick={() => onSave(p)}>Speichern</button>
      </div>
    </div>
  );
}

// ── Protokoll-Liste ───────────────────────────────────────────────────────────
function ProtokollListe({ protokolle, onOpen, onNew, onImport, onDelete, dbSync }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Prüfprotokolle</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>VDE-Messungen & Prüfberichte</div>
        </div>
        <div style={{ flex: 1 }} />
        {dbSync && <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--bg3)", borderRadius: 6, padding: "3px 8px" }}>☁ Datenbank</span>}
        <button style={{ ...bSec }} onClick={onImport}>⚡ Aus Verteilerplaner</button>
        <button style={bPrim} onClick={onNew}>+ Neues Protokoll</button>
      </div>

      {protokolle.length === 0 ? (
        <div style={{
          background: "var(--bg2)", border: "1px dashed var(--border2)", borderRadius: 14,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ color: "var(--text3)", fontSize: 14, marginBottom: 12 }}>Noch keine Protokolle</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={bSec} onClick={onImport}>⚡ Aus Verteilerplaner importieren</button>
            <button style={{ ...bPrim }} onClick={onNew}>Leeres Protokoll erstellen</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {protokolle.map(p => {
            const statuses = p.stromkreise.map(evalStromkreis);
            const hatFehler = statuses.includes("fail");
            const alleOk = statuses.length > 0 && statuses.every(s => s === "ok");
            const gesamt = hatFehler ? "fail" : alleOk ? "ok" : "offen";

            return (
              <div
                key={p.id}
                style={{
                  background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12,
                  padding: "14px 16px", cursor: "pointer", transition: "border-color 0.15s, transform 0.1s",
                }}
                onClick={() => onOpen(p)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = AMBER + "60"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {p.auftraggeber || "Kein Auftraggeber"}
                      </span>
                      <Badge status={gesamt} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {p.anlagenstandort && <span>📍 {p.anlagenstandort}</span>}
                      {p.datum && <span>📅 {p.datum}</span>}
                      {p.pruefer && <span>👤 {p.pruefer}</span>}
                      {p.auftragnummer && <span>🔖 {p.auftragnummer}</span>}
                      <span style={{ color: "var(--text2)" }}>
                        {p.stromkreise.length} Stromkreis{p.stromkreise.length !== 1 ? "e" : ""}
                        {hatFehler && <span style={{ color: "var(--red)", marginLeft: 6 }}>• {statuses.filter(s => s === "fail").length} Fehler</span>}
                      </span>
                    </div>
                  </div>
                  <button
                    style={{ ...bDanger, padding: "5px 10px", fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); onDelete(p.id); }}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function Pruefprotokoll({ config = {} }) {
  const [protokolle, setProtokolleLive] = useState(load);
  const [aktiv, setAktiv]       = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [dbSync, setDbSync]     = useState(false);
  const { toasts, addToast } = useToasts();

  // ── Beim Start: Supabase laden
  useEffect(() => {
    loadProtokolleDB()
      .then(data => {
        if (data) { setProtokolleLive(data); save(data); setDbSync(true); }
      })
      .catch(() => {});
  }, []);

  function setProtokolle(fn) {
    setProtokolleLive(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(next);
      return next;
    });
  }

  function handleNew() {
    const p = mkProtokoll();
    if (config?.mitarbeiter) p.pruefer = config.mitarbeiter;
    setAktiv(p);
  }

  async function handleSave(p) {
    // Sofort lokal speichern
    setProtokolle(prev => {
      const exists = prev.find(x => x.id === p.id);
      return exists ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
    addToast("Protokoll gespeichert ✓");
    setAktiv(null);
    // Async Supabase-Sync
    try {
      const saved = await saveProtokollDB(p);
      if (saved) {
        setProtokolle(prev => prev.map(x => x.id === p.id ? { ...x, db_id: saved.db_id } : x));
      }
    } catch (e) {
      addToast("Datenbank-Sync fehlgeschlagen: " + e.message, "error");
    }
  }

  async function handleDelete(id) {
    const proto = protokolle.find(x => x.id === id);
    setProtokolle(prev => prev.filter(x => x.id !== id));
    addToast("Protokoll gelöscht", "error");
    if (proto?.db_id) {
      try { await deleteProtokollDB(proto.db_id); } catch (_) {}
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {showImport && (
        <ImportModal
          onSelect={p => { setShowImport(false); setAktiv(p); }}
          onClose={() => setShowImport(false)}
        />
      )}
      {aktiv ? (
        <ProtokollEditor
          protokoll={aktiv}
          onSave={handleSave}
          onBack={() => setAktiv(null)}
          config={config}
        />
      ) : (
        <ProtokollListe
          protokolle={protokolle}
          onOpen={setAktiv}
          onNew={handleNew}
          onImport={() => setShowImport(true)}
          onDelete={handleDelete}
          dbSync={dbSync}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}
