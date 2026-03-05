# Changelog

Alle nennenswerten Änderungen an den Elektronikertools werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).
Versionierung nach dem Schema **`JAHR.MONAT.PATCH`** (analog zu Home Assistant).

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
