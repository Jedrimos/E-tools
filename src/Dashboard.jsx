import React, { useState, useEffect } from "react";
import Verteilerplaner from "./Verteilerplaner.jsx";
import Stundenbuch from "./Stundenbuch.jsx";
import Pruefprotokoll from "./Pruefprotokoll.jsx";
import Wissensdatenbank from "./Wissensdatenbank.jsx";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";

// ── Lokaler Speicher für Konfiguration ──
const CONFIG_KEY = "elektronikertools_config";

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch { return {}; }
}
function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ── Ablauf-Check Prüfprotokoll ──
function ladeAblaufInfo() {
  try {
    const protokolle = JSON.parse(localStorage.getItem("elektronikertools_pruefprotokoll")) || [];
    const heute = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const abgelaufen = protokolle.filter(p => p.naechste_pruefung && p.naechste_pruefung < heute).length;
    const baldFaellig = protokolle.filter(p => p.naechste_pruefung && p.naechste_pruefung >= heute && p.naechste_pruefung <= in30).length;
    return { abgelaufen, baldFaellig };
  } catch { return { abgelaufen: 0, baldFaellig: 0 }; }
}

// ── Live-Stats ──
function ladeLiveStats() {
  try {
    const projekte   = JSON.parse(localStorage.getItem("vp_projekte") || "[]");
    const protokolle = JSON.parse(localStorage.getItem("elektronikertools_pruefprotokoll") || "[]");
    const eintraege  = JSON.parse(localStorage.getItem("elektronikertools_stundenbuch") || "[]");
    const monat = new Date().toISOString().slice(0, 7);
    const minuten = eintraege
      .filter(e => e.datum?.startsWith(monat))
      .reduce((sum, e) => {
        const von = e.von?.split(":").map(Number); const bis = e.bis?.split(":").map(Number);
        if (!von || !bis) return sum;
        return sum + Math.max(0, (bis[0]*60+bis[1]) - (von[0]*60+von[1]) - (e.pause||0));
      }, 0);
    return {
      projekte: projekte.length,
      protokolle: protokolle.length,
      stundenMonat: Math.floor(minuten / 60),
      minutenRest: minuten % 60,
    };
  } catch { return { projekte: 0, protokolle: 0, stundenMonat: 0, minutenRest: 0 }; }
}

// ── Backup / Restore ──
const BACKUP_KEYS = [
  "elektronikertools_config",
  "elektronikertools_pruefprotokoll",
  "elektronikertools_stundenbuch",
  "elektronikertools_wissen",
  "vp_projekte",
];

function exportBackup() {
  const data = {};
  BACKUP_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) data[k] = JSON.parse(v);
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `elektronikertools_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file, onDone) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      let count = 0;
      BACKUP_KEYS.forEach(k => {
        if (data[k] !== undefined) { localStorage.setItem(k, JSON.stringify(data[k])); count++; }
      });
      onDone(count);
    } catch { onDone(0); }
  };
  reader.readAsText(file);
}

// ── App-Definitionen ──
const APPS = [
  {
    id: "verteilerplaner",
    name: "Verteilerplaner",
    icon: "⚡",
    beschreibung: "Elektrische Verteiler planen, Sicherungen und FI-Schutzschalter zuweisen, Kabel verwalten.",
    farbe: "#4bc8e8",
    bg: "#0d2230",
  },
  {
    id: "stundenbuch",
    name: "Stundenbuch",
    icon: "⏱",
    beschreibung: "Arbeitszeiten erfassen, Projekte zuordnen, Stundennachweis als CSV exportieren.",
    farbe: "#3dcc7e",
    bg: "#0d2018",
  },
  {
    id: "pruefprotokoll",
    name: "Prüfprotokoll",
    icon: "📋",
    beschreibung: "VDE-Messungen erfassen: Isolationswiderstand, Schleifenimpedanz, FI-Auslösezeit, PE-Widerstand. Automatische Grenzwertbewertung.",
    farbe: "#f59e0b",
    bg: "#1a1200",
  },
  {
    id: "wissen",
    name: "Wissensdatenbank",
    icon: "📚",
    beschreibung: "Firmeninternes Wissen teilen: Checklisten, Herstellerhinweise, Montagetipps, Normen. Für alle Techniker im Team verfügbar.",
    farbe: "#06b6d4",
    bg: "#001a1f",
  },
];

// ── Konfigurations-Felder ──
const CONFIG_FELDER = [
  { key: "firma",       label: "Firmenname",        placeholder: "z.B. Elektro Mustermann GmbH", icon: "🏢" },
  { key: "mitarbeiter", label: "Mitarbeiter / Name", placeholder: "z.B. Max Mustermann",          icon: "👤" },
  { key: "ort",         label: "Ort",                placeholder: "z.B. München",                 icon: "📍" },
  { key: "dbName",      label: "Datenbank-Name",     placeholder: "z.B. elektronikertools_db",    icon: "🗄️" },
  { key: "supabaseUrl", label: "Supabase URL",        placeholder: "https://xxx.supabase.co",     icon: "🔗" },
  { key: "supabaseKey", label: "Supabase Anon Key",  placeholder: "eyJ…",                         icon: "🔑", password: true },
  { key: "notizen",     label: "Notizen",             placeholder: "Sonstige Einstellungen…",     icon: "📝" },
];

// ── Haupt-Dashboard ──
export default function Dashboard() {
  const [aktiveApp, setAktiveApp] = useState(null);
  const [config, setConfig] = useState(loadConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState({});
  const [ablauf, setAblauf] = useState({ abgelaufen: 0, baldFaellig: 0 });
  const [dbStatus, setDbStatus] = useState("unbekannt"); // "ok" | "fehler" | "unbekannt" | "nicht-konfiguriert"
  const [importMsg, setImportMsg] = useState("");
  const [stats, setStats] = useState(ladeLiveStats);

  useEffect(() => { saveConfig(config); }, [config]);

  // Ablauf-Info + Stats laden beim Start und wenn zurück zum Dashboard
  useEffect(() => { setAblauf(ladeAblaufInfo()); setStats(ladeLiveStats()); }, []);

  // Supabase-Ping
  useEffect(() => {
    if (!isSupabaseConfigured()) { setDbStatus("nicht-konfiguriert"); return; }
    supabase.from("projekte").select("id", { head: true, count: "exact" }).then(({ error }) => {
      setDbStatus(error ? "fehler" : "ok");
    }).catch(() => setDbStatus("fehler"));
  }, []);

  function openConfig() {
    setConfigDraft({ ...config });
    setShowConfig(true);
  }

  function saveConfigDraft() {
    setConfig(configDraft);
    setShowConfig(false);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    importBackup(file, count => {
      setImportMsg(count > 0 ? `${count} Datenbereiche wiederhergestellt. Seite neu laden!` : "Ungültige Backup-Datei.");
      setTimeout(() => setImportMsg(""), 6000);
    });
    e.target.value = "";
  }

  // App rendern
  function zurueck() {
    setAktiveApp(null);
    setAblauf(ladeAblaufInfo());
    setStats(ladeLiveStats());
  }

  if (aktiveApp === "verteilerplaner") {
    return (
      <div>
        <Verteilerplaner onBack={zurueck} />
      </div>
    );
  }

  if (aktiveApp === "stundenbuch") {
    return (
      <div>
        <TopBar label="Stundenbuch" icon="⏱" farbe="#3dcc7e" onBack={zurueck} config={config} onConfig={openConfig} />
        {showConfig && <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />}
        <Stundenbuch config={config} />
      </div>
    );
  }

  if (aktiveApp === "pruefprotokoll") {
    return (
      <div>
        <TopBar label="Prüfprotokoll" icon="📋" farbe="#f59e0b" onBack={zurueck} config={config} onConfig={openConfig} />
        {showConfig && <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />}
        <Pruefprotokoll config={config} />
      </div>
    );
  }

  if (aktiveApp === "wissen") {
    return (
      <div>
        <TopBar label="Wissensdatenbank" icon="📚" farbe="#06b6d4" onBack={zurueck} config={config} onConfig={openConfig} />
        {showConfig && <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />}
        <Wissensdatenbank config={config} />
      </div>
    );
  }

  // Startseite
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--bg) 0%, var(--bg2) 60%, #0a1520 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 16px", color: "var(--text)"
    }}>
      {showConfig && (
        <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />
      )}

      {/* Logo & Titel */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🔧</div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>
          Elektronikertools
        </h1>
        {config.firma && (
          <div style={{ color: "var(--blue)", fontSize: 15, marginTop: 6, fontWeight: 500 }}>
            {config.firma}{config.ort ? ` · ${config.ort}` : ""}
          </div>
        )}
        <div style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>
          Werkzeuge für Elektrofachkräfte
        </div>
        {(stats.projekte > 0 || stats.protokolle > 0 || stats.stundenMonat > 0) && (
          <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {stats.projekte > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#4bc8e8", fontFamily: "var(--mono)" }}>{stats.projekte}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Verteiler</div>
              </div>
            )}
            {stats.protokolle > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--mono)" }}>{stats.protokolle}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Protokolle</div>
              </div>
            )}
            {stats.stundenMonat > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>
                  {stats.stundenMonat}h{stats.minutenRest > 0 ? ` ${stats.minutenRest}min` : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>diesen Monat</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* App-Karten */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 800, width: "100%", marginBottom: 32 }}>
        {APPS.map(app => {
          const badge = app.id === "pruefprotokoll" && (ablauf.abgelaufen > 0 || ablauf.baldFaellig > 0);
          return (
            <button
              key={app.id}
              onClick={() => { setAktiveApp(app.id); if (app.id === "pruefprotokoll") setAblauf(ladeAblaufInfo()); }}
              style={{
                background: app.bg,
                border: `2px solid ${app.farbe}30`,
                borderRadius: 18,
                padding: "32px 28px",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--text)",
                flex: "1 1 280px",
                maxWidth: 340,
                transition: "border-color 0.2s, transform 0.15s",
                outline: "none",
                position: "relative",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = app.farbe; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${app.farbe}30`; e.currentTarget.style.transform = "none"; }}
            >
              {badge && (
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  display: "flex", gap: 4, flexDirection: "column", alignItems: "flex-end",
                }}>
                  {ablauf.abgelaufen > 0 && (
                    <span style={{ background: "var(--red)", color: "#fff", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>
                      {ablauf.abgelaufen} abgelaufen
                    </span>
                  )}
                  {ablauf.baldFaellig > 0 && (
                    <span style={{ background: "#f59e0b", color: "#000", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>
                      {ablauf.baldFaellig} bald fällig
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontSize: 40, marginBottom: 12 }}>{app.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: app.farbe, marginBottom: 8 }}>{app.name}</div>
              <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>{app.beschreibung}</div>
            </button>
          );
        })}
      </div>

      {/* Supabase-Status */}
      <div style={{ marginBottom: 20, fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 6 }}>
        {dbStatus === "ok" && <span style={{ color: "var(--green)" }}>● Datenbank verbunden</span>}
        {dbStatus === "fehler" && <span style={{ color: "var(--red)" }}>● Datenbank nicht erreichbar</span>}
        {dbStatus === "nicht-konfiguriert" && <span>💾 Lokale Speicherung (kein Supabase)</span>}
      </div>

      {/* Backup / Restore */}
      {importMsg && (
        <div style={{ marginBottom: 12, background: "rgba(82,217,138,0.1)", border: "1px solid rgba(82,217,138,0.3)", borderRadius: 8, padding: "8px 16px", color: "var(--green)", fontSize: 13 }}>
          {importMsg}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={exportBackup} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text3)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12 }}>
          ↓ Backup exportieren
        </button>
        <label style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text3)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12 }}>
          ↑ Backup einlesen
          <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
        </label>
      </div>

      {/* Einstellungen Button */}
      <button
        onClick={openConfig}
        style={{
          background: "transparent", border: "1px solid var(--border)",
          color: "var(--text3)", borderRadius: 10, padding: "10px 20px",
          cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8
        }}
      >
        ⚙ Einstellungen & Konfiguration
      </button>
    </div>
  );
}

// ── Top-Bar (wenn App geöffnet) ──
function TopBar({ label, icon, farbe, onBack, config, onConfig }) {
  return (
    <div style={{
      background: "var(--bg)", borderBottom: "1px solid var(--border)",
      padding: "10px 20px", display: "flex", alignItems: "center", gap: 12
    }}>
      <button
        onClick={onBack}
        style={{ background: "transparent", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}
        title="Zurück zum Dashboard"
      >
        ←
      </button>
      <div style={{ width: 1, height: 20, background: "var(--border)" }} />
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontWeight: 700, color: farbe, fontSize: 15 }}>{label}</span>
      {config.firma && <span style={{ color: "var(--text3)", fontSize: 13 }}>| {config.firma}</span>}
      <div style={{ flex: 1 }} />
      <button
        onClick={onConfig}
        style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16 }}
        title="Einstellungen"
      >
        ⚙
      </button>
    </div>
  );
}

// ── Konfigurations-Modal ──
function ConfigModal({ draft, setDraft, onSave, onClose }) {
  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18,
        padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>⚙ Einstellungen</h2>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CONFIG_FELDER.map(f => (
            <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {f.icon} {f.label}
              </span>
              <input
                type={f.password ? "password" : "text"}
                value={draft[f.key] || ""}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{
                  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
                  color: "var(--text)", padding: "9px 12px", fontSize: 14, outline: "none",
                  fontFamily: "inherit"
                }}
              />
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btn("var(--bg3)", "var(--text2)")}>Abbrechen</button>
          <button onClick={onSave} style={btn("rgba(82,217,138,0.1)", "var(--green)")}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

function btn(bg, color) {
  return {
    background: bg, color, border: `1px solid ${color}50`,
    borderRadius: 8, padding: "9px 20px", cursor: "pointer",
    fontSize: 14, fontWeight: 600
  };
}
