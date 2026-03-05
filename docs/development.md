# Entwickler-Guide

## Projektstruktur

```
src/
├── Dashboard.jsx              App-Router + Startseite
├── Verteilerplaner.jsx        Tool: Verteilerplaner (~3000 Zeilen)
├── Stundenbuch.jsx            Tool: Stundenbuch
├── Pruefprotokoll.jsx         Tool: Prüfprotokoll
├── Wissensdatenbank.jsx       Tool: Wissensdatenbank
├── components/
│   └── Toast.jsx              Gemeinsame Toast-Komponente + useToasts-Hook
├── lib/
│   ├── supabase.js            Supabase-Client (aus Env-Vars)
│   ├── db.js                  DB-Layer Verteilerplaner
│   ├── db_pruefprotokoll.js   DB-Layer Prüfprotokoll
│   ├── db_stundenbuch.js      DB-Layer Stundenbuch
│   └── db_wissen.js           DB-Layer Wissensdatenbank
├── index.css                  Globale CSS Custom Properties + Reset
└── main.jsx                   Einstiegspunkt

docs/
├── index.md                   Dokumentations-Übersicht
├── setup.md                   Installation & Deployment
├── supabase.sql               Vollständiges SQL-Schema
├── development.md             Diese Datei
└── apps/                      Per-App Dokumentation
```

---

## Neue App anlegen

### 1. Komponente erstellen

`src/MeineApp.jsx`:
```jsx
import React, { useState, useEffect } from "react";
import Toast, { useToasts } from "./components/Toast.jsx";
import { loadXyzDB, saveXyzDB, deleteXyzDB } from "./lib/db_xyz.js";

const FARBE = "#8b5cf6"; // Neue Farbe wählen

export default function MeineApp({ config = {} }) {
  // ...
}
```

### 2. DB-Layer erstellen

`src/lib/db_xyz.js` — immer nach diesem Muster:
```js
/**
 * Benötigte SQL-Migration:
 * CREATE TABLE xyz (...);
 */
import { supabase, isSupabaseConfigured } from "./supabase.js";
const TABLE = "xyz";

function toRow(item) { /* ... */ }
function fromRow(row) { /* ... */ }

export async function loadXyzDB() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from(TABLE).select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}
export async function saveXyzDB(item) { /* upsert */ }
export async function deleteXyzDB(dbId) { /* delete */ }
```

### 3. Dashboard registrieren

In `src/Dashboard.jsx`:
```js
// Import ergänzen
import MeineApp from "./MeineApp.jsx";

// APPS-Array ergänzen
{ id: "meinapp", name: "Meine App", icon: "🔧",
  beschreibung: "...", farbe: "#8b5cf6", bg: "#0f0a1e" }

// Routing ergänzen
if (aktiveApp === "meinapp") {
  return (
    <div>
      <TopBar label="Meine App" icon="🔧" farbe="#8b5cf6" ... />
      <MeineApp config={config} />
    </div>
  );
}
```

### 4. Dokumentation + SQL

- `docs/apps/meinapp.md` erstellen
- `docs/supabase.sql` — neue Tabelle ergänzen
- `README.md` — neue App-Sektion
- `CHANGELOG.md` — neue Version
- `ROADMAP.md` — Punkt als erledigt

---

## CSS-Konventionen

Alle Design-Tokens sind in `src/index.css` als CSS Custom Properties:

| Variable | Wert | Verwendung |
|---|---|---|
| `--bg` | `#111416` | Haupthintergrund |
| `--bg2` | `#181c1f` | Karten, Panels |
| `--bg3` | `#1e2327` | Input-Hintergrund, subtile Hervorhebung |
| `--border` | `#2a3035` | Dezente Trennlinien |
| `--border2` | `#333b42` | Aktive Trennlinien |
| `--svp` | `#2196C9` | Verteilerplaner-Akzent |
| `--blue` | `#2196C9` | Info-Blau |
| `--green` | `#52d98a` | Erfolg / OK |
| `--red` | `#ff6b6b` | Fehler / Löschen |
| `--purple` | `#a78bfa` | 3-phasig, Akzent |
| `--text` | `#e8e4de` | Primärtext |
| `--text2` | `#9aa3ad` | Sekundärtext |
| `--text3` | `#5a6370` | Platzhalter, Labels |
| `--mono` | JetBrains Mono | Code, Messwerte |

**Regel:** Niemals Hex-Farben hardcoden wenn eine Variable existiert.

---

## Supabase-Muster

Alle Apps verwenden das gleiche Muster:
1. **Beim Start:** `loadXxxDB()` aufrufen, bei Erfolg State + localStorage aktualisieren
2. **Beim Speichern:** Sofort lokal aktualisieren, dann async Supabase-Sync
3. **Beim Löschen:** Sofort lokal löschen, dann async `db_id` aus Supabase löschen
4. **Fallback:** Immer `localStorage` wenn Supabase nicht konfiguriert

```js
// Muster für handleSave:
async function handleSave(item) {
  // 1. Sofort lokal
  setItems(prev => [...prev, item]);
  addToast("Gespeichert ✓");
  // 2. Async DB
  try {
    const saved = await saveXyzDB(item);
    if (saved) setItems(prev => prev.map(x => x.id === item.id ? { ...x, db_id: saved.db_id } : x));
  } catch (e) {
    addToast("DB-Fehler: " + e.message, "error");
  }
}
```

---

## App-Farben (aktuelle Belegung)

| App | Farbe | Hintergrund-Tint |
|---|---|---|
| Verteilerplaner | `#2196C9` blau | `#0d2230` |
| Stundenbuch | `#3dcc7e` grün | `#0d2018` |
| Prüfprotokoll | `#f59e0b` amber | `#1a1200` |
| Wissensdatenbank | `#06b6d4` teal | `#001a1f` |

Nächste freie Farben für neue Apps: `#8b5cf6` (violett), `#ec4899` (pink), `#f97316` (orange)
