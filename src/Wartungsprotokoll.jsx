import React, { useState, useEffect } from "react";
import Toast from "./components/Toast.jsx";
import { useToasts } from "./lib/useToasts.js";
import { loadWartungDB, saveWartungDB, deleteWartungDB } from "./lib/db_wartung.js";
import { supabaseFehlermeldung } from "./lib/supabase.js";
import { uid } from "./lib/utils.js";

// Module-level constants (avoid calling impure Date.now() during render)
const HEUTE = new Date().toISOString().slice(0, 10);
const IN30  = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

// ── Intervall-Definitionen ──────────────────────────────────────────────────
const INTERVALLE = [
  { wert: "monatlich",        label: "Monatlich",        monate: 1  },
  { wert: "vierteljaehrlich", label: "Vierteljährlich",  monate: 3  },
  { wert: "halbjaehrlich",    label: "Halbjährlich",     monate: 6  },
  { wert: "jaehrlich",        label: "Jährlich",         monate: 12 },
  { wert: "2jaehrlich",       label: "2-jährlich",       monate: 24 },
];

const KATEGORIEN = [
  "E-Check",
  "Blitzschutz",
  "Notbeleuchtung",
  "Brandschutz",
  "Aufzug",
  "Heizung / Lüftung",
  "Allgemein",
  "Sonstige",
];

function intervallMonate(wert) {
  return INTERVALLE.find(i => i.wert === wert)?.monate ?? 12;
}

function addMonate(dateStr, n) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function calcNaechste(aufgabe) {
  if (!aufgabe.letzte) return "";
  return addMonate(aufgabe.letzte, intervallMonate(aufgabe.intervall));
}

function statusInfo(naechste) {
  if (!naechste) return { label: "offen", color: "var(--text3)", bg: "rgba(255,255,255,0.06)" };
  const heute = new Date().toISOString().slice(0, 10);
  const diff  = Math.floor((new Date(naechste) - new Date(heute)) / 864e5);
  if (diff < 0)   return { label: `${Math.abs(diff)} Tage überfällig`, color: "var(--red)",   bg: "rgba(255,59,48,0.12)" };
  if (diff <= 30) return { label: `in ${diff} Tagen fällig`,           color: "#f59e0b",      bg: "rgba(245,158,11,0.12)" };
  return              { label: `in ${diff} Tagen`,                     color: "var(--green)", bg: "rgba(61,204,126,0.10)" };
}

function formatDate(str) {
  if (!str) return "–";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const mkAufgabe = () => ({
  id: uid(),
  bezeichnung: "",
  kategorie: "Allgemein",
  intervall: "jaehrlich",
  letzte: "",
  naechste: "",
  zustaendig: "",
  notiz: "",
});

// ── Eingabe-Stil Helfer ─────────────────────────────────────────────────────
const inp = (extra = {}) => ({
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text)", padding: "9px 12px", fontSize: 14, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...extra,
});

const btnStyle = (bg, color, extra = {}) => ({
  background: bg, color, border: `1px solid ${color}50`, borderRadius: 8,
  padding: "9px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, ...extra,
});

// ══════════════════════════════════════════════════════════════════════════════
export default function Wartungsprotokoll() {
  const { toasts, addToast } = useToasts();
  const [aufgaben, setAufgaben] = useState([]);
  const [editAufgabe, setEditAufgabe] = useState(null);
  const [filterKat, setFilterKat] = useState("Alle");
  const [sortBy, setSortBy]       = useState("naechste");
  const [suchtext, setSuchtext]   = useState("");

  // Laden
  useEffect(() => {
    loadWartungDB()
      .then(data => setAufgaben(data))
      .catch(e => addToast(supabaseFehlermeldung(e), "error"));
  }, [addToast]);

  // Speichern
  async function speichern(a) {
    const updated = { ...a, naechste: calcNaechste(a) };
    try {
      await saveWartungDB(updated);
      setAufgaben(prev => {
        const idx = prev.findIndex(x => x.id === updated.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
        return [...prev, updated];
      });
      addToast("Gespeichert");
      setEditAufgabe(null);
    } catch (e) {
      addToast(supabaseFehlermeldung(e), "error");
    }
  }

  async function loeschen(id) {
    if (!confirm("Aufgabe löschen?")) return;
    try {
      await deleteWartungDB(id);
      setAufgaben(prev => prev.filter(a => a.id !== id));
      addToast("Gelöscht");
    } catch (e) {
      addToast(supabaseFehlermeldung(e), "error");
    }
  }

  // Als erledigt markieren: setzt letzte auf heute → naechste neu berechnet
  async function erledigt(aufgabe) {
    const heute = new Date().toISOString().slice(0, 10);
    await speichern({ ...aufgabe, letzte: heute });
  }

  // Filtern & Sortieren
  const kategorien = ["Alle", ...KATEGORIEN];

  let liste = aufgaben.filter(a => {
    if (filterKat !== "Alle" && a.kategorie !== filterKat) return false;
    if (suchtext && !a.bezeichnung.toLowerCase().includes(suchtext.toLowerCase())) return false;
    return true;
  });

  if (sortBy === "naechste") {
    liste = [...liste].sort((a, b) => {
      if (!a.naechste && !b.naechste) return 0;
      if (!a.naechste) return 1;
      if (!b.naechste) return -1;
      return a.naechste.localeCompare(b.naechste);
    });
  } else if (sortBy === "bezeichnung") {
    liste = [...liste].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung));
  } else if (sortBy === "kategorie") {
    liste = [...liste].sort((a, b) => a.kategorie.localeCompare(b.kategorie));
  }

  const faelligCount = aufgaben.filter(a => a.naechste && a.naechste < HEUTE).length;

  return (
    <div style={{ padding: "20px 16px", maxWidth: 900, margin: "0 auto", color: "var(--text)" }}>
      <Toast toasts={toasts} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#a855f7" }}>🔧 Wartungsprotokoll</h2>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            {aufgaben.length} Aufgaben
            {faelligCount > 0 && <span style={{ color: "var(--red)", marginLeft: 8 }}>· {faelligCount} überfällig</span>}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditAufgabe(mkAufgabe())} style={btnStyle("rgba(168,85,247,0.15)", "#a855f7")}>
          + Neue Aufgabe
        </button>
        <button onClick={() => window.print()} style={btnStyle("var(--bg2)", "var(--text3)", { padding: "9px 14px" })} title="Drucken">
          🖨
        </button>
      </div>

      {/* Filter-Leiste */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Suche…"
          value={suchtext}
          onChange={e => setSuchtext(e.target.value)}
          style={{ ...inp(), width: 160, padding: "7px 12px", fontSize: 13 }}
        />
        <select value={filterKat} onChange={e => setFilterKat(e.target.value)} style={{ ...inp(), width: "auto" }}>
          {kategorien.map(k => <option key={k}>{k}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp(), width: "auto" }}>
          <option value="naechste">Sortiert: Fälligkeit</option>
          <option value="bezeichnung">Sortiert: Name</option>
          <option value="kategorie">Sortiert: Kategorie</option>
        </select>
      </div>

      {/* Liste */}
      {liste.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Keine Wartungsaufgaben</div>
          <div style={{ fontSize: 13 }}>Erstelle die erste Aufgabe mit „+ Neue Aufgabe"</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liste.map(a => {
            const st = statusInfo(a.naechste);
            return (
              <div key={a.id} style={{
                background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14,
                padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16,
                borderLeft: `4px solid ${st.color}`,
              }}>
                {/* Status-Indikator */}
                <div style={{
                  minWidth: 10, minHeight: 10, width: 10, height: 10,
                  borderRadius: "50%", background: st.color, marginTop: 6,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{a.bezeichnung || "Unbenannte Aufgabe"}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6,
                      background: "rgba(168,85,247,0.12)", color: "#a855f7", fontWeight: 600,
                    }}>{a.kategorie}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: st.bg, color: st.color, fontWeight: 600 }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span>Intervall: {INTERVALLE.find(i => i.wert === a.intervall)?.label ?? a.intervall}</span>
                    {a.letzte && <span>Zuletzt: {formatDate(a.letzte)}</span>}
                    {a.naechste && <span>Nächste: <strong style={{ color: st.color }}>{formatDate(a.naechste)}</strong></span>}
                    {a.zustaendig && <span>Zuständig: {a.zustaendig}</span>}
                  </div>
                  {a.notiz && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, fontStyle: "italic" }}>{a.notiz}</div>}
                </div>

                {/* Aktionen */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => erledigt(a)}
                    title="Als heute erledigt markieren"
                    style={{ background: "rgba(61,204,126,0.1)", border: "1px solid rgba(61,204,126,0.3)", color: "var(--green)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >✓ Erledigt</button>
                  <button
                    onClick={() => setEditAufgabe({ ...a })}
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text2)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}
                  >✎</button>
                  <button
                    onClick={() => loeschen(a.id)}
                    style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", color: "var(--red)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit-Modal */}
      {editAufgabe && (
        <AufgabeModal
          aufgabe={editAufgabe}
          onChange={setEditAufgabe}
          onSave={() => speichern(editAufgabe)}
          onClose={() => setEditAufgabe(null)}
        />
      )}
    </div>
  );
}

// ── Edit-Modal ──────────────────────────────────────────────────────────────
function AufgabeModal({ aufgabe, onChange, onSave, onClose }) {
  function set(key, val) { onChange(a => ({ ...a, [key]: val })); }

  const preview = calcNaechste(aufgabe);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18,
        padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {aufgabe.bezeichnung ? `✎ ${aufgabe.bezeichnung}` : "Neue Aufgabe"}
          </h3>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label>
            <div style={labelStyle}>Bezeichnung *</div>
            <input
              autoFocus
              value={aufgabe.bezeichnung}
              onChange={e => set("bezeichnung", e.target.value)}
              placeholder="z.B. E-Check Bürogebäude"
              style={inp()}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <div style={labelStyle}>Kategorie</div>
              <select value={aufgabe.kategorie} onChange={e => set("kategorie", e.target.value)} style={inp()}>
                {KATEGORIEN.map(k => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label>
              <div style={labelStyle}>Intervall</div>
              <select value={aufgabe.intervall} onChange={e => set("intervall", e.target.value)} style={inp()}>
                {INTERVALLE.map(i => <option key={i.wert} value={i.wert}>{i.label}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <div style={labelStyle}>Zuletzt durchgeführt</div>
              <input type="date" value={aufgabe.letzte} onChange={e => set("letzte", e.target.value)} style={inp()} />
            </label>
            <div>
              <div style={labelStyle}>Nächste Fälligkeit</div>
              <div style={{
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
                padding: "9px 12px", fontSize: 14, color: preview ? "#a855f7" : "var(--text3)",
              }}>
                {preview ? formatDate(preview) : "— (Datum eintragen)"}
              </div>
            </div>
          </div>

          <label>
            <div style={labelStyle}>Zuständig</div>
            <input
              value={aufgabe.zustaendig}
              onChange={e => set("zustaendig", e.target.value)}
              placeholder="Name oder Firma"
              style={inp()}
            />
          </label>

          <label>
            <div style={labelStyle}>Notiz</div>
            <textarea
              value={aufgabe.notiz}
              onChange={e => set("notiz", e.target.value)}
              rows={3}
              placeholder="Zusätzliche Hinweise…"
              style={{ ...inp(), resize: "vertical" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnStyle("var(--bg3)", "var(--text2)")}>Abbrechen</button>
          <button
            onClick={onSave}
            disabled={!aufgabe.bezeichnung.trim()}
            style={btnStyle("rgba(168,85,247,0.15)", "#a855f7", { opacity: aufgabe.bezeichnung.trim() ? 1 : 0.4 })}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 };
