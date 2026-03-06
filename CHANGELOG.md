# Changelog

Alle nennenswerten Änderungen an den Elektronikertools werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).
Versionierung nach dem Schema **`JAHR.MONAT.PATCH`** (analog zu Home Assistant).

---

## [2026.3.5] – 2026-03-06

### ✨ Neu

**PDF-Export (Prüfprotokoll)**
- Button "⬇ PDF" in der Protokollliste und im Editor
- Erzeugt ein professionelles A4-PDF nach DIN VDE 0100-600 mit Kopfzeile, Metadaten-Box, Gesamtergebnis-Banner und Stromkreis-Tabelle
- Lazy-geladen: jsPDF wird erst beim ersten PDF-Klick heruntergeladen (spart ~250kB beim Seitenstart)

**PWA — App installierbar**
- `public/manifest.json` mit Name, Icons, Theme-Color
- Service Worker mit Cache-Strategie (Supabase-Requests nie gecacht)
- Meta-Tags für iOS Safari; App kann auf Android/iOS als eigenständige App installiert werden

**Stundenbuch: Monats-Chart**
- SVG-Balkendiagramm direkt über der Eintrags-Liste
- Stunden pro Tag, farbkodiert: grün ≥ 8h, blau 4–8h, grau < 4h
- Gestrichelte 8h-Referenzlinie, heutiger Tag hervorgehoben

### 🐛 Bugfixes

- **Stundenbuch**: Timer-Prefill-State war nach der nutzenden Funktion deklariert — Reihenfolge korrigiert
- **Prüfprotokoll**: Totes Ternary in L2-PE-Label entfernt

### ♻ Refactoring

- `uid()` in alle Dateien war dupliziert → `src/lib/utils.js` zentralisiert, alle Importe aktualisiert

---

## [2026.3.4] – 2026-03-06

### ✨ Neu

**Prüfprotokoll**
- Fortschrittsring (SVG) im Editor-Header: zeigt % der gemessenen Stromkreise live an
- Ctrl+S / Cmd+S speichert das Protokoll direkt aus dem Editor

**Stundenbuch**
- Ctrl+S / Cmd+S speichert den Stunden-Eintrag im offenen Formular
- Feierabend-Hinweis: läuft der Timer ≥ 8h, erscheint eine diskrete Meldung mit der Gesamtzeit

**Dashboard**
- Live-Stats unterhalb des Titels: Verteiler-Anzahl, Protokoll-Anzahl, Arbeitsstunden diesen Monat
- Stats aktualisieren sich automatisch beim Zurücknavigieren

---

## [2026.3.3] – 2026-03-06

### ✨ Neu

**Dashboard**
- Ablaufdatum-Badge auf der Prüfprotokoll-Karte: zeigt Anzahl abgelaufener und bald fälliger Protokolle
- Supabase-Verbindungsstatus-Indikator (grün/rot/grau) direkt im Dashboard
- Backup-Export: alle App-Daten als JSON-Datei herunterladen
- Backup-Import: JSON-Backup einlesen und localStorage wiederherstellen

**Stundenbuch**
- Wochenstunden-Anzeige: Netto-Stunden der aktuellen Woche direkt im Header
- Start/Stop-Timer: Zeitmessung per Klick, füllt beim Stopp automatisch Von/Bis-Felder im neuen Eintrag

**Verteilerplaner**
- Projekt-Suche in beiden Lade-Dialogen (StartScreen + Mid-Session-Modal), erscheint ab 4 Projekten
- Reserveplatz-Markierung: Sicherung als "Reserve" flaggen (erscheint grau/gedimmt), wird in der Stückliste als "Reserveplatz (leer)" aufgeführt

**Prüfprotokoll**
- Drucken-Button im Protokoll-Editor (`window.print()`)
- Ablaufwarnung direkt an jedem Protokoll in der Liste: roter Badge bei abgelaufener Prüffrist, gelber Badge bei Fälligkeit in 30 Tagen
- Print-CSS verbessert: saubere Druckansicht, Buttons werden ausgeblendet, helle Hintergrundfarben

---

## [2026.3.2] – 2026-03-06

### 🎉 Elektronikertools – Erster vollständiger Release

Kompletter Neuaufbau von Grund auf: Dashboard, 4 Tools, Supabase-Anbindung, vollständige Dokumentation und öffentliche Veröffentlichung.

### ✨ Neu

**Dashboard & Infrastruktur**
- Dashboard als Startseite mit App-Auswahl und globaler Konfiguration (Firma, Mitarbeiter, Ort, Supabase)
- Gemeinsame Toast-Komponente (`src/components/Toast.jsx`) für alle Apps
- Globale CSS Design-Tokens (`--bg`, `--blue`, `--green`, `--red` …) in `index.css`
- Vollständige Projektdokumentation unter `docs/` (Setup, SQL-Schema, Entwickler-Guide, App-Docs)
- `CLAUDE.md` — Projektregeln und Konventionen für die Entwicklung

**Tool: Verteilerplaner** *(ehemals eigenständiges Projekt, jetzt integriert)*
- "← Dashboard"-Button im Startfenster und im Header
- Logo-Klick führt zurück zur Projektauswahl

**Tool: Stundenbuch** *(neu)*
- Zeiterfassung mit Datum, Von/Bis, Pause, Projekt, Tätigkeit und Notiz
- Monats- und Projektfilter, CSV-Export als Stundennachweis
- Supabase-Sync

**Tool: Prüfprotokoll** *(neu)*
- VDE-konforme Messprotokollierung nach VDE 0100-600
- PE-Durchgangswiderstand, Isolationswiderstand, Schleifenimpedanz, FI/RCD-Prüfung
- Automatische Ampel-Bewertung nach VDE-Grenzwerten
- Import aus Verteilerplaner (Stromkreise, Nennstrom, Sicherungstyp)
- Supabase-Sync

**Tool: Wissensdatenbank** *(neu)*
- Firmeninternes Wissen mit Titel, Kategorie, Tags, Autor und Markdown-Inhalt
- Volltextsuche + Kategoriefilter, Markdown-Renderer mit Live-Vorschau
- Team-Sharing via Supabase

### 🔧 Geändert
- Branding bereinigt: alle internen Bezeichnungen neutral, kein voreingestellter Firmenname
- CSS-Variablen: `--svp`/`--svp2` → `--blue`/`--blue2`
- localStorage-Keys: `svp_*` → `vp_*` mit automatischer Migration

---

## Ältere Versionen (vor Elektronikertools, Semver)

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
