# Changelog

Alle nennenswerten Änderungen an den Elektronikertools werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).
Versionierung nach dem Schema **`JAHR.MONAT.PATCH`** (analog zu Home Assistant).

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
