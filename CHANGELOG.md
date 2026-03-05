# Changelog

Alle nennenswerten Änderungen am SVP Verteilerplaner werden hier dokumentiert.  
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [1.6.0] – 2026-03-05

### ✨ Neu
- **Startfenster** — Beim App-Start erscheint ein Modal mit "Neues Projekt anlegen" oder "Vorhandenes Projekt laden". Neues Projekt fragt direkt nach Kunde/Adresse/Ersteller/Standort Verteiler.
- **Einstellungsseite (⚙️)** — Neues kombiniertes Einstellungs-Modal: Firmenname, Standard-Ersteller (Vorausfüllung bei neuen Projekten) und KI-API-Konfiguration in einem Dialog.
- **Supabase-Datenbankanbindung** — Projekte können optional in einer Supabase-PostgreSQL-Datenbank gespeichert werden (self-hosted oder Cloud). Fällt automatisch auf localStorage zurück wenn kein Supabase konfiguriert ist.
- **Selbst-Hosting der Datenbank** — Supabase lässt sich über Coolify als One-Click-Service deployen. Vollständiges SQL-Schema unter `supabase-schema.sql`.
- **Auto-Save** — Nach jeder Plan-Generierung wird das Projekt automatisch lokal und in Supabase gespeichert.
- **Ersteller & Standort** — Neues Projektmetadaten-Feld "Ersteller" und "Standort Verteiler" in Schritt 1. Beide erscheinen im Belegungsplan-Kopf und in der Export-Fußzeile.
- **Dynamischer Firmenname** — Stückliste, Beschriftungsplan und Belegungsplan-Kopf verwenden den konfigurierten Firmennamen statt des fest kodierten Textes.

### 🐛 Behoben
- **Steckbrückenlogik (Querverbinder)** — Querverbinder und Steckbrücken wurden nie berechnet, weil der interne `showKlemmen`-State immer `false` war und kein `setShowKlemmen(true)` existierte. Fix: überflüssige Abhängigkeit entfernt, Querverbinder werden jetzt korrekt berechnet sobald `mitQV` aktiviert ist.

### 🔧 Geändert
- **⚙️-Button** öffnet jetzt das neue kombinierte Einstellungs-Modal statt des separaten API-Einstellungs-Dialogs.
- Toten Code entfernt: `kabelId`, `kabelLabel`, `kabelInfoFromId`, `resolveKabeltyp`, `KABEL_LEGACY`, `zKabel`, `showKlemmen`

---

## [1.5.0] – 2025

### ✨ Neu
- **Custom Tooltips** — Gesperrte Navigationsschritte zeigen beim Hover einen dezenten Darkmode-Tooltip mit dem genauen Sperrgrund, z.B. *„Erst Kabel in Schritt 2 anlegen"* oder *„Erst Plan in Schritt 4 generieren"*
- **Warnung bei unvollständiger Projektkonfiguration** — Schritt 1 zeigt jetzt einen Hinweis wenn keine Stockwerke oder Räume ausgewählt wurden, bevor man mit der Kabelerfassung beginnt
- **Grüne Bestätigung** auf Schritt 1 zeigt jetzt auch die Raumanzahl an

### 🐛 Behoben
- **Navigation gesperrt / in Leere klickend** — Schritte 3, 4 und 5 waren unter bestimmten Bedingungen nicht anklickbar obwohl sie es sein sollten. Schritt 2 war fälschlicherweise gesperrt. Die Erreichbarkeits-Logik wurde vollständig überarbeitet: Schritte 1 und 2 sind immer zugänglich, Schritt 3 und 4 sobald Kabel vorhanden sind, Schritt 5 sobald ein Plan generiert wurde
- **Kein vordefiniertes leeres Kabel mehr** beim App-Start — der Anfangszustand ist jetzt konsistent leer, Schritt 3 ist korrekt gesperrt bis das erste Kabel angelegt wird
- **Speichern-Button (💾)** funktionierte nicht wenn kein Projektname eingetragen war — es wird jetzt automatisch ein Fallback-Name mit Datum verwendet
- **FI-Größe im Belegungsplan** — 2-polige FI-Schutzschalter haben jetzt die korrekte Breite von 2 TE (56px), 4-polige 4 TE (112px). Vorher hatten alle FIs immer dieselbe fixe Breite
- **Reihenklemmen-Button** in der Stückliste entfernt (Einstellung verbleibt in der Klemmenansicht)
- **KNX-Button** aus der Stückliste entfernt (KNX wird in der Klemmenansicht konfiguriert)

### 🔧 Geändert
- **Reihenklemmen-Toggle** in der Klemmenansicht startet jetzt standardmäßig auf **Aus** statt Ein
- **Touch Drag & Drop** auf Mobilgeräten und Tablets komplett überarbeitet: `e.preventDefault()` direkt im `touchstart`-Event verhindert Textmarkierung während des Ziehens; visuelle Ghost-Kopie folgt dem Finger
- **Mobile UI** verbessert: kleinere Abstände, größere Touch-Targets für Select-Felder, `user-select: none` auf allen draggbaren Elementen
- Gesperrte Navigations-Icons zeigen 🔒 statt der Schrittzahl

---

## [1.4.0] – 2025

### ✨ Neu
- **Undo-Funktion** (Ctrl+Z / ⌘Z) für das Löschen von Kabeln und Sicherungen
- **Kabel-Pool Ansicht** in Schritt 3 zeigt auch bereits zugewiesene Kabel (kleiner, ausgegraut) für einfaches Umverteilen
- **Plan-Edit-Modal** — FI-Schutzschalter und Leitungsschutzschalter direkt im Belegungsplan bearbeiten ohne zurück zu navigieren
- **Querverbinder-Berechnung** — automatische Berechnung benötigter Klemmbrücken wenn mehrere Kabel auf einer Sicherung liegen
- **N-Brücken-Kalkulation** — genaue Längenberechnung der Brücken zwischen N-Einspeisung und N-Endklemme
- **FILS-Unterstützung** — Leitungsschutzschalter können als separat abgesicherte FILS-Kreise markiert werden
- **KNX-Reserveklemme** als optionale Position in der Klemmenleiste
- **Autocomplete** für Raumnamen in der Kabelerfassung

### 🐛 Behoben
- Phasenlast-Berechnung bei 3-phasigen Sicherungen beim Verschieben im Plan
- Legacy-Projekt-Migration beim Laden alter Dateiformate

### 🔧 Geändert
- TE-Berechnung für FI-Schutzschalter: 4-polig = 8 TE Kapazität, 2-polig = 10 TE
- Sicherungstyp wird automatisch angepasst wenn Kabel zugewiesen oder 3P-Modus geändert wird

---

## [1.3.0] – 2025

### ✨ Neu
- **KI-Import via Foto** — Kabellisten aus Fotos oder Scans per Anthropic Claude API einlesen
- **API-Einstellungen** — konfigurierbarer API-Key und Endpunkt für den KI-Import
- **Beschriftungsplan** — vollständiger Beschriftungsplan im Q1F1-Schema mit WhatsApp-Export
- **Stockwerk-Farbcodierung** — jedes Stockwerk erhält eine eigene Farbe, sichtbar im Belegungsplan und der Klemmenleiste

### 🔧 Geändert
- Kabeltyp-System vollständig überarbeitet: kombinierter Schlüssel aus Typ + Adern + Querschnitt
- Legacy-Kabelttyp-IDs werden automatisch migriert

---

## [1.2.0] – 2025

### ✨ Neu
- **Klemmenleiste-Visualisierung** — grafische Darstellung der Reihenklemmen-Belegung pro FI-Block
- **Stückliste** — automatische Materialliste aus dem generierten Plan
- **WhatsApp-Export** für Stückliste und Beschriftungsplan
- **Projekt speichern / laden** — mehrere Projekte parallel im Browser verwalten
- **Druckansicht** optimiert

---

## [1.1.0] – 2025

### ✨ Neu
- **Drag & Drop** in Schritt 3 zum Zuweisen von Kabeln auf Sicherungen
- **Touch-Drag** für Tablet-Nutzung
- **Automatische Sicherungsempfehlung** basierend auf dem Kabelquerschnitt
- **3-phasige Leitungsschutzschalter** (B16 3P bis B63 3P)
- **FILS-Konfiguration** pro Sicherung

---

## [1.0.0] – 2025

### 🎉 Erstveröffentlichung
- Geführter 5-Schritte-Workflow: Projekt → Kabel → Sicherungen → FI → Plan
- Automatische Verteilung von Sicherungen auf FI-Gruppen mit TE-Kapazitätsprüfung
- Visuelle und tabellarische Plan-Ansicht
- Phasenlast-Anzeige pro FI-Gruppe
- Stockwerk- und Raum-Verwaltung
