import React, { useState, useEffect, useRef } from "react";
import Toast, { useToasts } from "./components/Toast.jsx";
import { loadStundenDB, saveEintragDB, deleteEintragDB } from "./lib/db_stundenbuch.js";
import { uid } from "./lib/utils.js";

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const PAUSE_OPTIONS = [0, 15, 30, 45, 60];

const mkEintrag = () => ({
  id: uid(),
  datum: new Date().toISOString().slice(0, 10),
  von: "07:00",
  bis: "16:00",
  pause: 30,
  projekt: "",
  taetigkeit: "",
  notiz: "",
});

function calcNetto(eintrag) {
  const von = timeToMinutes(eintrag.von);
  const bis = timeToMinutes(eintrag.bis);
  if (bis <= von) return 0;
  return Math.max(0, bis - von - eintrag.pause);
}

// ── Lokaler Speicher ──
const LS_KEY = "elektronikertools_stundenbuch";
function loadData() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function saveData(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}


// ── Eingabe-Formular ──
function EintragForm({ initial, onSave, onCancel, projekte }) {
  const [form, setForm] = useState(initial || mkEintrag());
  const netto = calcNetto(form);
  const formRef = useRef(form);
  formRef.current = form;

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // Ctrl+S speichert
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave(formRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave]);

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          Datum
          <input type="date" value={form.datum} onChange={e => set("datum", e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Von
          <input type="time" value={form.von} onChange={e => set("von", e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Bis
          <input type="time" value={form.bis} onChange={e => set("bis", e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Pause
          <select value={form.pause} onChange={e => set("pause", Number(e.target.value))} style={inputStyle}>
            {PAUSE_OPTIONS.map(p => <option key={p} value={p}>{p} min</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          Projekt / Baustelle
          <input
            list="projekte-list"
            value={form.projekt}
            onChange={e => set("projekt", e.target.value)}
            placeholder="Projekt eingeben…"
            style={inputStyle}
          />
          <datalist id="projekte-list">
            {projekte.map(p => <option key={p} value={p} />)}
          </datalist>
        </label>
        <label style={labelStyle}>
          Tätigkeit
          <input
            value={form.taetigkeit}
            onChange={e => set("taetigkeit", e.target.value)}
            placeholder="z.B. Installation, Montage…"
            style={inputStyle}
          />
        </label>
      </div>
      <label style={labelStyle}>
        Notiz
        <input
          value={form.notiz}
          onChange={e => set("notiz", e.target.value)}
          placeholder="Optionale Notizen…"
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1, color: "var(--text2)", fontSize: 14 }}>
          Netto: <strong style={{ color: "var(--text)" }}>{formatDuration(netto)}</strong>
        </div>
        <button onClick={onCancel} style={btnStyle("var(--bg3)", "var(--text2)")}>Abbrechen</button>
        <button onClick={() => onSave(form)} style={btnStyle("rgba(82,217,138,0.1)", "var(--green)")}>Speichern</button>
      </div>
    </div>
  );
}

// ── Wochenstunden berechnen ──
function aktuelleWocheMinuten(eintraege) {
  const heute = new Date();
  const tag = heute.getDay();
  // Montag dieser Woche
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - (tag === 0 ? 6 : tag - 1));
  const montagStr = montag.toISOString().slice(0, 10);
  const sonntagStr = new Date(montag.getTime() + 6 * 864e5).toISOString().slice(0, 10);
  return eintraege
    .filter(e => e.datum >= montagStr && e.datum <= sonntagStr)
    .reduce((sum, e) => sum + calcNetto(e), 0);
}

// ── Monats-Chart ─────────────────────────────────────────────────────────────
function MonatsChart({ eintraege, monat }) {
  const [jahr, mon] = monat.split("-").map(Number);
  const tageImMonat = new Date(jahr, mon, 0).getDate();
  const heute = new Date().toISOString().slice(0, 10);

  // Minuten pro Tag
  const perTag = {};
  eintraege.forEach(e => {
    if (!e.datum?.startsWith(monat)) return;
    const tag = parseInt(e.datum.slice(8), 10);
    perTag[tag] = (perTag[tag] || 0) + calcNetto(e);
  });

  const maxMin = Math.max(...Object.values(perTag), 480); // min. 8h Skalierung
  const W = 28;  // Balkenbreite
  const GAP = 4;
  const H = 80;  // max Balkenhöhe
  const svgW = tageImMonat * (W + GAP);

  if (Object.keys(perTag).length === 0) return null;

  return (
    <div style={{ marginBottom: 20, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8, fontWeight: 600 }}>
        Stunden pro Tag — {monat}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg width={svgW} height={H + 20} style={{ display: "block", minWidth: svgW }}>
          {Array.from({ length: tageImMonat }, (_, i) => {
            const tag = i + 1;
            const min = perTag[tag] || 0;
            const barH = min > 0 ? Math.max(4, Math.round((min / maxMin) * H)) : 0;
            const x = i * (W + GAP);
            const datumStr = `${monat}-${String(tag).padStart(2, "0")}`;
            const istHeute = datumStr === heute;
            const h8 = Math.round((480 / maxMin) * H); // 8h-Linie
            return (
              <g key={tag}>
                {/* 8h-Referenzlinie */}
                {i === 0 && (
                  <line x1={0} y1={H - h8} x2={svgW} y2={H - h8}
                    stroke="var(--border2)" strokeWidth={1} strokeDasharray="3 3" />
                )}
                {/* Balken */}
                {barH > 0 && (
                  <rect x={x} y={H - barH} width={W} height={barH} rx={4}
                    fill={min >= 480 ? "var(--green)" : min >= 240 ? "#4bc8e8" : "var(--text3)"}
                    opacity={0.85}
                  />
                )}
                {/* Heute-Marker */}
                {istHeute && (
                  <rect x={x} y={0} width={W} height={H} rx={4}
                    fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                )}
                {/* Tag-Zahl */}
                <text x={x + W / 2} y={H + 14} textAnchor="middle"
                  fontSize={9} fill={istHeute ? "var(--text)" : "var(--text3)"} fontWeight={istHeute ? 700 : 400}>
                  {tag}
                </text>
                {/* Stunden-Label wenn > 0 */}
                {barH > 14 && (
                  <text x={x + W / 2} y={H - barH + 11} textAnchor="middle"
                    fontSize={9} fill="var(--bg)" fontWeight={700}>
                    {Math.floor(min / 60)}h
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: "var(--text3)" }}>
        <span><span style={{ color: "var(--green)" }}>■</span> ≥ 8h</span>
        <span><span style={{ color: "#4bc8e8" }}>■</span> 4–8h</span>
        <span style={{ marginLeft: "auto" }}>— 8h-Linie</span>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──
export default function Stundenbuch({ config = {} }) {
  const [eintraege, setEintraegeLive] = useState(loadData);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState({ monat: new Date().toISOString().slice(0, 7), projekt: "" });
  const [timerStart, setTimerStart] = useState(null);
  const [timerNow, setTimerNow] = useState(null);
  const [timerVorbelegung, setTimerVorbelegung] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const { toasts, addToast } = useToasts();

  // Timer-Tick jede Sekunde
  useEffect(() => {
    if (!timerStart) return;
    const iv = setInterval(() => setTimerNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, [timerStart]);

  function timerStarten() {
    setTimerStart(new Date());
    setTimerNow(new Date());
  }

  function timerStoppen() {
    if (!timerStart) return;
    const jetzt = new Date();
    const vonStr = `${timerStart.getHours().toString().padStart(2,"0")}:${timerStart.getMinutes().toString().padStart(2,"0")}`;
    const bisStr = `${jetzt.getHours().toString().padStart(2,"0")}:${jetzt.getMinutes().toString().padStart(2,"0")}`;
    const datum = timerStart.toISOString().slice(0, 10);
    setTimerStart(null);
    setTimerNow(null);
    setTimerVorbelegung({ datum, von: vonStr, bis: bisStr });
    setEditId(null);
    setShowForm(true);
  }

  function setEintraege(fn) {
    setEintraegeLive(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      saveData(next);
      return next;
    });
  }

  // Beim Start: Supabase laden
  useEffect(() => {
    loadStundenDB()
      .then(data => { if (data) setEintraege(data); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const projekte = [...new Set(eintraege.map(e => e.projekt).filter(Boolean))].sort();

  async function handleSave(form) {
    if (editId) {
      const alt = eintraege.find(e => e.id === editId);
      const updated = { ...form, id: editId, db_id: alt?.db_id };
      setEintraege(prev => prev.map(e => e.id === editId ? updated : e));
      addToast("Eintrag aktualisiert");
      setEditId(null);
      try {
        const saved = await saveEintragDB(updated);
        if (saved) setEintraege(prev => prev.map(e => e.id === editId ? { ...e, db_id: saved.db_id } : e));
      } catch (_) {}
    } else {
      setEintraege(prev => [form, ...prev]);
      addToast("Eintrag gespeichert");
      try {
        const saved = await saveEintragDB(form);
        if (saved) setEintraege(prev => prev.map(e => e.id === form.id ? { ...e, db_id: saved.db_id } : e));
      } catch (_) {}
    }
    setShowForm(false);
  }

  async function handleDelete(id) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    const eintrag = eintraege.find(e => e.id === id);
    setEintraege(prev => prev.filter(e => e.id !== id));
    addToast("Eintrag gelöscht");
    if (eintrag?.db_id) {
      try { await deleteEintragDB(eintrag.db_id); } catch (_) {}
    }
  }

  function handleEdit(eintrag) {
    setEditId(eintrag.id);
    setShowForm(true);
  }

  // Filter
  const gefiltert = eintraege.filter(e => {
    const monatOk = !filter.monat || e.datum.startsWith(filter.monat);
    const projektOk = !filter.projekt || e.projekt.toLowerCase().includes(filter.projekt.toLowerCase());
    return monatOk && projektOk;
  }).sort((a, b) => b.datum.localeCompare(a.datum));

  const gesamtMinuten = gefiltert.reduce((sum, e) => sum + calcNetto(e), 0);

  // Export CSV
  function exportCSV() {
    const firma = config.firma || "Firma";
    const header = "Datum;Von;Bis;Pause(min);Netto(h);Projekt;Tätigkeit;Notiz";
    const rows = gefiltert.map(e =>
      [formatDate(e.datum), e.von, e.bis, e.pause, (calcNetto(e) / 60).toFixed(2), e.projekt, e.taetigkeit, e.notiz].join(";")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Stundennachweis_${firma}_${filter.monat || "alle"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("CSV exportiert");
  }

  const editEintrag = editId ? eintraege.find(e => e.id === editId) : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", color: "var(--text)" }}>
      <style>{`
        .stunden-eintrag{display:grid;grid-template-columns:110px 80px 80px 70px 1fr auto;gap:12px;align-items:center;font-size:14px;}
        @media(max-width:600px){
          .stunden-eintrag{grid-template-columns:1fr 1fr;gap:6px 10px;font-size:13px;}
          .stunden-eintrag .se-pause{display:none;}
          .stunden-eintrag .se-info{grid-column:1/-1;font-size:12px;}
          .stunden-eintrag .se-btns{justify-self:end;}
        }
      `}</style>
      <Toast toasts={toasts} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⏱ Stundenbuch</h2>
          <div style={{ color: "var(--text3)", fontSize: 13 }}>Zeiterfassung{config.firma ? ` – ${config.firma}` : ""}{config.mitarbeiter ? ` | ${config.mitarbeiter}` : ""}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={exportCSV} style={btnStyle("rgba(33,150,201,0.1)", "var(--blue)")}>↓ CSV Export</button>
        <button onClick={() => { setEditId(null); setTimerVorbelegung(null); setShowForm(s => !s); }} style={btnStyle("rgba(82,217,138,0.1)", "var(--green)")}>
          {showForm && !editId ? "✕ Schließen" : "+ Neuer Eintrag"}
        </button>
        <button onClick={() => setShowInfo(true)} title="Info" style={{...btnStyle("rgba(82,217,138,0.08)","var(--green)"),padding:"6px 10px"}}>ℹ</button>
      </div>

      {showInfo && (
        <div onClick={() => setShowInfo(false)} style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.94)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e => e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,padding:28,maxWidth:480,width:"100%",position:"relative",maxHeight:"90vh",overflowY:"auto"}}>
            <button onClick={() => setShowInfo(false)} style={{position:"absolute",top:16,right:16,background:"none",border:"none",color:"var(--text2)",fontSize:18,cursor:"pointer",padding:4,lineHeight:1}}>✕</button>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
              <div style={{fontSize:28}}>⏱</div>
              <div>
                <div style={{fontSize:20,fontWeight:800}}>Stundenbuch</div>
                <div style={{fontSize:12,color:"var(--green)"}}>Version 2026.3 · by Jedrimos</div>
              </div>
            </div>
            <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.7,marginBottom:20}}>
              Digitale Zeiterfassung für Elektrofachkräfte. Einträge mit Datum, Von/Bis, Pause, Projekt und Tätigkeit — mit optionalem Supabase-Sync für das ganze Team.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
              {[
                ["⏱","Timer","Start/Stop direkt im Header"],
                ["📅","Monats-Filter","Filtern nach Monat und Projekt"],
                ["📊","Chart","SVG-Balkendiagramm pro Tag"],
                ["⬇","CSV-Export","Stundennachweis als CSV-Datei"],
                ["💾","Auto-Save","Lokal + optional in Supabase"],
                ["⌨","Shortcut","Ctrl+S speichert den Eintrag"],
              ].map(([icon,titel,sub])=>(
                <div key={titel} style={{display:"flex",alignItems:"flex-start",gap:10,background:"var(--bg3)",borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:16,lineHeight:1}}>{icon}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>{titel}</div>
                    <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid var(--border)",paddingTop:16,fontSize:11,color:"var(--text3)",textAlign:"center"}}>
              Lokale Datenspeicherung · Keine Cloud erforderlich · Keine Werbung · © 2026 Jedrimos
            </div>
          </div>
        </div>
      )}

      {/* Wochenstunden + Timer */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 16px", fontSize: 13 }}>
          Diese Woche: <strong style={{ color: "var(--green)" }}>{formatDuration(aktuelleWocheMinuten(eintraege))}</strong>
        </div>
        {timerStart ? (() => {
          const vergangen = timerNow ? timerNow - timerStart : 0;
          const minuten = Math.floor(vergangen / 60000);
          const sek = Math.floor((vergangen % 60000) / 1000);
          const istFeierabend = minuten >= 480; // 8h
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={timerStoppen} style={{ ...btnStyle("rgba(255,107,107,0.12)", "var(--red)"), display: "flex", alignItems: "center", gap: 8 }}>
                ⏹ Stop
                <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
                  {Math.floor(minuten / 60)}:{String(minuten % 60).padStart(2,"0")}:{String(sek).padStart(2,"0")}
                </span>
              </button>
              {istFeierabend && (
                <span style={{ fontSize: 12, color: "var(--green)", background: "rgba(82,217,138,0.08)", border: "1px solid rgba(82,217,138,0.2)", borderRadius: 8, padding: "4px 10px" }}>
                  Feierabend? 🎯 {Math.floor(minuten / 60)}h {minuten % 60}min
                </span>
              )}
            </div>
          );
        })() : (
          <button onClick={timerStarten} style={btnStyle("rgba(82,217,138,0.08)", "var(--green)")}>
            ▶ Timer starten
          </button>
        )}
      </div>

      {/* Formular */}
      {showForm && (
        <EintragForm
          initial={editEintrag || timerVorbelegung || undefined}
          projekte={projekte}
          onSave={e => { handleSave(e); setTimerVorbelegung(null); }}
          onCancel={() => { setShowForm(false); setEditId(null); setTimerVorbelegung(null); }}
        />
      )}

      {/* Monats-Chart */}
      {filter.monat && <MonatsChart eintraege={eintraege} monat={filter.monat} />}

      {/* Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={labelStyle}>
          Monat
          <input type="month" value={filter.monat} onChange={e => setFilter(f => ({ ...f, monat: e.target.value }))} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Projekt-Filter
          <input
            value={filter.projekt}
            onChange={e => setFilter(f => ({ ...f, projekt: e.target.value }))}
            placeholder="Suchen…"
            style={inputStyle}
          />
        </label>
        <div style={{ alignSelf: "flex-end", paddingBottom: 2, color: "var(--text2)", fontSize: 13 }}>
          {gefiltert.length} Einträge | Gesamt: <strong style={{ color: "var(--text)" }}>{formatDuration(gesamtMinuten)}</strong>{" "}
          ({(gesamtMinuten / 60).toFixed(2)} h)
        </div>
      </div>

      {/* Tabelle */}
      {gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: "60px 0", fontSize: 15 }}>
          Noch keine Einträge. Klicke auf &quot;Neuer Eintrag&quot; um anzufangen.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gefiltert.map(e => {
            const netto = calcNetto(e);
            return (
              <div key={e.id} className="stunden-eintrag" style={{
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 16px",
              }}>
                <div style={{ fontWeight: 600 }}>{formatDate(e.datum)}</div>
                <div style={{ color: "var(--text2)" }}>{e.von} – {e.bis}</div>
                <div className="se-pause" style={{ color: "var(--text2)" }}>-{e.pause}min Pause</div>
                <div style={{ fontWeight: 700, color: "var(--green)" }}>{formatDuration(netto)}</div>
                <div className="se-info">
                  {e.projekt && <span style={{ background: "var(--bg3)", color: "var(--blue)", borderRadius: 6, padding: "2px 8px", fontSize: 12, marginRight: 6 }}>{e.projekt}</span>}
                  {e.taetigkeit && <span style={{ color: "var(--text2)" }}>{e.taetigkeit}</span>}
                  {e.notiz && <span style={{ color: "var(--text3)", fontSize: 12, display: "block", marginTop: 2 }}>{e.notiz}</span>}
                </div>
                <div className="se-btns" style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleEdit(e)} style={iconBtn("var(--bg3)")}>✎</button>
                  <button onClick={() => handleDelete(e.id)} style={iconBtn("rgba(255,107,107,0.1)")}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const labelStyle = {
  display: "flex", flexDirection: "column", gap: 4,
  fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"
};

const inputStyle = {
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text)", padding: "7px 10px", fontSize: 14, outline: "none",
  fontFamily: "inherit"
};

function btnStyle(bg, color) {
  return {
    background: bg, color, border: `1px solid ${color}40`,
    borderRadius: 8, padding: "8px 16px", cursor: "pointer",
    fontSize: 13, fontWeight: 600, whiteSpace: "nowrap"
  };
}

function iconBtn(bg) {
  return {
    background: bg, color: "var(--text2)", border: "none",
    borderRadius: 6, width: 30, height: 30, cursor: "pointer",
    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center"
  };
}
