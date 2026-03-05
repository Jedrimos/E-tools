import React, { useState, useEffect, useCallback } from "react";

// ── Helpers ──
function uid() { return Math.random().toString(36).slice(2, 9); }

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
const LS_KEY = "elektronikertools_stundenlang";
function loadData() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function saveData(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ── Toast ──
const Toast = ({ toasts }) => (
  <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        background: t.type === "error" ? "#2a1515" : "#0f2a1a",
        border: `1px solid ${t.type === "error" ? "var(--red,#e05)" : "var(--green,#2d8)"}`,
        borderRadius: 10, padding: "10px 16px",
        color: t.type === "error" ? "#e05555" : "#3dcc7e",
        fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)", minWidth: 200, maxWidth: 320
      }}>
        <span>{t.type === "error" ? "⚠" : "✓"}</span>
        <span>{t.msg}</span>
      </div>
    ))}
  </div>
);

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, addToast };
}

// ── Eingabe-Formular ──
function EintragForm({ initial, onSave, onCancel, projekte }) {
  const [form, setForm] = useState(initial || mkEintrag());
  const netto = calcNetto(form);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  return (
    <div style={{ background: "var(--bg2,#1a1a2e)", border: "1px solid var(--border,#333)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
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
        <div style={{ flex: 1, color: "#aaa", fontSize: 14 }}>
          Netto: <strong style={{ color: "#fff" }}>{formatDuration(netto)}</strong>
        </div>
        <button onClick={onCancel} style={btnStyle("#333", "#aaa")}>Abbrechen</button>
        <button onClick={() => onSave(form)} style={btnStyle("#1a4a2e", "#3dcc7e")}>Speichern</button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──
export default function Stundenlang({ config = {} }) {
  const [eintraege, setEintraege] = useState(loadData);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState({ monat: new Date().toISOString().slice(0, 7), projekt: "" });
  const { toasts, addToast } = useToasts();

  useEffect(() => { saveData(eintraege); }, [eintraege]);

  const projekte = [...new Set(eintraege.map(e => e.projekt).filter(Boolean))].sort();

  function handleSave(form) {
    if (editId) {
      setEintraege(prev => prev.map(e => e.id === editId ? { ...form, id: editId } : e));
      addToast("Eintrag aktualisiert");
      setEditId(null);
    } else {
      setEintraege(prev => [form, ...prev]);
      addToast("Eintrag gespeichert");
    }
    setShowForm(false);
  }

  function handleDelete(id) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setEintraege(prev => prev.filter(e => e.id !== id));
    addToast("Eintrag gelöscht");
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
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif", color: "#e0e0e0" }}>
      <Toast toasts={toasts} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⏱ Stundenlang</h2>
          <div style={{ color: "#888", fontSize: 13 }}>Zeiterfassung{config.firma ? ` – ${config.firma}` : ""}{config.mitarbeiter ? ` | ${config.mitarbeiter}` : ""}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={exportCSV} style={btnStyle("#1a3a4a", "#4bc8e8")}>↓ CSV Export</button>
        <button onClick={() => { setEditId(null); setShowForm(s => !s); }} style={btnStyle("#1a4a2e", "#3dcc7e")}>
          {showForm && !editId ? "✕ Schließen" : "+ Neuer Eintrag"}
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <EintragForm
          initial={editEintrag}
          projekte={projekte}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditId(null); }}
        />
      )}

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
        <div style={{ alignSelf: "flex-end", paddingBottom: 2, color: "#aaa", fontSize: 13 }}>
          {gefiltert.length} Einträge | Gesamt: <strong style={{ color: "#fff" }}>{formatDuration(gesamtMinuten)}</strong>{" "}
          ({(gesamtMinuten / 60).toFixed(2)} h)
        </div>
      </div>

      {/* Tabelle */}
      {gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", color: "#666", padding: "60px 0", fontSize: 15 }}>
          Noch keine Einträge. Klicke auf &quot;Neuer Eintrag&quot; um anzufangen.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gefiltert.map(e => {
            const netto = calcNetto(e);
            return (
              <div key={e.id} style={{
                background: "var(--bg2,#1a1a2e)", border: "1px solid #2a2a3e",
                borderRadius: 10, padding: "12px 16px",
                display: "grid", gridTemplateColumns: "110px 80px 80px 70px 1fr auto",
                gap: 12, alignItems: "center", fontSize: 14
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{formatDate(e.datum)}</div>
                </div>
                <div style={{ color: "#aaa" }}>{e.von} – {e.bis}</div>
                <div style={{ color: "#aaa" }}>-{e.pause}min Pause</div>
                <div style={{ fontWeight: 700, color: "#3dcc7e" }}>{formatDuration(netto)}</div>
                <div>
                  {e.projekt && <span style={{ background: "#1a3040", color: "#4bc8e8", borderRadius: 6, padding: "2px 8px", fontSize: 12, marginRight: 6 }}>{e.projekt}</span>}
                  {e.taetigkeit && <span style={{ color: "#ccc" }}>{e.taetigkeit}</span>}
                  {e.notiz && <span style={{ color: "#777", fontSize: 12, display: "block", marginTop: 2 }}>{e.notiz}</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleEdit(e)} style={iconBtn("#333")}>✎</button>
                  <button onClick={() => handleDelete(e.id)} style={iconBtn("#3a1515")}>✕</button>
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
  fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"
};

const inputStyle = {
  background: "#0e0e1a", border: "1px solid #2a2a3e", borderRadius: 8,
  color: "#e0e0e0", padding: "7px 10px", fontSize: 14, outline: "none",
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
    background: bg, color: "#aaa", border: "none",
    borderRadius: 6, width: 30, height: 30, cursor: "pointer",
    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center"
  };
}
