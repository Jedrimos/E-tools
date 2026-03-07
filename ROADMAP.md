# Roadmap — Elektronikertools

Ideen und geplante Features, ungefähr nach Priorität sortiert. Kein fester Zeitplan.

> **Legende:** ⚡ = schnell umsetzbar (kein Strukturumbau) · 🔨 = mittlerer Aufwand · 🏗 = großer Aufwand

---

## Schnell umsetzbar ⚡

### 📋 Prüfprotokoll
- ✅ ~~**Drucken / PDF**~~ — Umgesetzt: `window.print()` + Print-CSS + jsPDF-Export (professionelles A4-PDF, lazy-loaded)
- ✅ ~~**Ablaufdatum-Badge im Dashboard**~~ — Umgesetzt: Badge auf Prüfprotokoll-Karte + Warnung in der Liste
- ✅ ~~**Normreferenzen**~~ — Umgesetzt: ⓘ-Buttons mit VDE-Norm, Grenzwert und Begründung bei PE, Riso, Schleife, FI.

### ⏱ Stundenbuch
- ✅ ~~**Wochenstunden-Summe**~~ — Umgesetzt
- ✅ ~~**Schnelleintrag via Timer**~~ — Umgesetzt: Start/Stop-Button füllt Von/Bis automatisch

### ⚡ Verteilerplaner
- ✅ ~~**Reserveplatz-Markierung**~~ — Umgesetzt: Reserve-Toggle an Sicherungen, Stückliste
- ✅ ~~**Projekt-Suche**~~ — Umgesetzt: Suchfeld in beiden Lade-Dialogen
- ✅ ~~**Klemmenbezeichnungen (X1.n)**~~ — Umgesetzt: Strip-Label X1/X2 auf PE-Einspeisung, fortlaufende Klemmennummern X1.1/X1.2 in Visualisierung und Beschriftungsplan
- ✅ ~~**Projektstand persistieren**~~ — Umgesetzt: Schritt, Tab, Toggles und generierter Plan werden beim Speichern mitgesichert und beim Laden wiederhergestellt
- ✅ ~~**FILS Querverbinder vollständig**~~ — Umgesetzt: L-QV + N-QV für 3-pol Klemme, LL-QV für 5×-Kabel

### 🔗 App-übergreifend
- ✅ ~~**Daten-Backup / Export**~~ — Umgesetzt
- ✅ ~~**Daten-Import / Restore**~~ — Umgesetzt
- ✅ ~~**Supabase Verbindungsstatus**~~ — Umgesetzt: Ping-Indikator im Dashboard
- ✅ ~~**Zuletzt geöffnet**~~ — Umgesetzt: Dashboard zeigt die letzten 3 geöffneten Apps als Schnellzugriff mit Zeitstempel.

---

## Mittlerer Aufwand 🔨

### 📋 Prüfprotokoll
- 🔨 **Unterschriftsfeld** — Canvas-basiertes Unterschrifts-Pad, Signatur als Base64 im Protokoll gespeichert. Für Tablet-Abnahme vor Ort.
- 🔨 **Vorlagen** — Vordefinierte Stromkreis-Listen für typische Anlagen (EFH, Gewerbeeinheit, Tiefgarage) als Schnellstart.
- 🔨 **Prüfmittel-Verwaltung** — Messgerät, Kalibrierungsdatum, Seriennummer für Rückverfolgbarkeit.

### ⚡ Verteilerplaner
- ✅ ~~**Leitungsberechnung integriert**~~ — Umgesetzt: Längenfeld + ⚡-Inline-Rechner pro Kabel, empfiehlt Querschnitt und zeigt Max-Länge für verschiedene mm²-Werte (VDE 0100-520, Cu, ΔU ≤ 3 %).

### ⏱ Stundenbuch
- ✅ ~~**Monatsübersicht / Diagramm**~~ — Umgesetzt: SVG-Balkendiagramm (Stunden/Tag) mit 8h-Linie und Farbkodierung
- ✅ ~~**Tagesberichte**~~ — Umgesetzt: Datum wählen → Tagesbericht mit Tabelle, Gesamt-Stunden, Unterschriftsfeldern und Druckfunktion.
- 🔨 **Regiezettel** — Aus Stunden + Materialien (vom Verteilerplaner) eine einfache Regie-Rechnung generieren.

---

## Großer Aufwand / Langfristig 🏗

### 🔗 App-übergreifend
- ✅ ~~**PWA / Offline-Modus**~~ — Umgesetzt: manifest.json, Service Worker (Cache-Strategie), iOS-Meta-Tags, App installierbar
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

## Neue Ideen

### 🔗 App-übergreifend
- ⚡ **PocketBase-Migration** — Datenspeicherung auf lokalen Server (PocketBase, single Go-Binary, SQLite) umstellen. Keine Supabase-Abhängigkeit mehr. Einfach auf Coolify deployen.
- ⚡ **Dark-/Light-Mode Umschalter** — Toggle in den Einstellungen oder im Dashboard-Header.
- ⚡ **Zuletzt geöffnet: Projektname** — Statt App-Name den letzten Projektnamen/Protokoll-Namen als Direktlink anzeigen (VP + PP).
- 🔨 **Offline-Sync-Konflikt-Behandlung** — Wenn Daten lokal und in Supabase geändert wurden, Merge-Dialog anzeigen.
- 🔨 **Mehrsprachigkeit (DE/EN)** — Sprachdateien, Umschaltung in den Einstellungen.

### 📋 Prüfprotokoll
- ⚡ **Messwerte-Vorabfüllung** — Typische Richtwerte als Platzhalter eintragen (z.B. Riso 999 MΩ = "unendlich").
- ⚡ **Prüfmittel-Kurzinfo** — Messgerät, Kalibrierungsdatum direkt am Protokoll-Kopf hinterlegen.
- 🔨 **Unterschriftsfeld (Canvas)** — Signatur-Pad auf dem Tablet, als Base64 im Protokoll gespeichert.
- 🔨 **Vorlagen** — Vordefinierte Stromkreis-Listen für typische Anlagen (EFH, Gewerbeeinheit).

### ⏱ Stundenbuch
- ⚡ **Tagesbericht per E-Mail** — Erzeugtes HTML direkt aus dem Modal als E-Mail versenden (`mailto:`).
- ⚡ **Projektliste verwalten** — Fixe Projektliste in den Einstellungen anlegen, statt Freitexteingabe.
- 🔨 **Wochenübersicht** — Kompakte Ansicht mit Tages-Summen der aktuellen Woche als Tabelle.
- 🔨 **Regiezettel** — Stunden + Materialien (aus Verteilerplaner-Stückliste) zu einfacher Regie-Rechnung kombinieren.

### ⚡ Verteilerplaner
- ⚡ **Kabelfarbe im Plan** — Leitung in der Belegungsplan-Tabelle in Stockwerk-Farbe einfärben.
- ⚡ **Leitungsberechnung: cos φ wählbar** — Für Motorlasten etc. cos φ ≠ 1 einstellbar machen.
- 🔨 **Selektivitäts-Hinweis** — Grobe Prüfung ob vorgelagerte Sicherung selektiv zu nachgelagerter ist.
- 🔨 **Mehrere Verteiler pro Projekt** — Haupt- und Unterverteiler mit Verbindungskabel.

### Neue Tools
- 🔨 **📐 Leitungsberechnung (eigenständig)** — Vollständiges Rechentool: Strom, Länge, Verlegeart, cos φ, Spannungsfall, Kurzschlussstrom-Check.
- 🔨 **🔌 Betriebsmittelkennzeichnung** — QR-Code-Generator, QR-Scan öffnet direkt das passende Prüfprotokoll.
- 🏗 **🔧 Wartungsprotokoll** — Wiederkehrende Wartungen (E-Check, Blitzschutz, Notbeleuchtung) mit Intervallen und Fälligkeits-Berechnung.
- 🏗 **📦 Materialverwaltung** — Fahrzeug-/Lagerbestand, Verbrauch pro Baustelle, Mindestbestand-Warnung.
- 🏗 **⚖ Angebotskalkulation** — Stunden + Material + Aufschlag = Angebot als PDF.

---

## Technische Schulden

- `Verteilerplaner.jsx` ist mit ~3000 Zeilen sehr groß → schrittweise in kleinere Komponenten aufteilen (`Step1`, `Step2`, `PlanView` …). Nächster Schritt: React Context einführen damit Props nicht so tief weitergegeben werden müssen.
- ✅ ~~`uid()` in jeder Datei dupliziert~~ — Umgesetzt: `src/lib/utils.js` zentralisiert
- ✅ ~~ESLint-Fehler bereinigen~~ — Umgesetzt: alle 21 Fehler behoben (leere catch, ungenutzte Variablen, setState in Effects, Ref-Updates in Render, impure Functions, Fast-Refresh)
- ✅ ~~Tests — zumindest Unit-Tests für VDE-Grenzwertbewertung im Prüfprotokoll~~ — Umgesetzt: 26 Tests in `src/lib/__tests__/vde.test.js` (vitest), VDE-Logik in `src/lib/vde.js` ausgelagert
- ✅ ~~Fehlerbehandlung — Supabase-Fehler verständlicher anzeigen~~ — Umgesetzt: `supabaseFehlermeldung()` in `src/lib/supabase.js`, erkennt fehlende Tabellen, abgelaufene JWT, Netzwerkfehler, RLS-Probleme

---

*Ideen und Feedback gerne als GitHub Issue.*
