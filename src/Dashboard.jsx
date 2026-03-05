import React, { useState, useEffect } from "react";
import Verteilerplaner from "./Verteilerplaner.jsx";
import Stundenlang from "./Stundenlang.jsx";

// ── Lokaler Speicher für Konfiguration ──
const CONFIG_KEY = "elektronikertools_config";

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch { return {}; }
}
function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
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
    id: "stundenlang",
    name: "Stundenlang",
    icon: "⏱",
    beschreibung: "Arbeitszeiten erfassen, Projekte zuordnen, Stundennachweis als CSV exportieren.",
    farbe: "#3dcc7e",
    bg: "#0d2018",
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

  useEffect(() => { saveConfig(config); }, [config]);

  function openConfig() {
    setConfigDraft({ ...config });
    setShowConfig(true);
  }

  function saveConfigDraft() {
    setConfig(configDraft);
    setShowConfig(false);
  }

  // App rendern
  if (aktiveApp === "verteilerplaner") {
    return (
      <div>
        <TopBar label="Verteilerplaner" icon="⚡" farbe="#4bc8e8" onBack={() => setAktiveApp(null)} config={config} onConfig={openConfig} />
        {showConfig && <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />}
        <Verteilerplaner />
      </div>
    );
  }

  if (aktiveApp === "stundenlang") {
    return (
      <div>
        <TopBar label="Stundenlang" icon="⏱" farbe="#3dcc7e" onBack={() => setAktiveApp(null)} config={config} onConfig={openConfig} />
        {showConfig && <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />}
        <Stundenlang config={config} />
      </div>
    );
  }

  // Startseite
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a12 0%, #0e0e1a 60%, #0a1520 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 16px", fontFamily: "system-ui, sans-serif", color: "#e0e0e0"
    }}>
      {showConfig && (
        <ConfigModal draft={configDraft} setDraft={setConfigDraft} onSave={saveConfigDraft} onClose={() => setShowConfig(false)} />
      )}

      {/* Logo & Titel */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🔧</div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
          Elektronikertools
        </h1>
        {config.firma && (
          <div style={{ color: "#4bc8e8", fontSize: 15, marginTop: 6, fontWeight: 500 }}>
            {config.firma}{config.ort ? ` · ${config.ort}` : ""}
          </div>
        )}
        <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
          Werkzeuge für Elektrofachkräfte
        </div>
      </div>

      {/* App-Karten */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 800, width: "100%", marginBottom: 48 }}>
        {APPS.map(app => (
          <button
            key={app.id}
            onClick={() => setAktiveApp(app.id)}
            style={{
              background: app.bg,
              border: `2px solid ${app.farbe}30`,
              borderRadius: 18,
              padding: "32px 28px",
              cursor: "pointer",
              textAlign: "left",
              color: "#e0e0e0",
              flex: "1 1 280px",
              maxWidth: 340,
              transition: "border-color 0.2s, transform 0.15s",
              outline: "none",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = app.farbe; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${app.farbe}30`; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{app.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: app.farbe, marginBottom: 8 }}>{app.name}</div>
            <div style={{ fontSize: 14, color: "#9090b0", lineHeight: 1.5 }}>{app.beschreibung}</div>
          </button>
        ))}
      </div>

      {/* Einstellungen Button */}
      <button
        onClick={openConfig}
        style={{
          background: "transparent", border: "1px solid #2a2a3e",
          color: "#666", borderRadius: 10, padding: "10px 20px",
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
      background: "#0a0a12", borderBottom: "1px solid #1a1a2e",
      padding: "10px 20px", display: "flex", alignItems: "center", gap: 12
    }}>
      <button
        onClick={onBack}
        style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 20, padding: "0 4px", lineHeight: 1 }}
        title="Zurück zum Dashboard"
      >
        ←
      </button>
      <div style={{ width: 1, height: 20, background: "#2a2a3e" }} />
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontWeight: 700, color: farbe, fontSize: 15 }}>{label}</span>
      {config.firma && <span style={{ color: "#555", fontSize: 13 }}>| {config.firma}</span>}
      <div style={{ flex: 1 }} />
      <button
        onClick={onConfig}
        style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}
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
        background: "#0e0e1a", border: "1px solid #2a2a3e", borderRadius: 18,
        padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>⚙ Einstellungen</h2>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CONFIG_FELDER.map(f => (
            <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {f.icon} {f.label}
              </span>
              <input
                type={f.password ? "password" : "text"}
                value={draft[f.key] || ""}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{
                  background: "#0a0a12", border: "1px solid #2a2a3e", borderRadius: 8,
                  color: "#e0e0e0", padding: "9px 12px", fontSize: 14, outline: "none",
                  fontFamily: "inherit"
                }}
              />
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btn("#1a1a2e", "#666")}>Abbrechen</button>
          <button onClick={onSave} style={btn("#0d2a1a", "#3dcc7e")}>Speichern</button>
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
