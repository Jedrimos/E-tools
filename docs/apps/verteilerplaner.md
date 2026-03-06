# ⚡ Verteilerplaner

Professionelle Planung und Dokumentation von Elektroverteiler-Belegungen im Browser.

**Version:** `2026.3.5` | **Farbe:** `#2196C9` (blau)

---

## Workflow (5 Schritte)

### Schritt 1 – Projektdaten
- Projektname, Kunde/Auftraggeber, Adresse, Ersteller, Standort des Verteilers
- Stockwerke definieren (KG, EG, OG, DG, Außen, Technik) mit individueller Farbcodierung
- Räume pro Stockwerk anlegen

### Schritt 2 – Kabelerfassung
- Kabel mit Bezeichnung, Raum, Stockwerk, Kabeltyp erfassen
- Unterstützte Kabeltypen: NYM-J, NYY-J, H07V-K, LIYY, NHXMH
- Kabelquerschnitt und Adernanzahl
- **KI-Import per Foto:** Foto eines handgeschriebenen Blockblatts → Claude API erkennt automatisch Kabel

### Schritt 3 – Sicherungen planen
- Kabel per **Drag & Drop** auf LSS-Gruppen (Leitungsschutzschalter) verteilen
- 1-phasige und 3-phasige LSS
- FILS (FI-/LS-Schalter Kombination)
- Touch-Drag auf Mobilgeräten und Tablets
- Automatische Sicherungsempfehlung basierend auf Kabelquerschnitt

### Schritt 4 – FI-Konfiguration
- FI-Schutzschalter (RCD) konfigurieren
- Parameter: Bemessungsstrom (25A–125A), Typ (AC/A/F/B), Fehlerstrom (30/100/300mA), Polzahl
- Mehrere FI-Gruppen möglich
- TE-Kapazitätsprüfung pro FI-Gruppe

### Schritt 5 – Belegungsplan
- **Visuelle Darstellung:** Grafischer Verteilerplan mit TE-genauer Darstellung
- **Tabellarische Ansicht:** Alle Sicherungen und zugehörige Kabel
- **Klemmenleiste:** Visualisierung der Klemmen mit N- und PE-Brücken
- **Stückliste:** Alle benötigten Komponenten, WhatsApp-Export
- **Beschriftungsplan:** Q1F1-Schema für Beschriftungsschilder
- **Direktbearbeitung:** FI und LSS im Plan direkt bearbeiten

## Datenspeicherung

- **Lokal:** `localStorage` unter Key `svp_projekte`
- **Supabase:** Tabelle `projekte` (wenn konfiguriert) — automatischer Sync

## Technische Besonderheiten

- Undo-Funktion (Ctrl+Z) für gelöschte Kabel und Sicherungen
- Auto-Save nach Plan-Generierung
- Projekt-Verwaltung: mehrere Projekte speichern, laden, löschen
- KI-API über eigenen Anthropic-Key konfigurierbar
- **Logo klickbar:** Klick auf das SVP-Logo im Header kehrt jederzeit zur Startauswahl zurück

## Integration mit Prüfprotokoll

Gespeicherte Verteiler-Projekte können direkt im Prüfprotokoll-Tool importiert werden:
- Auftraggeber, Standort, Ersteller werden übernommen
- Alle Stromkreise (Sicherungen mit zugehörigen Kabeln) werden als Prüfprotokoll-Stromkreise angelegt
- Nennstrom und Sicherungstyp werden automatisch aus der LSS-Bezeichnung geparst

---

## Roadmap

### Kurzfristig
- **Kostenkalkulation** — Stückliste um Einkaufspreise erweitern, Gesamtmaterialkosten berechnen und als Angebot/Auftrag exportieren.
- **Mehrere Verteiler pro Projekt** — Haupt- und Unterverteiler im gleichen Projekt planen, Verbindung durch Stichleitung darstellen.

### Mittelfristig
- **DXF / AutoCAD-Export** — Belegungsplan als DXF-Datei für CAD-Systeme.
- **Import anderer Formate** — Excel-Import für Kabellisten (Spalten zuordnen), ggf. Hager- oder ABB-Konfiguratoren-Export lesen.
- **Kabelrouten / Trassierung** — Einfache Skizze der Kabeltrasse im Gebäudeplan (Bild hochladen, Linien ziehen).

### Langfristig
- **Leistungsfluss-Visualisierung** — Einfache Einlinien-Darstellung des Verteilers.
- **Selektivitäts-Check** — Automatische Prüfung ob vorgelagerte und nachgelagerte Sicherungen selektiv sind.
- **Reserveplanung** — Gezielt Reserveplätze im Verteiler markieren und in der Stückliste ausweisen.

### Technische Schulden
- `Verteilerplaner.jsx` ist mit ~3000 Zeilen sehr groß → schrittweise in kleinere Komponenten aufteilen (z.B. `Step1`, `Step2`, `PlanView`)

---

## Changelog

### [2026.3.0] – 2026-03-05
**Elektronikertools-Neustart:** Verteilerplaner als eigenständiges Tool ins neue Multi-App-Dashboard integriert. Keine Funktionsänderungen gegenüber 1.6.0.

---

### [1.6.0] – 2026-03-05
#### ✨ Neu
- **Startfenster** — Modal beim App-Start mit "Neues Projekt anlegen" oder "Vorhandenes Projekt laden"
- **Einstellungsseite (⚙️)** — Firmenname, Standard-Ersteller und KI-API-Konfiguration in einem Dialog
- **Supabase-Datenbankanbindung** — Projekte optional in Supabase PostgreSQL speichern (self-hosted oder Cloud)
- **Auto-Save** — Nach jeder Plan-Generierung automatisches Speichern lokal und in Supabase
- **Ersteller & Standort** — Neue Felder in Schritt 1, erscheinen im Belegungsplan-Kopf

#### 🐛 Behoben
- Steckbrückenlogik (Querverbinder): Querverbinder wurden nie berechnet wegen fehlendem `setShowKlemmen`

#### 🔧 Geändert
- ⚙️-Button öffnet jetzt das neue kombinierte Einstellungs-Modal
- Toten Code entfernt: `kabelId`, `kabelLabel`, `showKlemmen` u.a.

---

### [1.5.0] – 2025
#### ✨ Neu
- Custom Tooltips bei gesperrten Navigationsschritten
- Warnung bei unvollständiger Projektkonfiguration in Schritt 1

#### 🐛 Behoben
- Navigation gesperrt / nicht anklickbar unter bestimmten Bedingungen
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
