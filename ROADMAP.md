# Roadmap — Elektronikertools

Ideen und geplante Features, ungefähr nach Priorität sortiert. Kein fester Zeitplan.

> **Legende:** ⚡ = schnell umsetzbar (kein Strukturumbau) · 🔨 = mittlerer Aufwand · 🏗 = großer Aufwand

---

## Schnell umsetzbar ⚡

### 📋 Prüfprotokoll
- ✅ ~~**Drucken / PDF**~~ — Umgesetzt: `window.print()` + Print-CSS
- ✅ ~~**Ablaufdatum-Badge im Dashboard**~~ — Umgesetzt: Badge auf Prüfprotokoll-Karte + Warnung in der Liste
- ⚡ **Normreferenzen** — Info-Icons (ⓘ) mit Tooltip der VDE-Norm und Grenzwert-Begründung direkt bei den Messwert-Feldern.

### ⏱ Stundenbuch
- ✅ ~~**Wochenstunden-Summe**~~ — Umgesetzt
- ✅ ~~**Schnelleintrag via Timer**~~ — Umgesetzt: Start/Stop-Button füllt Von/Bis automatisch

### ⚡ Verteilerplaner
- ✅ ~~**Reserveplatz-Markierung**~~ — Umgesetzt: Reserve-Toggle an Sicherungen, Stückliste
- ✅ ~~**Projekt-Suche**~~ — Umgesetzt: Suchfeld in beiden Lade-Dialogen

### 🔗 App-übergreifend
- ✅ ~~**Daten-Backup / Export**~~ — Umgesetzt
- ✅ ~~**Daten-Import / Restore**~~ — Umgesetzt
- ✅ ~~**Supabase Verbindungsstatus**~~ — Umgesetzt: Ping-Indikator im Dashboard
- ⚡ **Zuletzt geöffnet** — Dashboard zeigt die letzten 3 verwendeten Projekte/Protokolle als Direktlinks.

---

## Mittlerer Aufwand 🔨

### 📋 Prüfprotokoll
- 🔨 **Unterschriftsfeld** — Canvas-basiertes Unterschrifts-Pad, Signatur als Base64 im Protokoll gespeichert. Für Tablet-Abnahme vor Ort.
- 🔨 **Vorlagen** — Vordefinierte Stromkreis-Listen für typische Anlagen (EFH, Gewerbeeinheit, Tiefgarage) als Schnellstart.
- 🔨 **Prüfmittel-Verwaltung** — Messgerät, Kalibrierungsdatum, Seriennummer für Rückverfolgbarkeit.

### ⚡ Verteilerplaner
- 🔨 **Leitungsberechnung integriert** — Beim Kabel anlegen: Querschnitts-Empfehlung auf Basis von Strom und Länge (VDE 0100-520 Tabelle).

### ⏱ Stundenbuch
- 🔨 **Monatsübersicht / Diagramm** — Gestapeltes Balkendiagramm der Arbeitsstunden pro Projekt über den Monat.
- 🔨 **Tagesberichte** — Strukturierter Tagesbericht als Nachweis für den Auftraggeber.
- 🔨 **Regiezettel** — Aus Stunden + Materialien (vom Verteilerplaner) eine einfache Regie-Rechnung generieren.

---

## Großer Aufwand / Langfristig 🏗

### 🔗 App-übergreifend
- 🏗 **PWA / Offline-Modus** — Service Worker + IndexedDB für Baustellen-Einsatz ohne Internet. Sync bei Verbindung.
- 🏗 **Multi-Techniker / Betrieb** — Supabase Row Level Security: Techniker sehen eigene Daten, Chef-Login sieht alles.
- 🏗 **Betriebsstammdaten / Briefkopf** — Firmenlogo + Adressdaten hinterlegen, automatisch auf Protokollen und Exporten.

### ⚡ Verteilerplaner — Zukunft
- 🏗 **Mehrere Verteiler pro Projekt** — Haupt- und Unterverteiler, Verbindung durch Stichleitung.
- 🏗 **Leistungsfluss / Einlinien-Darstellung** — Visuelles Einlinienschema des Verteilers.
- 🏗 **Selektivitäts-Check** — Prüfung ob vorgelagerte und nachgelagerte Sicherungen selektiv sind.
- 🏗 **DXF / AutoCAD-Export** — Belegungsplan als DXF-Datei für CAD-Systeme.
- 🏗 **Kabelrouten / Trassierung** — Gebäudeplan hochladen, Kabeltrassen einzeichnen.

### Neue Tools
- 🏗 **🔧 Wartungsprotokoll** — Wiederkehrende Wartungen (E-Check, Blitzschutz, Notbeleuchtung) mit Intervallen und Fälligkeits-Berechnung.
- 🔨 **📐 Leitungsberechnung** — Eigenständiges Tool: Strom + Länge + Verlegeart → Querschnitts-Empfehlung nach VDE 0100-520.
- 🏗 **📦 Materialverwaltung** — Fahrzeug-/Lagerbestand, Verbrauch pro Baustelle, Mindestbestand-Warnung.
- 🔨 **🔌 Betriebsmittelkennzeichnung** — QR-Code-Generator für Betriebsmittel, QR-Code öffnet das Prüfprotokoll.

---

## Technische Schulden

- `Verteilerplaner.jsx` ist mit ~3000 Zeilen sehr groß → schrittweise in kleinere Komponenten aufteilen (`Step1`, `Step2`, `PlanView` …)
- ESLint-Fehler bereinigen — leere `catch`-Blöcke, ungenutzte Variablen, Toast.jsx aufteilen
- Tests — zumindest Unit-Tests für VDE-Grenzwertbewertung im Prüfprotokoll
- Fehlerbehandlung — Supabase-Fehler verständlicher anzeigen (z.B. "Tabelle fehlt → SQL-Migration nötig")

---

*Ideen und Feedback gerne als GitHub Issue.*
