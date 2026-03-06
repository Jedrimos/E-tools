# Changelog

Alle nennenswerten Änderungen an den Elektronikertools werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).
Versionierung nach dem Schema **`JAHR.MONAT.PATCH`** (analog zu Home Assistant).

---

## [2026.3.5] – 2026-03-06

### Verteilerplaner: Logo klickbar → Zurück zur Startauswahl

### 🔧 Geändert
- **Verteilerplaner:** Logo im Header ist jetzt klickbar — Klick auf das SVP-Logo bringt den Nutzer zurück zum Startfenster (Neues Projekt / Laden)
- Hover-Effekt am Logo signalisiert die Klickbarkeit
- `title="Zur Startseite"` als Tooltip

---

## [2026.3.4] – 2026-03-05

### Neues Tool: Wissensdatenbank + docs/ Ordner + CLAUDE.md

### ✨ Neu
- **Tool: Wissensdatenbank** — Firmeninternes Wissen für das Team.
  - Artikel mit Titel, Kategorie (10 Voreinstellungen), Tags, Autor und Markdown-Inhalt
  - Volltextsuche (Titel, Inhalt, Tags, Autor) + Kategoriefilter in Echtzeit
  - Artikel-Karten-Übersicht + Detailansicht mit gerendertem Markdown
  - Markdown-Renderer: `# Überschriften`, `**fett**`, `*kursiv*`, `` `code` ``, `- Listen`, `1. nummeriert`, `> Blockquote`, ` ``` Codeblöcke ``` `
  - Live-Vorschau im Editor
  - Team-Sharing via Supabase (`☁ Geteilt im Team`-Indikator)
  - Warnung wenn Supabase nicht konfiguriert
  - Farbthema: Teal `#06b6d4`
- **`src/lib/db_wissen.js`** — Supabase CRUD für `wissensdatenbank`-Tabelle
- **`docs/`** — Vollständige Projektdokumentation:
  - `docs/index.md` — Übersicht & Navigation
  - `docs/setup.md` — Installation, Coolify, Supabase-Setup
  - `docs/supabase.sql` — Vollständiges SQL-Schema aller 4 Tabellen mit Trigger
  - `docs/development.md` — Neue App anlegen, CSS-Konventionen, Supabase-Muster
  - `docs/apps/verteilerplaner.md` — Verteilerplaner-Dokumentation
  - `docs/apps/stundenbuch.md` — Stundenbuch-Dokumentation
  - `docs/apps/pruefprotokoll.md` — Prüfprotokoll + VDE-Grenzwerte-Tabelle
  - `docs/apps/wissensdatenbank.md` — Wissensdatenbank + Markdown-Syntax-Referenz
- **`CLAUDE.md`** — Projektregeln für Claude Code: Pflichtaufgaben nach jeder Änderung, Checkliste neue App, CSS-Konventionen, App-Farben

### 🔧 Geändert
- Dashboard: Wissensdatenbank als App #4 registriert (teal, `#001a1f` Hintergrund)
- README: Wissensdatenbank-Sektion, docs/-Link, vollständiges SQL für alle 4 Tabellen, aktualisierte Projektstruktur
- ROADMAP: Wissensdatenbank als erledigt markiert

---

## [2026.3.3] – 2026-03-05

### Gemeinsame Datenbank + Verteilerplaner-Import im Prüfprotokoll

### ✨ Neu
- **Prüfprotokoll → Supabase-Sync:** Beim Start automatisch aus Supabase laden, nach jedem Speichern/Löschen async synchronisieren. `☁ Datenbank`-Indikator wenn aktiv.
- **Stundenbuch → Supabase-Sync:** Gleicher Mechanismus wie Prüfprotokoll. `db_id` pro Eintrag für sicheres Update/Delete.
- **Import aus Verteilerplaner:** Im Prüfprotokoll können gespeicherte Verteiler-Projekte direkt importiert werden. Übernommen werden: Auftraggeber, Anlagenstandort, Prüfer sowie alle Stromkreise (Bezeichnung aus Kabel-Namen, Nennstrom + Sicherungstyp aus LSS z.B. "B16", 3-phasig-Flag).
- **`src/lib/db_pruefprotokoll.js`:** DB-Layer für `pruefprotokolle`-Tabelle (CRUD + `loadProjekteForImport` mit Supabase→localStorage-Fallback).
- **`src/lib/db_stundenbuch.js`:** DB-Layer für `stunden`-Tabelle (CRUD).
- SQL-Migrationsskripte als Kommentare in den jeweiligen DB-Layer-Dateien.

---

## [2026.3.2] – 2026-03-05

### Neues Tool: Prüfprotokoll

### ✨ Neu
- **Tool: Prüfprotokoll** — VDE-konforme Messprotokollierung nach VDE 0100-600.
  - Protokoll-Liste mit Gesamtbewertung je Protokoll
  - Kopfdaten: Auftraggeber, Standort, Anlagenart, Nennspannung, Prüfer, Datum, nächste Prüfung, Auftragsnummer
  - Stromkreis-Tabelle mit aufklappbaren Detailformularen
  - **PE-Durchgangswiderstand** R_PE (Ω)
  - **Isolationswiderstand** Riso L1/L2/L3/N-PE (MΩ) — 1- und 3-phasig
  - **Schleifenimpedanz** Zs (Ω) + Kurzschlussstrom Ik (A)
  - **FI/RCD-Prüfung:** IΔN (10–500 mA), Typ (AC/A/F/B/S), t@IΔN, t@5×IΔN, t@½×IΔN, UB
  - Automatische Ampel-Bewertung nach VDE-Grenzwerten pro Messwert und Stromkreis
  - Speicherung in localStorage
- **Dashboard:** Prüfprotokoll als App #3 mit amber/gold Farbschema registriert.

---

## [2026.3.1] – 2026-03-05

### Code-Qualität: Globale CSS-Variablen, gemeinsamer Toast, Aufräumen

### ✨ Neu
- **`src/components/Toast.jsx`:** Gemeinsame Toast-Komponente + `useToasts`-Hook für alle Apps. Stundenbuch und Verteilerplaner importieren daraus statt eigene Implementierung zu führen.
- **CSS-Design-Tokens global:** `:root`-Variablen (`--bg`, `--green`, `--red`, `--svp` …), Font-Import, globale Resets, Keyframes und Print-Stile in `index.css` ausgelagert. Alle Apps haben die Variablen verfügbar, ohne dass Verteilerplaner zuerst geladen werden muss.

### 🗑 Entfernt
- `src/App.jsx` — Vite-Template-Überrest (tote Datei)
- `src/App.css` — Vite-Template-Überrest (leere Datei)
- `src/assets/react.svg` — Vite-Template-Überrest
- Doppelter CSS-Block in `Verteilerplaner.jsx` (`:root`, Font, Resets, Keyframes, Print) — jetzt in `index.css`
- Lokale `Toast`-Implementierung in `Stundenbuch.jsx` — ersetzt durch gemeinsame Komponente

### 🔧 Geändert
- `index.html`: Sprache `en` → `de`, Titel `mein-sicherungsplaner` → `Elektronikertools`, Meta-Description ergänzt
- `index.css`: Background-Farbe auf `var(--bg)` vereinheitlicht (war `#0f172a` ≠ `--bg`)
- `Dashboard.jsx`: Alle hardcodierten Hex-Farben durch CSS-Variablen ersetzt
- `Stundenbuch.jsx`: Alle hardcodierten Hex-Farben durch CSS-Variablen ersetzt

---

## [2026.3.0] – 2026-03-05

### 🎉 Elektronikertools – Neustart

Das Projekt wurde von "SVP Verteilerplaner" zu **Elektronikertools** umstrukturiert und erweitert.

### ✨ Neu
- **Dashboard** — Neue Startseite zur Tool-Auswahl. Alle Tools auf einen Blick, direkt anwählbar.
- **Globale Konfiguration** — Einstellungsmodal mit Firmenname, Mitarbeiter, Ort, Datenbank-Name und Supabase-Credentials. Einstellungen gelten für alle Tools.
- **Stundenbuch** — Neues Tool zur Zeiterfassung: Einträge mit Datum, Von/Bis, Pause, Projekt/Baustelle, Tätigkeit und Notiz. Monatsfilter, Projektfilter, CSV-Export als Stundennachweis.
- **Verteilerplaner** — Der bisherige SVP Verteilerplaner ist als eigenständiges Tool integriert (keine Funktionsänderungen gegenüber 1.6.0).

### 🔧 Geändert
- Paketname: `mein-sicherungsplaner` → `elektronikertools`
- Einstiegspunkt: `App.jsx` → `Dashboard.jsx` (App-Logik in `Verteilerplaner.jsx` ausgelagert)
- Versionierungsschema: Semver → `JAHR.MONAT.PATCH`

---

## Ältere Versionen (SVP Verteilerplaner, Semver)

### [1.6.0] – 2026-03-05

#### ✨ Neu
- **Startfenster** — Modal beim App-Start mit "Neues Projekt anlegen" oder "Vorhandenes Projekt laden"
- **Einstellungsseite (⚙️)** — Firmenname, Standard-Ersteller und KI-API-Konfiguration in einem Dialog
- **Supabase-Datenbankanbindung** — Projekte optional in Supabase PostgreSQL speichern (self-hosted oder Cloud)
- **Auto-Save** — Nach jeder Plan-Generierung automatisches Speichern lokal und in Supabase
- **Ersteller & Standort** — Neue Felder in Schritt 1, erscheinen im Belegungsplan-Kopf

#### 🐛 Behoben
- Steckbrückenlogik (Querverbinder): Querverbinder wurden nie berechnet wegen fehlendem `setShowKlemmen`. Fix: überflüssige Abhängigkeit entfernt

#### 🔧 Geändert
- ⚙️-Button öffnet jetzt das neue kombinierte Einstellungs-Modal
- Toten Code entfernt: `kabelId`, `kabelLabel`, `showKlemmen` u.a.

---

### [1.5.0] – 2025

#### ✨ Neu
- Custom Tooltips bei gesperrten Navigationsschritten
- Warnung bei unvollständiger Projektkonfiguration in Schritt 1

#### 🐛 Behoben
- Navigation gesperrt / nicht anklickbar unter bestimmten Bedingungen (Erreichbarkeits-Logik überarbeitet)
- Kein vordefiniertes leeres Kabel beim App-Start
- Speichern-Button ohne Projektname

#### 🔧 Geändert
- Touch Drag & Drop vollständig überarbeitet
- Mobile UI verbessert

---

### [1.4.0] – 2025

#### ✨ Neu
- Undo-Funktion (Ctrl+Z) für gelöschte Kabel und Sicherungen
- Plan-Edit-Modal — FI und LSS direkt im Belegungsplan bearbeiten
- Querverbinder-Berechnung
- N-Brücken-Kalkulation
- FILS-Unterstützung
- KNX-Reserveklemme

---

### [1.3.0] – 2025

#### ✨ Neu
- KI-Import via Foto (Anthropic Claude API)
- Beschriftungsplan im Q1F1-Schema
- Stockwerk-Farbcodierung

---

### [1.2.0] – 2025

#### ✨ Neu
- Klemmenleiste-Visualisierung
- Stückliste mit WhatsApp-Export
- Projekt speichern / laden

---

### [1.1.0] – 2025

#### ✨ Neu
- Drag & Drop für Kabelzuweisung
- 3-phasige Leitungsschutzschalter
- FILS-Konfiguration

---

### [1.0.0] – 2025

#### 🎉 Erstveröffentlichung
- Geführter 5-Schritte-Workflow: Projekt → Kabel → Sicherungen → FI → Plan
- Automatische Verteilung auf FI-Gruppen mit TE-Kapazitätsprüfung
- Visuelle und tabellarische Plan-Ansicht
