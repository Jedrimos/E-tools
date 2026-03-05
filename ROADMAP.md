# Roadmap — Elektronikertools

Ideen und geplante Features, ungefähr nach Priorität sortiert. Kein fester Zeitplan.

---

## In Arbeit / Kurzfristig

### 📋 Prüfprotokoll
- **PDF-Export / Drucken** — Druckansicht mit Briefkopf (Firma, Logo, Prüfer), sauber formatierten Tabellen und Unterschriftsfeld. `window.print()` mit CSS `@media print` als erster Schritt, später ggf. PDF-Generierung clientseitig.
- **Unterschriftsfeld** — Canvas-basiertes Unterschrifts-Pad, Signatur wird als Base64 im Protokoll gespeichert. Nützlich auf dem Tablet direkt vor Ort.
- **Wiederholungsprüfungs-Erinnerung** — Protokolle mit abgelaufenem `naechste_pruefung`-Datum werden im Dashboard hervorgehoben.
- **Messwert-Import aus Gerät** — Schnittstelle für gängige Messgeräte (Fluke, Metrel, Benning) die Ergebnisse als CSV oder Bluetooth exportieren.

### ⚡ Verteilerplaner
- **Kostenkalkulation** — Stückliste um Einkaufspreise erweitern, Gesamtmaterialkosten berechnen und als Angebot/Auftrag exportieren.
- **Mehrere Verteiler pro Projekt** — Haupt- und Unterverteiler im gleichen Projekt planen, Verbindung durch Stichleitung darstellen.

### ⏱ Stundenbuch
- **Monatsübersicht / Diagramm** — Gestapeltes Balkendiagramm der Arbeitsstunden pro Projekt über den Monat.
- **Tagesberichte** — Strukturierter Tagesbericht als Nachweis für den Auftraggeber (was wurde gemacht, welche Materialien verbraucht).

---

## Mittelfristig

### 🔗 App-übergreifend
- **PWA / Offline-Modus** — Service Worker + IndexedDB damit alle Tools auch ohne Internetverbindung auf der Baustelle funktionieren. Sync wenn wieder online.
- **Multi-Techniker / Betrieb** — Supabase Row Level Security so konfigurieren, dass mehrere Techniker in einem Betrieb ihre eigenen Daten haben, aber ein Chef-Login alle sehen kann.
- **Betriebsstammdaten / Briefkopf** — Firmenlogo hochladen, Briefkopfdaten (Straße, Tel, Steuernummer) hinterlegen, erscheinen automatisch auf Protokollen und Exporten.
- **Benachrichtigungen** — Browser-Push-Notifications für ablaufende Prüffristen oder offene Aufgaben.

### 📋 Prüfprotokoll
- **Normreferenzen im UI** — Kleine Info-Icons mit Tooltip der genauen Norm und Grenzwert-Begründung (z.B. "VDE 0100-600 §61.3.3" bei Riso).
- **Prüfmittel-Verwaltung** — Welches Messgerät wurde verwendet, Kalibrierungsdatum, Seriennummer — für die Rückverfolgbarkeit.
- **Vorlagen** — Vordefinierte Stromkreis-Listen für typische Anlagen (EFH, Gewerbeeinheit, Tiefgarage) als Schnellstart.

### ⚡ Verteilerplaner
- **DXF / AutoCAD-Export** — Belegungsplan als DXF-Datei für CAD-Systeme.
- **Import anderer Formate** — Excel-Import für Kabellisten (Spalten zuordnen), ggf. Hager- oder ABB-Konfiguratoren-Export lesen.
- **Kabelrouten / Trassierung** — Einfache Skizze der Kabeltrasse im Gebäudeplan (Bild hochladen, Linien ziehen).

### ⏱ Stundenbuch
- **Lohnabrechnung** — Stundenlohn hinterlegen, automatische Bruttolohn-Berechnung pro Monat, Export als PDF-Lohnzettel.
- **Regiezettel / Rechnungsexport** — Aus Stunden + Materialien (vom Verteilerplaner) direkt eine Regie-Rechnung generieren.

---

## Langfristig / Ideen

### Neue Tools
- **🔧 Wartungsprotokoll** — Ähnlich dem Prüfprotokoll, aber für wiederkehrende Wartungen an Anlagen (E-Check, Blitzschutz, Notbeleuchtung). Mit Wartungsintervallen und automatischer Fälligkeits-Berechnung.
- **📦 Materialverwaltung / Lager** — Fahrzeug- oder Lager-Inventar pflegen, Materialverbrauch pro Baustelle buchen, Mindestbestand-Warnung.
- **📐 Leitungsberechnung** — Querschnittsberechnung nach VDE 0100-520: Strom → empfohlener Querschnitt unter Berücksichtigung von Häufung, Umgebungstemperatur und Verlegeart.
- **🔌 Betriebsmittelkennzeichnung** — QR-Code- / Barcode-Generator für Betriebsmittel. QR-Code scannen öffnet direkt das zugehörige Prüfprotokoll.

### Verteilerplaner — Zukunft
- **Leistungsfluss-Visualisierung** — Einfache Einlinien-Darstellung des Verteilers.
- **Selektivitäts-Check** — Automatische Prüfung ob vorgelagerte und nachgelagerte Sicherungen selektiv sind.
- **Reserveplanung** — Gezielt Reserveplätze im Verteiler markieren und in der Stückliste ausweisen.

---

## Technische Schulden / Interna

- `Verteilerplaner.jsx` ist mit ~3000 Zeilen sehr groß → schrittweise in kleinere Komponenten aufteilen (z.B. `Step1`, `Step2`, `PlanView`)
- Tests — zumindest Unit-Tests für die Bewertungslogik im Prüfprotokoll (VDE-Grenzwerte)
- Fehlerbehandlung verbessern — Supabase-Fehler dem Nutzer verständlicher anzeigen (z.B. "Tabelle nicht gefunden → SQL-Migration fehlt")
- Internationalisierung (i18n) — Grundlage legen falls später mehrsprachig gewünscht

---

*Ideen und Feedback gerne als GitHub Issue.*
