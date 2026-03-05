# ⚡ Verteilerplaner

Professionelle Planung und Dokumentation von Elektroverteiler-Belegungen im Browser.

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

## Integration mit Prüfprotokoll

Gespeicherte Verteiler-Projekte können direkt im Prüfprotokoll-Tool importiert werden:
- Auftraggeber, Standort, Ersteller werden übernommen
- Alle Stromkreise (Sicherungen mit zugehörigen Kabeln) werden als Prüfprotokoll-Stromkreise angelegt
- Nennstrom und Sicherungstyp werden automatisch aus der LSS-Bezeichnung geparst
