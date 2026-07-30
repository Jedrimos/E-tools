# Entwickler-Guide

## Projektstruktur

```
src/
├── Dashboard.jsx              App-Router + Startseite
├── Verteilerplaner.jsx        Tool: Verteilerplaner (~3600 Zeilen)
├── Stundenbuch.jsx            Tool: Stundenbuch
├── Pruefprotokoll.jsx         Tool: Prüfprotokoll
├── Wissensdatenbank.jsx       Tool: Wissensdatenbank
├── Wartungsprotokoll.jsx      Tool: Wartungsprotokoll
├── Leitungsberechnung.jsx     Tool: Elektrorechner
├── Materialzaehler.jsx        Tool: Materialzähler
├── KNXPlaner.jsx              Tool: KNX-Planer
├── components/
│   └── Toast.jsx              Gemeinsame Toast-Komponente + useToasts-Hook
├── lib/
│   ├── utils.js                Gemeinsame Hilfsfunktionen (uid, …)
│   ├── vde.js                  VDE-Grenzwerte & Bewertungslogik (Prüfprotokoll)
│   ├── db_pruefprotokoll.js    localStorage-Layer Prüfprotokoll
│   ├── db_stundenbuch.js       localStorage-Layer Stundenbuch
│   ├── db_wissen.js            localStorage-Layer Wissensdatenbank
│   ├── db_wartung.js           localStorage-Layer Wartungsprotokoll
│   ├── db_materialzaehler.js   localStorage-Layer Materialzähler
│   └── db_knx.js               localStorage-Layer KNX-Planer
├── index.css                  Globale CSS Custom Properties + Reset
└── main.jsx                   Einstiegspunkt

docs/
├── index.md                   Dokumentations-Übersicht
├── setup.md                   Installation & Deployment
├── development.md             Diese Datei
└── apps/                      Per-App Dokumentation
```

---

## Neue App anlegen

### 1. Komponente erstellen

`src/MeineApp.jsx`:
```jsx
import React, { useState, useEffect } from "react";
import Toast from "./components/Toast.jsx";
import { useToasts } from "./lib/useToasts.js";
import { loadXyzDB, saveXyzDB, deleteXyzDB } from "./lib/db_xyz.js";

const FARBE = "#8b5cf6"; // Neue Farbe wählen

export default function MeineApp({ config = {} }) {
  // ...
}
```

### 2. DB-Layer erstellen

`src/lib/db_xyz.js` — localStorage-only, immer nach diesem Muster:
```js
const LS_KEY = "elektronikertools_xyz";
function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function lsSet(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

export async function loadXyzDB() { return lsGet(); }
export async function saveXyzDB(item) {
  const list = lsGet();
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0) list[idx] = item; else list.push(item);
  lsSet(list);
  return item;
}
export async function deleteXyzDB(id) {
  lsSet(lsGet().filter(x => x.id !== id));
}
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

### 4. Dokumentation

- `docs/apps/meinapp.md` erstellen
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
| `--blue` | `#2196C9` | Verteilerplaner-Akzent / Info-Blau |
| `--blue2` | `#1a82b4` | Verteilerplaner-Akzent dunkel |
| `--green` | `#52d98a` | Erfolg / OK |
| `--red` | `#ff6b6b` | Fehler / Löschen |
| `--purple` | `#a78bfa` | 3-phasig, Akzent |
| `--text` | `#e8e4de` | Primärtext |
| `--text2` | `#9aa3ad` | Sekundärtext |
| `--text3` | `#5a6370` | Platzhalter, Labels |
| `--mono` | JetBrains Mono | Code, Messwerte |

**Regel:** Niemals Hex-Farben hardcoden wenn eine Variable existiert.

---

## Speicher-Muster

Alle Apps speichern ausschließlich in `localStorage` (keine Datenbank/Backend). Muster:
1. **Beim Start:** State per lazy `useState(loadXyzDB)`-Initializer oder in einem `useEffect` laden
2. **Beim Speichern/Löschen:** State sofort aktualisieren, `save`-Funktion synchron aufrufen (try/catch für Speicherfehler, z.B. Quota), Toast anzeigen
3. **Neue localStorage-Keys** immer in `BACKUP_KEYS` (`src/Dashboard.jsx`) ergänzen, sonst gehen sie beim Backup/Restore verloren

```js
// Muster für handleSave:
async function handleSave(item) {
  setItems(prev => [...prev, item]);
  try {
    await saveXyzDB(item);
    addToast("Gespeichert ✓");
  } catch (e) {
    addToast("Speichern fehlgeschlagen: " + e.message, "error");
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
