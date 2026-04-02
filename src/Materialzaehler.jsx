import React, { useState, useEffect, useRef } from "react";
import Toast from "./components/Toast.jsx";
import { useToasts } from "./lib/useToasts.js";
import { loadProjekteDB, saveProjektDB, deleteProjektDB } from "./lib/db_materialzaehler.js";
import { supabaseFehlermeldung } from "./lib/supabase.js";
import { uid } from "./lib/utils.js";

// ── Lokaler Speicher ──
const LS_KEY = "elektronikertools_materialzaehler";
function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function save(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d));
}

// ── Kategorien & Schnellauswahl ──
const KATEGORIEN = [
  "Steckdosen",
  "Schalter",
  "Dimmer",
  "Rahmen",
  "Dosen & Gehäuse",
  "Sonstiges",
];

const SCHNELLAUSWAHL = {
  "Steckdosen": [
    "Schuko-Steckdose (1-fach)",
    "Schuko-Steckdose (2-fach)",
    "Schuko-Steckdose (3-fach)",
    "USB-Steckdose Typ A+C",
    "Feuchtraum-Steckdose IP44",
    "CEE-Steckdose 16A blau",
    "CEE-Steckdose 32A blau",
    "CEE-Steckdose 32A rot",
  ],
  "Schalter": [
    "Ausschalter",
    "Wechselschalter",
    "Serienschalter",
    "Kreuzschalter",
    "Taster (Klingel)",
    "Taster (Licht)",
    "Jalousie-Schalter",
  ],
  "Dimmer": [
    "Dimmer Druckknopf",
    "Dimmer Drehknopf",
    "LED-Dimmer",
    "Dimmer mit Fernbedienung",
  ],
  "Rahmen": [
    "Rahmen 1-fach",
    "Rahmen 2-fach",
    "Rahmen 3-fach",
    "Rahmen 4-fach",
    "Rahmen 5-fach",
  ],
  "Dosen & Gehäuse": [
    "Gerätedose (Unterputz)",
    "Hohlwanddose",
    "Abzweigdose AP",
    "Kabelkanal 20×10mm",
    "Kabelkanal 40×20mm",
    "Leerrohr M20",
  ],
  "Sonstiges": [],
};

const KATEGORIE_FARBEN = {
  "Steckdosen":       "#84cc16",
  "Schalter":         "#38bdf8",
  "Dimmer":           "#a78bfa",
  "Rahmen":           "#fb923c",
  "Dosen & Gehäuse":  "#34d399",
  "Sonstiges":        "#94a3b8",
};

// ── Styles ──
const BTN = {
  primary: {
    background: "#84cc16", color: "#0d1a00", border: "none", borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14,
  },
  secondary: {
    background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14,
  },
  danger: {
    background: "transparent", color: "var(--red)", border: "1px solid var(--red)30",
    borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13,
  },
  ghost: {
    background: "transparent", color: "var(--text2)", border: "none",
    cursor: "pointer", fontSize: 18, padding: "4px 6px",
  },
};

const INPUT = {
  background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box",
};

// ── Hilfsfunktionen ──
function statusInfo(pos) {
  if (!pos.menge || pos.menge === 0) return { label: "—", color: "var(--text3)" };
  if (!pos.bestellt || pos.bestellt === 0) return { label: "Offen", color: "#f87171" };
  if (pos.bestellt < pos.menge) return { label: "Teils bestellt", color: "#fbbf24" };
  return { label: "Bestellt ✓", color: "#4ade80" };
}

function projektStats(projekt) {
  const pos = projekt.positionen || [];
  const gesamt = pos.reduce((s, p) => s + (p.menge || 0), 0);
  const bestellt = pos.reduce((s, p) => s + Math.min(p.bestellt || 0, p.menge || 0), 0);
  const offen = pos.filter(p => (p.menge || 0) > 0 && !(p.bestellt >= p.menge)).length;
  return { gesamt, bestellt, offen, anzahl: pos.length };
}

// ── Modal: Projekt anlegen/bearbeiten ──
function ProjektModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [ort, setOrt] = useState(initial?.ort || "");
  const [notiz, setNotiz] = useState(initial?.notiz || "");
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), ort: ort.trim(), notiz: notiz.trim() });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--bg2)", borderRadius: 16, padding: 28, maxWidth: 440,
        width: "100%", border: "1px solid var(--border)",
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--text)" }}>
          {initial ? "Projekt bearbeiten" : "Neues Projekt"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Projektname *</label>
            <input ref={nameRef} style={INPUT} value={name} onChange={e => setName(e.target.value)}
              placeholder="z.B. Wohnung Muster – EG" required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Ort / Adresse</label>
            <input style={INPUT} value={ort} onChange={e => setOrt(e.target.value)}
              placeholder="z.B. Musterstraße 1, 80333 München" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Notiz</label>
            <textarea style={{ ...INPUT, resize: "vertical", minHeight: 60 }} value={notiz}
              onChange={e => setNotiz(e.target.value)} placeholder="Optionale Anmerkungen..." />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" style={BTN.secondary} onClick={onClose}>Abbrechen</button>
            <button type="submit" style={{ ...BTN.primary, opacity: name.trim() ? 1 : 0.5 }}>Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Position hinzufügen/bearbeiten ──
function PositionModal({ initial, onSave, onClose }) {
  const [kategorie, setKategorie] = useState(initial?.kategorie || "Steckdosen");
  const [bezeichnung, setBezeichnung] = useState(initial?.bezeichnung || "");
  const [menge, setMenge] = useState(String(initial?.menge ?? ""));
  const [bestellt, setBestellt] = useState(String(initial?.bestellt ?? ""));
  const [notiz, setNotiz] = useState(initial?.notiz || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!bezeichnung.trim()) return;
    onSave({
      kategorie,
      bezeichnung: bezeichnung.trim(),
      menge: parseInt(menge) || 0,
      bestellt: parseInt(bestellt) || 0,
      notiz: notiz.trim(),
    });
  }

  function schnellWahl(name) {
    setBezeichnung(name);
  }

  const schnell = SCHNELLAUSWAHL[kategorie] || [];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--bg2)", borderRadius: 16, padding: 28, maxWidth: 500,
        width: "100%", border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--text)" }}>
          {initial ? "Position bearbeiten" : "Position hinzufügen"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Kategorie</label>
            <select style={{ ...INPUT }} value={kategorie} onChange={e => setKategorie(e.target.value)}>
              {KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {schnell.length > 0 && (
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 6 }}>Schnellauswahl</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {schnell.map(s => (
                  <button key={s} type="button" onClick={() => schnellWahl(s)} style={{
                    background: bezeichnung === s ? KATEGORIE_FARBEN[kategorie] + "30" : "var(--bg3, var(--bg))",
                    border: `1px solid ${bezeichnung === s ? KATEGORIE_FARBEN[kategorie] : "var(--border)"}`,
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                    color: bezeichnung === s ? KATEGORIE_FARBEN[kategorie] : "var(--text2)",
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Bezeichnung *</label>
            <input style={INPUT} value={bezeichnung} onChange={e => setBezeichnung(e.target.value)}
              placeholder="z.B. Schuko-Steckdose (1-fach)" required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Menge benötigt</label>
              <input style={INPUT} type="number" min="0" value={menge}
                onChange={e => setMenge(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Menge bestellt</label>
              <input style={INPUT} type="number" min="0" value={bestellt}
                onChange={e => setBestellt(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text3)", display: "block", marginBottom: 4 }}>Notiz</label>
            <input style={INPUT} value={notiz} onChange={e => setNotiz(e.target.value)}
              placeholder="z.B. Serie, Farbe, Hersteller..." />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={BTN.secondary} onClick={onClose}>Abbrechen</button>
            <button type="submit" style={{ ...BTN.primary, opacity: bezeichnung.trim() ? 1 : 0.5 }}>Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Druckansicht ──
function drucken(projekt) {
  const gruppen = KATEGORIEN.map(k => ({
    kategorie: k,
    positionen: (projekt.positionen || []).filter(p => p.kategorie === k),
  })).filter(g => g.positionen.length > 0);

  const zeilen = gruppen.map(g => `
    <tr><td colspan="4" style="background:#f0f4e8;font-weight:700;padding:6px 8px;border-top:2px solid #84cc16">${g.kategorie}</td></tr>
    ${g.positionen.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${p.bezeichnung}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700">${p.menge || 0}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${p.bestellt || 0}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${p.notiz || ""}</td>
      </tr>
    `).join("")}
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Materialliste – ${projekt.name}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;color:#111}table{width:100%;border-collapse:collapse}h1{font-size:18px;margin-bottom:4px}p{margin:2px 0;color:#555;font-size:12px}th{background:#84cc16;color:#0d1a00;padding:8px;text-align:left}@media print{body{margin:0}}</style>
  </head><body>
    <h1>Materialliste: ${projekt.name}</h1>
    ${projekt.ort ? `<p>Ort: ${projekt.ort}</p>` : ""}
    ${projekt.notiz ? `<p>Notiz: ${projekt.notiz}</p>` : ""}
    <p>Erstellt: ${new Date().toLocaleDateString("de-DE")}</p>
    <br>
    <table>
      <thead><tr><th>Bezeichnung</th><th style="width:80px;text-align:center">Benötigt</th><th style="width:80px;text-align:center">Bestellt</th><th>Notiz</th></tr></thead>
      <tbody>${zeilen}</tbody>
    </table>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ── Hauptkomponente ──
export default function Materialzaehler({ config = {} }) {
  const { toasts, addToast } = useToasts();
  const [projekte, setProjekteLive] = useState(() => load());
  const [aktivProjektId, setAktivProjektId] = useState(null);
  const [showProjektModal, setShowProjektModal] = useState(false);
  const [editProjekt, setEditProjekt] = useState(null);
  const [showPosModal, setShowPosModal] = useState(false);
  const [editPos, setEditPos] = useState(null);
  const [suchFilter, setSuchFilter] = useState("");
  const [katFilter, setKatFilter] = useState("Alle");

  // Aus DB laden
  useEffect(() => {
    loadProjekteDB()
      .then(data => { if (data) { setProjekteLive(data); save(data); } })
      .catch(e => addToast(supabaseFehlermeldung(e), "error"));
  }, [addToast]);

  function setProjekte(fn) {
    setProjekteLive(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(next);
      return next;
    });
  }

  const aktivProjekt = projekte.find(p => p.id === aktivProjektId) || null;

  // ── Projekt-Aktionen ──
  function neuesProjekt() { setEditProjekt(null); setShowProjektModal(true); }

  async function handleProjektSave({ name, ort, notiz }) {
    if (editProjekt) {
      const updated = { ...editProjekt, name, ort, notiz };
      setProjekte(prev => prev.map(p => p.id === editProjekt.id ? updated : p));
      addToast("Projekt gespeichert");
      try {
        const saved = await saveProjektDB(updated);
        if (saved) setProjekte(prev => prev.map(p => p.id === updated.id ? { ...p, db_id: saved.db_id } : p));
      } catch (e) { addToast(supabaseFehlermeldung(e), "error"); }
    } else {
      const neu = { id: uid(), name, ort, notiz, positionen: [], db_id: null };
      setProjekte(prev => [neu, ...prev]);
      addToast("Projekt angelegt");
      try {
        const saved = await saveProjektDB(neu);
        if (saved) setProjekte(prev => prev.map(p => p.id === neu.id ? { ...p, db_id: saved.db_id } : p));
      } catch (e) { addToast(supabaseFehlermeldung(e), "error"); }
    }
    setShowProjektModal(false);
  }

  async function handleProjektDelete(p) {
    if (!window.confirm(`Projekt „${p.name}" wirklich löschen?`)) return;
    if (aktivProjektId === p.id) setAktivProjektId(null);
    setProjekte(prev => prev.filter(x => x.id !== p.id));
    addToast("Projekt gelöscht");
    if (p.db_id) {
      try { await deleteProjektDB(p.db_id); } catch (e) { addToast(supabaseFehlermeldung(e), "error"); }
    }
  }

  // ── Positions-Aktionen ──
  function neuePosition() { setEditPos(null); setShowPosModal(true); }

  async function handlePosSave(data) {
    if (!aktivProjekt) return;
    let updated;
    if (editPos) {
      const pos = { ...editPos, ...data };
      updated = { ...aktivProjekt, positionen: aktivProjekt.positionen.map(p => p.id === editPos.id ? pos : p) };
    } else {
      const pos = { id: uid(), ...data };
      updated = { ...aktivProjekt, positionen: [...(aktivProjekt.positionen || []), pos] };
    }
    setProjekte(prev => prev.map(p => p.id === aktivProjekt.id ? updated : p));
    addToast("Position gespeichert");
    setShowPosModal(false);
    try {
      const saved = await saveProjektDB(updated);
      if (saved) setProjekte(prev => prev.map(p => p.id === updated.id ? { ...p, db_id: saved.db_id } : p));
    } catch (e) { addToast(supabaseFehlermeldung(e), "error"); }
  }

  function handlePosDelete(posId) {
    if (!aktivProjekt) return;
    const updated = { ...aktivProjekt, positionen: aktivProjekt.positionen.filter(p => p.id !== posId) };
    setProjekte(prev => prev.map(p => p.id === aktivProjekt.id ? updated : p));
    addToast("Position entfernt");
    saveProjektDB(updated).catch(e => addToast(supabaseFehlermeldung(e), "error"));
  }

  function handleMengeChange(posId, field, value) {
    if (!aktivProjekt) return;
    const updated = {
      ...aktivProjekt,
      positionen: aktivProjekt.positionen.map(p =>
        p.id === posId ? { ...p, [field]: Math.max(0, parseInt(value) || 0) } : p
      ),
    };
    setProjekte(prev => prev.map(p => p.id === aktivProjekt.id ? updated : p));
    saveProjektDB(updated).catch(e => addToast(supabaseFehlermeldung(e), "error"));
  }

  // ── Gefilterte Positionen ──
  const gefiltertePosi = (aktivProjekt?.positionen || []).filter(p => {
    const matchKat = katFilter === "Alle" || p.kategorie === katFilter;
    const matchSuche = !suchFilter || p.bezeichnung.toLowerCase().includes(suchFilter.toLowerCase()) || (p.notiz || "").toLowerCase().includes(suchFilter.toLowerCase());
    return matchKat && matchSuche;
  });

  const posiNachKat = KATEGORIEN.map(k => ({
    kategorie: k,
    farbe: KATEGORIE_FARBEN[k],
    positionen: gefiltertePosi.filter(p => p.kategorie === k),
  })).filter(g => g.positionen.length > 0);

  // ── Projektliste ──
  if (!aktivProjekt) {
    return (
      <div style={{ padding: "20px 16px", maxWidth: 860, margin: "0 auto" }}>
        <Toast toasts={toasts} />
        {showProjektModal && (
          <ProjektModal initial={editProjekt} onSave={handleProjektSave} onClose={() => setShowProjektModal(false)} />
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)" }}>
              🔌 Materialzähler
            </h2>
            <div style={{ color: "var(--text3)", fontSize: 13, marginTop: 2 }}>
              Steckdosen, Schalter, Rahmen & Co. pro Projekt zählen
            </div>
          </div>
          <button style={BTN.primary} onClick={neuesProjekt}>+ Neues Projekt</button>
        </div>

        {/* Projektliste */}
        {projekte.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px", color: "var(--text3)",
            border: "2px dashed var(--border)", borderRadius: 16,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Noch keine Projekte</div>
            <div style={{ fontSize: 14 }}>Lege ein Projekt an, um Material zu erfassen.</div>
            <button style={{ ...BTN.primary, marginTop: 20 }} onClick={neuesProjekt}>Erstes Projekt anlegen</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {projekte.map(p => {
              const stats = projektStats(p);
              const fortschritt = stats.gesamt > 0 ? Math.round((stats.bestellt / stats.gesamt) * 100) : 0;
              return (
                <div key={p.id} style={{
                  background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14,
                  padding: "18px 20px", cursor: "pointer", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#84cc16"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                  onClick={() => setAktivProjektId(p.id)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 2 }}>{p.name}</div>
                      {p.ort && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>📍 {p.ort}</div>}
                      {p.notiz && <div style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>{p.notiz}</div>}

                      {/* Fortschrittsbalken */}
                      {stats.anzahl > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
                            <span>{stats.anzahl} Position{stats.anzahl !== 1 ? "en" : ""} · {stats.gesamt} Stk gesamt</span>
                            <span>{fortschritt}% bestellt</span>
                          </div>
                          <div style={{ height: 6, background: "var(--bg)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${fortschritt}%`, background: fortschritt === 100 ? "#4ade80" : "#84cc16", borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                          {stats.offen > 0 && (
                            <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 4 }}>
                              ⚠ {stats.offen} Position{stats.offen !== 1 ? "en" : ""} noch offen
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Aktionen */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button style={BTN.ghost} title="Bearbeiten" onClick={() => { setEditProjekt(p); setShowProjektModal(true); }}>✏️</button>
                      <button style={BTN.ghost} title="Löschen" onClick={() => handleProjektDelete(p)}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Detailansicht (Positionen) ──
  const stats = projektStats(aktivProjekt);

  return (
    <div style={{ padding: "20px 16px", maxWidth: 900, margin: "0 auto" }}>
      <Toast toasts={toasts} />
      {showProjektModal && (
        <ProjektModal initial={editProjekt} onSave={handleProjektSave} onClose={() => setShowProjektModal(false)} />
      )}
      {showPosModal && (
        <PositionModal initial={editPos} onSave={handlePosSave} onClose={() => setShowPosModal(false)} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button style={{ ...BTN.ghost, fontSize: 14, color: "var(--text3)", padding: "4px 0", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}
          onClick={() => { setAktivProjektId(null); setSuchFilter(""); setKatFilter("Alle"); }}>
          ← Alle Projekte
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{aktivProjekt.name}</h2>
            {aktivProjekt.ort && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>📍 {aktivProjekt.ort}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={BTN.secondary} onClick={() => drucken(aktivProjekt)}>🖨 Drucken</button>
            <button style={BTN.primary} onClick={neuePosition}>+ Position</button>
          </div>
        </div>

        {/* Statistik-Chips */}
        {stats.anzahl > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>
              <b style={{ color: "var(--text)" }}>{stats.anzahl}</b> Positionen
            </span>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>
              <b style={{ color: "var(--text)" }}>{stats.gesamt}</b> Stk gesamt
            </span>
            <span style={{ fontSize: 13, color: stats.offen > 0 ? "#fbbf24" : "#4ade80" }}>
              {stats.offen > 0 ? `⚠ ${stats.offen} offen` : "✓ Alles bestellt"}
            </span>
          </div>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...INPUT, maxWidth: 220 }} value={suchFilter} onChange={e => setSuchFilter(e.target.value)}
          placeholder="🔍 Suchen..." />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["Alle", ...KATEGORIEN].map(k => (
            <button key={k} onClick={() => setKatFilter(k)} style={{
              background: katFilter === k ? (KATEGORIE_FARBEN[k] || "#84cc16") : "var(--bg2)",
              color: katFilter === k ? (k === "Alle" ? "#0d1a00" : "#0d1a00") : "var(--text2)",
              border: `1px solid ${katFilter === k ? (KATEGORIE_FARBEN[k] || "#84cc16") : "var(--border)"}`,
              borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: katFilter === k ? 700 : 400,
            }}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Positionsliste */}
      {aktivProjekt.positionen.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "50px 20px", color: "var(--text3)",
          border: "2px dashed var(--border)", borderRadius: 16,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔌</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Noch keine Positionen</div>
          <div style={{ fontSize: 13 }}>Füge Steckdosen, Schalter, Rahmen etc. hinzu.</div>
          <button style={{ ...BTN.primary, marginTop: 20 }} onClick={neuePosition}>Erste Position hinzufügen</button>
        </div>
      ) : gefiltertePosi.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)" }}>
          Keine Positionen für den gewählten Filter.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {posiNachKat.map(({ kategorie, farbe, positionen }) => (
            <div key={kategorie}>
              {/* Kategorie-Header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                borderBottom: `2px solid ${farbe}40`, paddingBottom: 6,
              }}>
                <span style={{
                  background: farbe + "20", color: farbe, fontSize: 11, fontWeight: 700,
                  padding: "2px 10px", borderRadius: 20, border: `1px solid ${farbe}40`,
                }}>
                  {kategorie}
                </span>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {positionen.length} Position{positionen.length !== 1 ? "en" : ""} ·{" "}
                  {positionen.reduce((s, p) => s + (p.menge || 0), 0)} Stk
                </span>
              </div>

              {/* Positions-Zeilen */}
              <div style={{ display: "grid", gap: 6 }}>
                {positionen.map(pos => {
                  const st = statusInfo(pos);
                  return (
                    <div key={pos.id} style={{
                      background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10,
                      padding: "10px 14px", display: "grid",
                      gridTemplateColumns: "1fr auto auto auto auto",
                      alignItems: "center", gap: 10,
                    }}>
                      {/* Bezeichnung */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{pos.bezeichnung}</div>
                        {pos.notiz && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{pos.notiz}</div>}
                      </div>

                      {/* Status-Badge */}
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, whiteSpace: "nowrap" }}>
                        {st.label}
                      </span>

                      {/* Menge benötigt */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>Ben.:</span>
                        <input
                          type="number" min="0" value={pos.menge || 0}
                          onChange={e => handleMengeChange(pos.id, "menge", e.target.value)}
                          style={{ width: 56, textAlign: "center", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 14, fontWeight: 700 }}
                        />
                      </div>

                      {/* Menge bestellt */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>Best.:</span>
                        <input
                          type="number" min="0" value={pos.bestellt || 0}
                          onChange={e => handleMengeChange(pos.id, "bestellt", e.target.value)}
                          style={{ width: 56, textAlign: "center", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 14, fontWeight: 700, color: pos.bestellt >= pos.menge && pos.menge > 0 ? "#4ade80" : "var(--text)" }}
                        />
                      </div>

                      {/* Aktionen */}
                      <div style={{ display: "flex", gap: 2 }}>
                        <button style={BTN.ghost} title="Bearbeiten"
                          onClick={() => { setEditPos(pos); setShowPosModal(true); }}>✏️</button>
                        <button style={BTN.ghost} title="Löschen"
                          onClick={() => handlePosDelete(pos.id)}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
