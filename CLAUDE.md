# Claude Code – Projektregeln für Elektronikertools

Diese Datei enthält verbindliche Regeln die bei jeder Änderung am Projekt einzuhalten sind.

---

## Pflichtaufgaben nach jeder Änderung ##

**Nach jeder inhaltlichen Änderung am Code immer:**

1. **`CHANGELOG.md` aktualisieren** — neue Version mit Datum, geänderte/neue/entfernte Dinge notieren
2. **`README.md` aktualisieren** — neue Features, veränderte Struktur, neue SQL-Tabellen dokumentieren
3. **`ROADMAP.md` aktualisieren** — umgesetzte Punkte entfernen oder durchstreichen, neue Ideen ergänzen
4. **`docs/` aktualisieren** — relevante Seiten in `docs/apps/` oder `docs/setup.md` anpassen

Versionsschema: **`JAHR.MONAT.PATCH`** — z.B. `2026.3.4` = März 2026, fünftes Release.

**Wann die Version erhöhen:**
- ✅ Bei größeren Features oder mehreren kleinen Änderungen zusammen
- ✅ Wenn ein sinnvoller Release-Punkt erreicht ist
- ❌ **Nicht** bei jeder kleinen Bugfix- oder Textänderung einzeln

---

## Neue App hinzufügen — Checkliste

- [ ] `src/NeueTool.jsx` erstellen
- [ ] `src/lib/db_neuestool.js` erstellen (SQL-Migration als Kommentar im Header)
- [ ] `src/Dashboard.jsx`: App in APPS-Array + if-Block für Routing
- [ ] `docs/apps/neuestool.md` erstellen
- [ ] `README.md`: neue App-Sektion
- [ ] `CHANGELOG.md`: neue Version eintragen
- [ ] `ROADMAP.md`: Punkt als erledigt markieren / neue Ideen ergänzen
- [ ] Supabase SQL-Schema in `docs/supabase.sql` ergänzen
- [ ] Commit & Push

---

## Neue Supabase-Tabelle

Immer an drei Stellen ergänzen:
1. Als Kommentar im DB-Layer (`src/lib/db_xyz.js`)
2. In `docs/supabase.sql` (vollständige SQL-Datei)
3. In `README.md` im Supabase-Setup-Abschnitt

---

## Code-Konventionen

- CSS-Variablen statt Hardcoding: `var(--bg)`, `var(--text)`, `var(--green)` etc.
- Kein toter Code (App.jsx/App.css-Muster nicht wiederholen)
- Neue Komponenten die in >1 App genutzt werden → `src/components/`
- DB-Layer immer mit localStorage-Fallback: Supabase zuerst, dann `localStorage`
- Neue App-Farbe muss sich von bestehenden unterscheiden:
  - Verteilerplaner: `#2196C9` (blau)
  - Stundenbuch: `#3dcc7e` (grün)
  - Prüfprotokoll: `#f59e0b` (amber)
  - Wissensdatenbank: `#06b6d4` (teal)

---

## Projektstruktur

```
src/
├── Dashboard.jsx              ← App-Router, immer anpassen bei neuer App
├── {AppName}.jsx              ← Je Tool eine Datei
├── components/
│   └── Toast.jsx              ← Shared Components
├── lib/
│   ├── supabase.js            ← Client, nie ändern
│   ├── db.js                  ← Verteilerplaner-DB
│   ├── db_pruefprotokoll.js   ← Prüfprotokoll-DB
│   ├── db_stundenbuch.js      ← Stundenbuch-DB
│   └── db_wissen.js           ← Wissensdatenbank-DB
├── index.css                  ← Globale CSS-Vars, KEIN app-spezifisches CSS hier
└── main.jsx                   ← Einstiegspunkt, nur Dashboard importieren

docs/
├── index.md                   ← Übersicht & Navigation
├── setup.md                   ← Installation & Coolify
├── supabase.sql               ← Vollständiges SQL-Schema (immer aktuell halten!)
├── development.md             ← Entwickler-Guide
└── apps/
    ├── verteilerplaner.md
    ├── stundenbuch.md
    ├── pruefprotokoll.md
    └── wissensdatenbank.md
```
