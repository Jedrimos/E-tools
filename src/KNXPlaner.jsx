/**
 * KNX-Planer – Gruppenadress-Planer, Raumplan, Inbetriebnahme-Checkliste, KNX-Rechner
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ladeGA, speichereGA, loescheGA,
  ladeRaeume, speichereRaum, loescheRaum,
  ladeCheckliste, speichereCheckItem, loescheCheckItem,
} from "./lib/db_knx.js";

const AKZENT = "#e11d48";

// ── Stil-Helfer ──────────────────────────────────────────────────────────────
const inp = (extra = {}) => ({
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text)", padding: "9px 12px", fontSize: 14, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", width: "100%", ...extra,
});
const card = (extra = {}) => ({
  background: "var(--bg2)", border: "1px solid var(--border)",
  borderRadius: 14, padding: "16px", ...extra,
});
const btn = (color = AKZENT, extra = {}) => ({
  background: color, color: "#fff", border: "none", borderRadius: 8,
  padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, ...extra,
});
const btnGhost = (extra = {}) => ({
  background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text2)", cursor: "pointer", fontSize: 13, padding: "7px 12px", ...extra,
});
const lbl = { fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" };

// ── KNX-Konstanten ───────────────────────────────────────────────────────────
const FUNKTIONEN = ["Licht", "Dimmen", "Jalousie", "Heizung", "Szene", "Schalten", "Wert", "Status"];
const FUNK_FARBE = {
  Licht:     "#f59e0b", Dimmen:   "#f97316", Jalousie: "#06b6d4",
  Heizung:   "#ef4444", Szene:    "#a855f7", Schalten: "#3dcc7e",
  Wert:      "#0ea5e9", Status:   "#6b7280",
};
const DPT_LISTE = [
  { wert: "1.001", label: "1.001 – Schalten (EIN/AUS)" },
  { wert: "1.008", label: "1.008 – Aufwärts/Abwärts" },
  { wert: "1.009", label: "1.009 – Öffnen/Schließen" },
  { wert: "3.007", label: "3.007 – Dimmen (relativ)" },
  { wert: "3.008", label: "3.008 – Jalousie (relativ)" },
  { wert: "5.001", label: "5.001 – Prozentwert 0–100 %" },
  { wert: "5.010", label: "5.010 – Zählwert 0–255" },
  { wert: "9.001", label: "9.001 – Temperatur (°C)" },
  { wert: "9.007", label: "9.007 – Feuchte (%)" },
  { wert: "14.056", label: "14.056 – Leistung (W)" },
  { wert: "17.001", label: "17.001 – Szene (1–64)" },
  { wert: "18.001", label: "18.001 – Szene aktivieren/speichern" },
  { wert: "20.102", label: "20.102 – HVAC-Modus" },
];
const ETAGEN = ["UG", "EG", "OG1", "OG2", "DG", "Außen"];
const RAUM_TYPEN = ["Wohnzimmer", "Schlafzimmer", "Küche", "Bad", "Flur", "Büro", "Keller", "Garage", "Außen", "Technik"];
const CHECK_TEMPLATES = {
  Licht:     ["Schaltaktor getestet (EIN/AUS)", "Rückmeldeobjekt prüfen", "Szenen testen"],
  Dimmen:    ["Dimmaktor kalibrieren", "Minimalhelligkeit einstellen", "Dimmszenen testen", "Soft-Start/-Stop prüfen"],
  Jalousie:  ["Endlagen einlernen", "Fahrzeit messen", "Lamellenwinkel einstellen", "Sicherheitsobjekte testen"],
  Heizung:   ["Regler Grundeinstellung prüfen", "Sollwert-Offset justieren", "Ventil 100% öffnen/schließen testen"],
  Szene:     ["Szene 1–8 testen", "Rückmeldung prüfen", "Abspeichern aktivieren"],
  Allgemein: ["Busspannung 29 V DC prüfen", "Alle Taster testen", "ETS-Download erfolgreich", "Topologie dokumentiert"],
};

// ── Hilfs-Funktionen ─────────────────────────────────────────────────────────
function gaStr(h, m, u) { return `${h}/${m}/${u}`; }
function gaInt(h, m, u) { return ((h & 0x1F) << 11) | ((m & 0x07) << 8) | (u & 0xFF); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function csvExport(gaListe, raeume) {
  const raumMap = Object.fromEntries(raeume.map(r => [r.id, r.name]));
  const header = "Gruppenadresse;Name;DPT;Funktion;Raum;Dezimal;Notiz";
  const rows = [...gaListe]  // shallow copy to avoid mutating React state
    .sort((a, b) => gaInt(a.hauptgruppe, a.mittelgruppe, a.untergruppe) - gaInt(b.hauptgruppe, b.mittelgruppe, b.untergruppe))
    .map(ga => [
      gaStr(ga.hauptgruppe, ga.mittelgruppe, ga.untergruppe),
      ga.name, ga.dpt, ga.funktion,
      raumMap[ga.raum_id] || "",
      gaInt(ga.hauptgruppe, ga.mittelgruppe, ga.untergruppe),
      ga.notiz || "",
    ].join(";"));
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `knx_gruppen_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Chip / Badge ─────────────────────────────────────────────────────────────
function FunkBadge({ funktion, small }) {
  const c = FUNK_FARBE[funktion] || "#6b7280";
  return (
    <span style={{
      background: `${c}22`, color: c, border: `1px solid ${c}44`,
      borderRadius: 6, padding: small ? "1px 6px" : "3px 8px",
      fontSize: small ? 10 : 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{funktion}</span>
  );
}

// ── GA-Formular ──────────────────────────────────────────────────────────────
const GA_FORM_DEFAULT = { hauptgruppe: 1, mittelgruppe: 0, untergruppe: 1, name: "", funktion: "Licht", dpt: "1.001", raum_id: "", notiz: "" };

function GAForm({ initial, raeume, onSave, onCancel }) {
  const [form, setForm] = useState(initial || GA_FORM_DEFAULT);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Sync form when switching between different GAs to edit
  useEffect(() => {
    setForm(initial || GA_FORM_DEFAULT);
  }, [initial?.id]);
  const valid = form.name.trim() && form.hauptgruppe >= 0 && form.hauptgruppe <= 31
    && form.mittelgruppe >= 0 && form.mittelgruppe <= 7
    && form.untergruppe >= 0 && form.untergruppe <= 255;

  return (
    <div style={{ ...card(), border: `1px solid ${AKZENT}40`, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: AKZENT, marginBottom: 14 }}>
        {initial?.id ? "Gruppenadresse bearbeiten" : "Neue Gruppenadresse"}
      </div>

      {/* Adresse */}
      <div style={{ marginBottom: 12 }}>
        <span style={lbl}>Gruppenadresse (HG / MG / UG)</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" min={0} max={31} value={form.hauptgruppe}
            onChange={e => set("hauptgruppe", Number(e.target.value))}
            style={inp({ width: 60, textAlign: "center" })} />
          <span style={{ color: "var(--text3)", fontWeight: 700 }}>/</span>
          <input type="number" min={0} max={7} value={form.mittelgruppe}
            onChange={e => set("mittelgruppe", Number(e.target.value))}
            style={inp({ width: 60, textAlign: "center" })} />
          <span style={{ color: "var(--text3)", fontWeight: 700 }}>/</span>
          <input type="number" min={0} max={255} value={form.untergruppe}
            onChange={e => set("untergruppe", Number(e.target.value))}
            style={inp({ width: 70, textAlign: "center" })} />
          <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4, fontFamily: "var(--mono)" }}>
            = {gaInt(form.hauptgruppe, form.mittelgruppe, form.untergruppe)}
          </span>
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 12 }}>
        <span style={lbl}>Bezeichnung</span>
        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="z.B. Wohnzimmer Licht EIN"
          style={inp()} />
      </div>

      {/* Funktion + DPT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <span style={lbl}>Funktion</span>
          <select value={form.funktion} onChange={e => set("funktion", e.target.value)} style={inp()}>
            {FUNKTIONEN.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <span style={lbl}>DPT (Datentyp)</span>
          <select value={form.dpt} onChange={e => set("dpt", e.target.value)} style={inp()}>
            {DPT_LISTE.map(d => <option key={d.wert} value={d.wert}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* Raum */}
      <div style={{ marginBottom: 12 }}>
        <span style={lbl}>Raum (optional)</span>
        <select value={form.raum_id || ""} onChange={e => set("raum_id", e.target.value)} style={inp()}>
          <option value="">— Kein Raum —</option>
          {raeume.map(r => <option key={r.id} value={r.id}>{r.etage} · {r.name}</option>)}
        </select>
      </div>

      {/* Notiz */}
      <div style={{ marginBottom: 14 }}>
        <span style={lbl}>Notiz (optional)</span>
        <input value={form.notiz || ""} onChange={e => set("notiz", e.target.value)} placeholder="Hinweise, Gerät-ID…"
          style={inp()} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => valid && onSave(form)} style={btn(valid ? AKZENT : "#444")}>Speichern</button>
        <button onClick={onCancel} style={btnGhost()}>Abbrechen</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1: Gruppenadress-Planer
// ══════════════════════════════════════════════════════════════════════════════
function TabGA({ gaListe, raeume, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [editGA, setEditGA] = useState(null);
  const [filterFunk, setFilterFunk] = useState("Alle");
  const [filterHG, setFilterHG] = useState("Alle");
  const [suche, setSuche] = useState("");

  const hgListe = useMemo(() =>
    [...new Set(gaListe.map(g => g.hauptgruppe))].sort((a, b) => a - b),
    [gaListe]
  );

  const sucheLower = suche.toLowerCase();
  const gefiltert = useMemo(() =>
    gaListe.filter(g => {
      if (filterFunk !== "Alle" && g.funktion !== filterFunk) return false;
      if (filterHG !== "Alle" && g.hauptgruppe !== Number(filterHG)) return false;
      if (sucheLower && !g.name.toLowerCase().includes(sucheLower)) return false;
      return true;
    }).sort((a, b) => gaInt(a.hauptgruppe, a.mittelgruppe, a.untergruppe) - gaInt(b.hauptgruppe, b.mittelgruppe, b.untergruppe)),
    [gaListe, filterFunk, filterHG, sucheLower]
  );

  // Gruppiert nach HG
  const grouped = useMemo(() => {
    const g = {};
    gefiltert.forEach(ga => {
      if (!g[ga.hauptgruppe]) g[ga.hauptgruppe] = [];
      g[ga.hauptgruppe].push(ga);
    });
    return g;
  }, [gefiltert]);

  const raumMap = useMemo(() => Object.fromEntries(raeume.map(r => [r.id, r])), [raeume]);

  async function handleSave(form) {
    await speichereGA({ ...form, id: editGA?.id || uid() });
    setShowForm(false); setEditGA(null);
    onReload();
  }

  async function handleDelete(ga) {
    if (!confirm(`"${ga.name}" löschen?`)) return;
    await loescheGA(ga.id);
    onReload();
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => { setEditGA(null); setShowForm(true); }}
          style={btn(AKZENT, { display: "flex", alignItems: "center", gap: 6 })}>
          + GA hinzufügen
        </button>
        <button onClick={() => csvExport(gaListe, raeume)} style={btnGhost()}>⬇ CSV Export</button>
        <div style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 12 }}>
          {gefiltert.length}/{gaListe.length} Adressen
        </div>
      </div>

      {/* Filter */}
      <div style={{ ...card(), marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={suche} onChange={e => setSuche(e.target.value)} placeholder="Suchen…"
            style={inp({ flex: "1 1 140px", padding: "7px 10px", fontSize: 13 })} />
          <select value={filterHG} onChange={e => setFilterHG(e.target.value)} style={inp({ flex: "0 1 130px", padding: "7px 10px", fontSize: 13 })}>
            <option value="Alle">Alle HG</option>
            {hgListe.map(h => <option key={h} value={h}>HG {h}</option>)}
          </select>
          <select value={filterFunk} onChange={e => setFilterFunk(e.target.value)} style={inp({ flex: "0 1 130px", padding: "7px 10px", fontSize: 13 })}>
            <option value="Alle">Alle Funkt.</option>
            {FUNKTIONEN.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Formular */}
      {(showForm || editGA) && (
        <GAForm
          initial={editGA}
          raeume={raeume}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditGA(null); }}
        />
      )}

      {/* GA-Liste */}
      {gaListe.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text3)" }}>
          Noch keine Gruppenadresse angelegt. Klick auf "+ GA hinzufügen"
        </div>
      )}
      {gaListe.length > 0 && gefiltert.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text3)" }}>
          Keine Ergebnisse für den aktuellen Filter
        </div>
      )}

      {Object.entries(grouped).map(([hg, gas]) => (
        <div key={hg} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: AKZENT, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
            Hauptgruppe {hg} · {gas.length} Objekte
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gas.map(ga => {
              const raum = raumMap[ga.raum_id];
              return (
                <div key={ga.id} style={{ ...card(), display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: AKZENT, flexShrink: 0, minWidth: 68 }}>
                    {gaStr(ga.hauptgruppe, ga.mittelgruppe, ga.untergruppe)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ga.name}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <FunkBadge funktion={ga.funktion} small />
                      <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{ga.dpt}</span>
                      {raum && <span style={{ fontSize: 10, color: "var(--text3)" }}>📍 {raum.name}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", gap: 4 }}>
                    <button onClick={() => { setEditGA(ga); setShowForm(false); }}
                      style={btnGhost({ padding: "5px 8px", fontSize: 12 })}>✏</button>
                    <button onClick={() => handleDelete(ga)}
                      style={btnGhost({ padding: "5px 8px", fontSize: 12, color: "#ef4444", borderColor: "#ef444440" })}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2: Raumplan
// ══════════════════════════════════════════════════════════════════════════════
function TabRaeume({ gaListe, raeume, onReload }) {
  const [aktEtage, setAktEtage] = useState(null);
  const [showRaumForm, setShowRaumForm] = useState(false);
  const [raumForm, setRaumForm] = useState({ name: "", etage: "EG", typ: "Wohnzimmer" });
  const [zuweisenRA, setZuweisenRA] = useState(null); // raum_id für GA-Zuweisung

  const etagen = [...new Set(raeume.map(r => r.etage))];
  const akt = aktEtage || etagen[0] || "EG";
  const gefRaeume = raeume.filter(r => r.etage === akt);

  async function raumSpeichern() {
    const etage = raumForm.etage;
    await speichereRaum({ ...raumForm, id: uid(), position: raeume.length });
    setShowRaumForm(false);
    setRaumForm({ name: "", etage: "EG", typ: "Wohnzimmer" });
    setAktEtage(etage); // jump to the new room's floor
    onReload();
  }

  async function raumLoeschen(id) {
    if (!confirm("Raum löschen?")) return;
    const betroffene = gaListe.filter(g => g.raum_id === id);
    await Promise.all([
      loescheRaum(id),
      ...betroffene.map(ga => speichereGA({ ...ga, raum_id: "" })),
    ]);
    onReload();
  }

  async function gaZuweisen(ga, raumId) {
    await speichereGA({ ...ga, raum_id: raumId || "" });
    onReload();
  }

  return (
    <div>
      {/* Etage-Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {ETAGEN.filter(e => etagen.includes(e)).map(e => (
          <button key={e} onClick={() => setAktEtage(e)}
            style={{
              padding: "7px 14px", borderRadius: 20, border: `2px solid ${akt === e ? AKZENT : "var(--border)"}`,
              background: akt === e ? `${AKZENT}18` : "var(--bg2)",
              color: akt === e ? AKZENT : "var(--text2)", cursor: "pointer", fontSize: 12, fontWeight: akt === e ? 700 : 400,
            }}>{e}</button>
        ))}
        <button onClick={() => setShowRaumForm(true)}
          style={btn(AKZENT, { padding: "7px 14px", fontSize: 12 })}>+ Raum</button>
      </div>

      {/* Raum-Formular */}
      {showRaumForm && (
        <div style={{ ...card(), border: `1px solid ${AKZENT}40`, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: AKZENT, marginBottom: 12 }}>Neuer Raum</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><span style={lbl}>Name</span><input value={raumForm.name} onChange={e => setRaumForm(f => ({ ...f, name: e.target.value }))} placeholder="Wohnzimmer" style={inp()} /></div>
            <div><span style={lbl}>Etage</span>
              <select value={raumForm.etage} onChange={e => setRaumForm(f => ({ ...f, etage: e.target.value }))} style={inp()}>
                {ETAGEN.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div><span style={lbl}>Typ</span>
              <select value={raumForm.typ} onChange={e => setRaumForm(f => ({ ...f, typ: e.target.value }))} style={inp()}>
                {RAUM_TYPEN.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={raumSpeichern} style={btn(AKZENT)}>Speichern</button>
            <button onClick={() => setShowRaumForm(false)} style={btnGhost()}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Räume als Karten */}
      {raeume.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>Noch kein Raum angelegt</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {gefRaeume.map(raum => {
          const raumGA = gaListe.filter(g => g.raum_id === raum.id);
          const zuwOpen = zuweisenRA === raum.id;
          return (
            <div key={raum.id} style={card()}>
              {/* Raum-Header */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{raum.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{raum.etage} · {raum.typ} · {raumGA.length} Objekte</div>
                </div>
                <button onClick={() => setZuweisenRA(zuwOpen ? null : raum.id)}
                  style={btnGhost({ padding: "4px 8px", fontSize: 11, color: AKZENT, borderColor: `${AKZENT}40` })}>+ GA</button>
                <button onClick={() => raumLoeschen(raum.id)}
                  style={btnGhost({ padding: "4px 8px", fontSize: 11, color: "#ef4444", borderColor: "#ef444440", marginLeft: 4 })}>✕</button>
              </div>

              {/* GA-Zuweisung */}
              {zuwOpen && (() => {
                const unassigned = gaListe.filter(g => !g.raum_id);
                return (
                  <div style={{ marginBottom: 10, background: "var(--bg)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>GA zum Raum hinzufügen:</div>
                    <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {unassigned.map(ga => (
                        <button key={ga.id} onClick={() => gaZuweisen(ga, raum.id)}
                          style={{ ...btnGhost({ textAlign: "left", padding: "6px 10px", fontSize: 12 }), display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--mono)", color: AKZENT }}>{gaStr(ga.hauptgruppe, ga.mittelgruppe, ga.untergruppe)}</span>
                          <span>{ga.name}</span>
                          <FunkBadge funktion={ga.funktion} small />
                        </button>
                      ))}
                      {unassigned.length === 0 && (
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>Alle GAs sind bereits zugewiesen</div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* GA-Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {raumGA.length === 0 && <span style={{ fontSize: 12, color: "var(--text3)" }}>Keine Objekte</span>}
                {raumGA.map(ga => (
                  <div key={ga.id} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: `${FUNK_FARBE[ga.funktion] || "#6b7280"}18`,
                    border: `1px solid ${FUNK_FARBE[ga.funktion] || "#6b7280"}33`,
                    borderRadius: 8, padding: "4px 8px",
                  }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: AKZENT }}>{gaStr(ga.hauptgruppe, ga.mittelgruppe, ga.untergruppe)}</span>
                    <span style={{ fontSize: 11 }}>{ga.name}</span>
                    <button onClick={() => gaZuweisen(ga, "")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: "0 2px", fontSize: 11, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3: Inbetriebnahme-Checkliste
// ══════════════════════════════════════════════════════════════════════════════
function TabCheckliste({ raeume, gaListe, checks, onReload }) {
  const [aktRaum, setAktRaum] = useState(null);
  const [neuItem, setNeuItem] = useState("");
  const [neuKat, setNeuKat] = useState("Allgemein");

  async function addVorlage(raumId, kat) {
    const items = CHECK_TEMPLATES[kat] || [];
    await Promise.all(
      items.map((bezeichnung, i) =>
        speichereCheckItem({ id: uid(), raum_id: raumId, kategorie: kat, bezeichnung, erledigt: false, notiz: "", position: i })
      )
    );
    onReload();
  }

  async function addItem(raumId) {
    if (!neuItem.trim()) return;
    await speichereCheckItem({ id: uid(), raum_id: raumId, kategorie: neuKat, bezeichnung: neuItem.trim(), erledigt: false, notiz: "", position: 999 });
    setNeuItem(""); onReload();
  }

  async function toggleItem(item) {
    await speichereCheckItem({ ...item, erledigt: !item.erledigt });
    onReload();
  }

  async function deleteItem(id) {
    await loescheCheckItem(id);
    onReload();
  }

  // Gesamt-Progress
  const total = checks.length, done = checks.filter(c => c.erledigt).length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  const aktRaumId = aktRaum || raeume[0]?.id;
  const aktRaumObj = raeume.find(r => r.id === aktRaumId) || null;
  const raumChecks = checks.filter(c => c.raum_id === aktRaumId);
  const raumDone = raumChecks.filter(c => c.erledigt).length;

  // Kategorien im aktuellen Raum
  const kats = [...new Set(raumChecks.map(c => c.kategorie))];

  return (
    <div>
      {/* Gesamt-Progress */}
      <div style={{ ...card(), marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Gesamtfortschritt</span>
            <span style={{ fontSize: 13, color: AKZENT, fontWeight: 700 }}>{done}/{total} ({pct} %)</span>
          </div>
          <div style={{ background: "var(--bg3)", borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, background: pct === 100 ? "var(--green)" : AKZENT, height: "100%", borderRadius: 6, transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Raum-Wahl */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {raeume.map(r => {
          const rc = checks.filter(c => c.raum_id === r.id);
          const rd = rc.filter(c => c.erledigt).length;
          return (
            <button key={r.id} onClick={() => setAktRaum(r.id)} style={{
              padding: "8px 12px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${aktRaumId === r.id ? AKZENT : "var(--border)"}`,
              background: aktRaumId === r.id ? `${AKZENT}18` : "var(--bg2)",
              color: aktRaumId === r.id ? AKZENT : "var(--text2)", textAlign: "left",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>{rd}/{rc.length} ✓</div>
            </button>
          );
        })}
        {raeume.length === 0 && <div style={{ fontSize: 13, color: "var(--text3)" }}>Zuerst Räume im Raumplan anlegen</div>}
      </div>

      {aktRaumId && aktRaumObj && (
        <div>
          {/* Raum-Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{aktRaumObj.name}</div>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>{raumDone}/{raumChecks.length} erledigt</span>
            <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
              {["Licht", "Dimmen", "Jalousie", "Heizung", "Szene", "Allgemein"].map(k => (
                <button key={k} onClick={() => addVorlage(aktRaumId, k)}
                  style={btnGhost({ padding: "4px 8px", fontSize: 10 })}>
                  + {k}
                </button>
              ))}
            </div>
          </div>

          {/* Items nach Kategorie */}
          {kats.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text3)", fontSize: 13 }}>
              Vorlage auswählen oder eigene Punkte hinzufügen
            </div>
          )}
          {kats.map(kat => (
            <div key={kat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, fontWeight: 700 }}>
                {kat}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {raumChecks.filter(c => c.kategorie === kat).map(item => (
                  <div key={item.id} style={{
                    ...card({ padding: "10px 12px" }),
                    display: "flex", alignItems: "center", gap: 10,
                    opacity: item.erledigt ? 0.55 : 1,
                  }}>
                    <button onClick={() => toggleItem(item)}
                      style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${item.erledigt ? "var(--green)" : "var(--border)"}`,
                        background: item.erledigt ? "var(--green)" : "transparent",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 12,
                      }}>
                      {item.erledigt ? "✓" : ""}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, textDecoration: item.erledigt ? "line-through" : "none" }}>
                      {item.bezeichnung}
                    </span>
                    <button onClick={() => deleteItem(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 13, padding: "0 2px" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Neuer Punkt */}
          <div style={{ ...card({ padding: "12px" }), display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px" }}>
              <span style={lbl}>Eigener Prüfpunkt</span>
              <input value={neuItem} onChange={e => setNeuItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addItem(aktRaumId)}
                placeholder="z.B. Kurztest Taster 3" style={inp({ padding: "8px 10px" })} />
            </div>
            <div style={{ flex: "0 1 130px" }}>
              <span style={lbl}>Kategorie</span>
              <select value={neuKat} onChange={e => setNeuKat(e.target.value)} style={inp({ padding: "8px 10px" })}>
                {["Licht", "Dimmen", "Jalousie", "Heizung", "Szene", "Allgemein"].map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <button onClick={() => addItem(aktRaumId)} style={btn(AKZENT, { alignSelf: "flex-end" })}>+ Hinzufügen</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4: KNX-Rechner (Adressen, Topologie, DPT-Referenz)
// ══════════════════════════════════════════════════════════════════════════════
function TabRechner({ gaListe, raeume }) {
  // Physikalische Adresse
  const [pBereich, setPBereich] = useState("1");
  const [pLinie,   setPLinie]   = useState("1");
  const [pGeraet,  setPGeraet]  = useState("5");
  // GA ↔ Dezimal
  const [gaH, setGaH] = useState("1"); const [gaM, setGaM] = useState("0"); const [gaU, setGaU] = useState("1");
  const [dezIn, setDezIn] = useState("");

  const physInt = ((parseInt(pBereich) & 0xF) << 12) | ((parseInt(pLinie) & 0xF) << 8) | (parseInt(pGeraet) & 0xFF);
  const physStr = `${pBereich}.${pLinie}.${pGeraet}`;

  const gaIntVal = gaInt(parseInt(gaH) || 0, parseInt(gaM) || 0, parseInt(gaU) || 0);
  const dezVal = parseInt(dezIn);
  const vonDez = !isNaN(dezVal) ? {
    h: (dezVal >> 11) & 0x1F, m: (dezVal >> 8) & 0x07, u: dezVal & 0xFF
  } : null;

  // Statistik — single O(n) pass instead of O(n*m)
  const totalGA = gaListe.length;
  const byFunk = gaListe.reduce((acc, g) => { acc[g.funktion] = (acc[g.funktion] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* Physikalische Adresse */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>Physikalische Adresse</div>
        <div style={{ ...card() }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lbl}>Bereich (1–15)</span>
              <input type="number" min={1} max={15} value={pBereich} onChange={e => setPBereich(e.target.value)} style={inp({ width: 70, textAlign: "center" })} />
            </div>
            <span style={{ color: "var(--text3)", paddingTop: 22, fontWeight: 700 }}>.</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lbl}>Linie (1–15)</span>
              <input type="number" min={1} max={15} value={pLinie} onChange={e => setPLinie(e.target.value)} style={inp({ width: 70, textAlign: "center" })} />
            </div>
            <span style={{ color: "var(--text3)", paddingTop: 22, fontWeight: 700 }}>.</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lbl}>Gerät (1–255)</span>
              <input type="number" min={1} max={255} value={pGeraet} onChange={e => setPGeraet(e.target.value)} style={inp({ width: 75, textAlign: "center" })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Phys. Adresse", value: physStr, color: AKZENT },
              { label: "Dezimal", value: physInt, color: "var(--text2)" },
              { label: "Hex", value: "0x" + physInt.toString(16).toUpperCase().padStart(4, "0"), color: "var(--text3)" },
              { label: "Binär", value: physInt.toString(2).padStart(16, "0"), color: "var(--text3)", mono: true, small: true },
            ].map(({ label, value, color, mono, small }) => (
              <div key={label} style={{ textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 12px", flex: "1 1 80px" }}>
                <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: small ? 12 : 18, fontWeight: 700, color, fontFamily: (mono || small) ? "var(--mono)" : "inherit" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GA ↔ Dezimal */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Gruppenadresse ↔ Dezimal</div>
        <div style={{ ...card(), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* GA → Dezimal */}
          <div>
            <span style={lbl}>GA (HG/MG/UG) → Dezimal</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <input type="number" min={0} max={31}  value={gaH} onChange={e => setGaH(e.target.value)}  style={inp({ width: 50, textAlign: "center" })} />
              <span style={{ color: "var(--text3)" }}>/</span>
              <input type="number" min={0} max={7}   value={gaM} onChange={e => setGaM(e.target.value)}  style={inp({ width: 50, textAlign: "center" })} />
              <span style={{ color: "var(--text3)" }}>/</span>
              <input type="number" min={0} max={255} value={gaU} onChange={e => setGaU(e.target.value)}  style={inp({ width: 55, textAlign: "center" })} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: AKZENT, fontFamily: "var(--mono)" }}>= {gaIntVal}</div>
          </div>
          {/* Dezimal → GA */}
          <div>
            <span style={lbl}>Dezimal → GA (HG/MG/UG)</span>
            <input type="number" min={0} max={65535} value={dezIn} onChange={e => setDezIn(e.target.value)}
              placeholder="z.B. 2305" style={inp({ marginBottom: 8 })} />
            {vonDez ? (
              <div style={{ fontSize: 20, fontWeight: 800, color: AKZENT, fontFamily: "var(--mono)" }}>
                {gaStr(vonDez.h, vonDez.m, vonDez.u)}
              </div>
            ) : <div style={{ fontSize: 12, color: "var(--text3)" }}>Dezimalwert eingeben</div>}
          </div>
        </div>
      </div>

      {/* Projekt-Statistik */}
      {totalGA > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Projekt-Übersicht</div>
          <div style={{ ...card() }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700 }}>{totalGA} Gruppenandadressen</span>
              <span style={{ color: "var(--text3)", fontSize: 12 }}>{raeume.length} Räume</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FUNKTIONEN.filter(f => byFunk[f] > 0).map(f => (
                <div key={f} style={{
                  background: `${FUNK_FARBE[f]}18`, border: `1px solid ${FUNK_FARBE[f]}40`,
                  borderRadius: 8, padding: "4px 10px", display: "flex", gap: 6, alignItems: "center",
                }}>
                  <span style={{ fontSize: 11, color: FUNK_FARBE[f], fontWeight: 700 }}>{byFunk[f]}×</span>
                  <span style={{ fontSize: 11, color: "var(--text2)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DPT-Referenz */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>DPT-Kurzreferenz</div>
        <div style={{ ...card({ padding: 0 }), overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg3)" }}>
                {["DPT", "Größe", "Bereich", "Typischer Einsatz"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "var(--text3)", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["1.001", "1 Bit", "EIN/AUS",          "Licht schalten"],
                ["1.008", "1 Bit", "Aufwärts/Abwärts", "Jalousie Fahrtrichtung"],
                ["1.009", "1 Bit", "Öffnen/Schließen",  "Ventil, Tür"],
                ["3.007", "4 Bit", "Dimm-Schritt",      "Dimmen relativ"],
                ["3.008", "4 Bit", "Lamel.-Schritt",    "Jalousie relativ"],
                ["5.001", "1 Byte","0–100 %",            "Helligkeit, Ventil"],
                ["9.001", "2 Byte","–273…670 °C",        "Temperatur"],
                ["9.007", "2 Byte","0…100 %",            "Relative Feuchte"],
                ["14.056","4 Byte","±3,4·10³⁸",          "Leistung (W)"],
                ["17.001","1 Byte","1–64",               "Szene aktivieren"],
              ].map(([dpt, size, range, use]) => (
                <tr key={dpt} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 14px", fontFamily: "var(--mono)", fontWeight: 700, color: AKZENT }}>{dpt}</td>
                  <td style={{ padding: "8px 14px", color: "var(--text3)", fontSize: 12 }}>{size}</td>
                  <td style={{ padding: "8px 14px", fontFamily: "var(--mono)", fontSize: 12 }}>{range}</td>
                  <td style={{ padding: "8px 14px", color: "var(--text2)" }}>{use}</td>
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
// Haupt-Komponente
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "ga",        icon: "🗂",  label: "GA-Planer",    beschr: "Gruppenadresse anlegen" },
  { id: "raeume",    icon: "🏠",  label: "Raumplan",      beschr: "Räume & Zuordnungen" },
  { id: "check",     icon: "✅",  label: "Checkliste",    beschr: "Inbetriebnahme" },
  { id: "rechner",   icon: "🔢",  label: "KNX-Rechner",  beschr: "Adressen & DPT" },
];

export default function KNXPlaner() {
  const [tab, setTab]       = useState("ga");
  const [gaListe, setGA]    = useState([]);
  const [raeume, setRaeume] = useState([]);
  const [checks, setChecks] = useState([]);

  const reload = useCallback(async () => {
    const [g, r, c] = await Promise.all([ladeGA(), ladeRaeume(), ladeCheckliste()]);
    setGA(g); setRaeume(r); setChecks(c);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div style={{ padding: "16px", maxWidth: 960, margin: "0 auto", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: AKZENT }}>🏡 KNX-Planer</h2>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          Gruppenadress-Planer · Raumplan · Inbetriebnahme-Checkliste · KNX-Rechner
        </div>
      </div>

      {/* Tab-Navigation */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 22 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? `${AKZENT}18` : "var(--bg2)",
            border: `2px solid ${tab === t.id ? AKZENT : "var(--border)"}`,
            borderRadius: 12, padding: "10px 6px",
            cursor: "pointer", transition: "border-color 0.15s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? AKZENT : "var(--text)", textAlign: "center", lineHeight: 1.3 }}>{t.label}</span>
            <span style={{ fontSize: 9, color: "var(--text3)", textAlign: "center" }}>{t.beschr}</span>
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {tab === "ga"      && <TabGA        gaListe={gaListe} raeume={raeume} onReload={reload} />}
      {tab === "raeume"  && <TabRaeume    gaListe={gaListe} raeume={raeume} onReload={reload} />}
      {tab === "check"   && <TabCheckliste raeume={raeume} gaListe={gaListe} checks={checks} onReload={reload} />}
      {tab === "rechner" && <TabRechner   gaListe={gaListe} raeume={raeume} />}
    </div>
  );
}
