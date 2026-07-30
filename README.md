# 🔧 Elektronikertools

**Browserbasierte Werkzeuge für Elektrofachkräfte — kein Download, keine Installation, keine Anmeldung.**

[![Version](https://img.shields.io/badge/version-2026.7.1-2196C9?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-52d98a?style=flat-square)](LICENSE)
[![Built with](https://img.shields.io/badge/built%20with-React%20%2B%20Vite-a78bfa?style=flat-square)](https://vitejs.dev)

---

## Was sind die Elektronikertools?

Eine Sammlung von Werkzeugen für den Arbeitsalltag von Elektrikern und Elektrotechnikern. Direkt im Browser, funktioniert auf Desktop, Tablet und Mobilgerät. Keine Anmeldung notwendig — alle Daten bleiben lokal im Browser (`localStorage`).

---

## Enthaltene Tools

### ⚡ Verteilerplaner

Professionelle Planung und Dokumentation von Elektroverteiler-Belegungen.

**Features:**
- **Schritt 1 – Projektdaten:** Projektname, Kunde, Adresse, Ersteller, Standort des Verteilers. Stockwerke mit Farbcodierung und Räume definieren.
- **Schritt 2 – Kabelerfassung:** Kabel mit Bezeichnung, Raum, Stockwerk, Kabeltyp (NYM-J, NYY-J, H07V-K, LIYY), Adernanzahl und Querschnitt erfassen. KI-Import per Foto über die Anthropic API.
- **Schritt 3 – Sicherungen planen:** Kabel per Drag & Drop auf Sicherungsgruppen (LSS) verteilen. 1-phasige und 3-phasige LSS, FILS-Konfiguration, Touch-Drag auf Mobilgeräten.
- **Schritt 4 – FI-Konfiguration:** FI-Schutzschalter (RCD) nach Bemessungsstrom, Typ (AC/A/F/B), Fehlerstrom und Polzahl konfigurieren.
- **Schritt 5 – Belegungsplan:** Visuelle und tabellarische Ansicht, Klemmenleisten-Visualisierung, Stückliste, Beschriftungsplan.

**Klemmenleiste (Schritt 5 → Tab "Klemmenleiste"):**
- Jede FI-Gruppe bekommt eine Klemmleisten-Nummer (X1, X2, …); Klemmen fortlaufend X1.1, X1.2, …
- Labels erscheinen unter jeder Klemme und im Beschriftungsplan neben der Sicherungs-Bezeichnung
- FILS-Gruppen erhalten die nächste X-Nummer nach den FI-Gruppen
- **Querverbinder-Visualisierung:** L-QV und N-QV Brücken-Overlay über den Klemmen; Clip-Pins (abzwicken) korrekt berechnet
- **FILS-Querverbinder:** L-QV + N-QV für die 3-pol Klemme; bei 5×-Kabeln zusätzlich LL-QV (L2/L3)
- **N-Schiene:** Optional zuschaltbar — visualisiert die Verbindung von N-Einspeisung bis N-Endklemme inkl. Länge in mm
- Querverbinder-Stückliste: zeigt alle benötigten QV-Typen mit Port-Anzahl, Clip-Pins und Beschriftung

**Projektstand speichern:**
- Beim Speichern werden jetzt auch Schritt, aktiver Tab, alle Toggles (RK, QV, N-Brücke, KNX) und der generierte Plan mitgespeichert
- Beim Laden öffnet sich das Projekt genau dort, wo man aufgehört hat

---

### ⏱ Stundenbuch

Einfache Zeiterfassung für Elektriker und Monteure.

**Features:**
- Einträge mit Datum, Von/Bis-Zeit, Pause, Projekt/Baustelle, Tätigkeit und Notiz
- Automatische Netto-Stundenberechnung
- **Monats-Chart:** SVG-Balkendiagramm der Stunden pro Tag (Farbkodierung, 8h-Linie)
- Wochenstunden-Anzeige in der Kopfzeile
- Start/Stop-Timer: Von/Bis automatisch befüllen
- Monats- und Projektfilter
- CSV-Export als Stundennachweis (mit Firmenname)
- Projekte/Baustellen per Autocomplete
- **Mobiloptimiert:** Eintrags-Karten responsives 2-Spalten-Layout auf kleinen Bildschirmen

---

### 📚 Wissensdatenbank

Firmeninternes Wissen strukturiert erfassen.

**Features:**
- Artikel mit Titel, Kategorie, Tags, Autor und Markdown-Inhalt
- Kategorien: Wechselrichter/PV, Verteiler, FI/RCD, VDE-Normen, Montagetipps, Hersteller, Werkzeuge, Recht, Sonstiges
- Volltextsuche über Titel, Inhalt, Tags und Autor in Echtzeit
- Kategoriefilter mit Artikelanzahl
- Markdown-Editor mit Live-Vorschau (Überschriften, Listen, Code, fett, kursiv, Blockquote)
- Artikel-Karten-Ansicht + Detailansicht mit gerendertem Markdown

---

### 📋 Prüfprotokoll

VDE-konforme Messprotokollierung für Erst- und Wiederholungsprüfungen nach VDE 0100-600.

**Features:**
- Protokoll-Übersicht mit Gesamtbewertung (OK / Fehler / Offen)
- Kopfdaten: Auftraggeber, Anlagenstandort, Anlagenart, Nennspannung, Prüfer, Prüfdatum, nächste Prüfung, Auftragsnummer
- Stromkreise als aufklappbare Tabellenzeilen, beliebig viele pro Protokoll
- **Erfasste Messarten pro Stromkreis:**
  - PE-Durchgangswiderstand R_PE (Ω)
  - Isolationswiderstand Riso: L1/L2/L3/N gegen PE (MΩ) — 1- und 3-phasig
  - Schleifenimpedanz Zs (Ω) und Kurzschlussstrom Ik (A)
  - FI/RCD: IΔN, Typ (AC/A/F/B/S), t@IΔN, t@5×IΔN, t@½×IΔN, Berührungsspannung UB
- **Automatische VDE-Grenzwertbewertung** (Ampel grün/rot):
  - Riso ≥ 1 MΩ (VDE 0100-600 §61.3)
  - FI t@IΔN ≤ 300 ms (Typ S: ≤ 500 ms)
  - FI t@5×IΔN ≤ 40 ms
  - UB ≤ 50 V
  - ½×IΔN: Auslösung = Fehler
- **Import aus Verteilerplaner:** Stromkreise direkt aus einem gespeicherten Verteiler-Projekt übernehmen (Bezeichnung, Nennstrom, Sicherungstyp, 3-phasig)
- **PDF-Export:** Professionelles A4-Prüfprotokoll als PDF (DIN VDE 0100-600), lazy-geladen — direkt aus der Liste oder dem Editor
- Drucken via `window.print()` + Print-CSS
- **Mobiloptimiert:** Stromkreis-Tabelle horizontal scrollbar, Formulare 2-spaltig, Header-Buttons wrappend

---

### 🔧 Wartungsprotokoll

Wiederkehrende Wartungsaufgaben verwalten und nachverfolgen.

**Features:**
- Aufgaben anlegen mit Kategorie (E-Check, Blitzschutz, Notbeleuchtung, Brandschutz, Aufzug u.a.), Intervall und Zuständigem
- Intervalle: monatlich, vierteljährlich, halbjährlich, jährlich, 2-jährlich
- „Zuletzt durchgeführt"-Datum → nächster Termin wird automatisch berechnet
- Farbkodierter Status: rot = überfällig, gelb = in ≤ 30 Tagen fällig, grün = OK
- „✓ Erledigt"-Button setzt Datum auf heute und berechnet Fälligkeit neu
- Filter nach Kategorie und Suche; Sortierung nach Fälligkeit, Name oder Kategorie
- localStorage-Speicherung, im globalen Backup-Export enthalten

---

### ⚡ Elektrorechner

Rechner und Formelsammlung für Elektrofachkräfte — 5 Tabs, kein Datenbankzugriff.

**Tab 1 — Leitungsberechnung (VDE 0100-520):**
- Eingaben: Strom (A), Länge (m), Verlegeart (B1/B2/C/E), Material (Cu/Al), Phasenzahl (1P/3P), cos φ
- Empfehlung des Mindest-Querschnitts (nächste Normstufe ≥ rechnerischer Wert)
- Spannungsfall-Tabelle für alle Normstufen 1,5 … 120 mm²: ΔU (V), ΔU (%), max. Strom, max. Länge

**Tab 2 — Strom & Leistung:**
- Leistungsrechner: P/U/I/cosφ für Einphasig (230 V) und Drehstrom (400 V) — beliebige Größe berechnen
- Scheinleistung S (kVA), Blindleistung Q (kVAr)
- Ohm'sches Gesetz: U/I/R — beliebige Größe berechnen

**Tab 3 — Motorstrom:**
- Nennstrom und Anlaufstrom für Drehstrommotoren (P kW, U, cosφ, Wirkungsgrad η)
- Anlaufstrom-Faktor wählbar (DOL 5-8×, Stern-Dreieck / FU 2×)
- Empfohlene Sicherungsgröße und Leitungsquerschnitt (Richtwert)

**Tab 4 — cos φ Korrektur:**
- Blindleistungskompensation: Q_C (kVAr) und Kondensatorgröße (µF)
- Stromeinsparung ΔI und neue Scheinleistung S₂

**Tab 5 — Formelsammlung:**
- Aufklappbare Formelgruppen: Ohm, 1P/3P Wechselstrom, Leitungsberechnung, Kompensation, Schutzmaßnahmen (VDE 0100-410/-600), Konstanten

---

### 🔌 Materialzähler

Installationsmaterial pro Projekt zählen und Bestellmengen verwalten.

**Features:**
- Projekte anlegen mit Name, Ort und Notiz
- Positionen erfassen in Kategorien: Steckdosen, Schalter, Dimmer, Rahmen, Dosen & Gehäuse, Sonstiges
- Schnellauswahl für gängige Artikel (Schuko, Wechselschalter, Rahmen 1–5-fach, CEE, USB, etc.)
- Benötigte Menge und bestellte Menge direkt in der Liste editierbar
- Status je Position: Offen / Teils bestellt / Bestellt ✓
- Fortschrittsbalken und Statistik pro Projekt (Stückzahl gesamt, offen, bestellt)
- Filter nach Kategorie + Freitextsuche
- Druckansicht: saubere Materialliste gruppiert nach Kategorie
- localStorage-Datenspeicherung (`elektronikertools_materialzaehler`)
- Im globalen Backup-Export enthalten

---

### 🏡 KNX-Planer

Planungswerkzeug für KNX-Installationen.

**Features:**
- **GA-Planer:** Gruppenadressen mit 3-Ebenen-Hierarchie (Hauptgruppe/Mittelgruppe/Untergruppe), DPT-Zuordnung, Funktion und Raumzuweisung; CSV-Export
- **Raumplan:** Räume nach Etage anlegen, Gruppenadressen zuweisen
- **Inbetriebnahme-Checkliste:** Vorlagen je Funktion (Licht, Dimmen, Jalousie, Heizung, Szene, Allgemein), Fortschrittsanzeige pro Raum und gesamt
- **KNX-Rechner:** Physikalische Adresse ↔ Dezimal/Hex/Binär, Gruppenadresse ↔ Dezimal, DPT-Kurzreferenz

---

## WordPress Plugin

Das fertige Plugin liegt unter `wordpress-plugin/`. Es enthält bereits die gebauten Assets — kein Node.js für die Installation nötig.

### Schnellinstallation

1. Ordner `wordpress-plugin/` als ZIP packen
2. WordPress → Plugins → Neu hinzufügen → Plugin hochladen
3. Plugin aktivieren
4. Shortcode in eine Seite einfügen: **`[elektronikertools]`**

### Optionale Parameter

```
[elektronikertools hoehe="100vh"]        Mindesthöhe
[elektronikertools klasse="meine-css"]   Zusätzliche CSS-Klasse
```

### Plugin neu bauen

```bash
cd wordpress-plugin
npm install
npm run build:wp
```

Ausgabe: `assets/elektronikertools.js` (~1.6 MB / 449 KB gzip) + `assets/elektronikertools.css`

---

## Dashboard & Konfiguration

Beim Start erscheint das Dashboard zur Tool-Auswahl. Über **⚙ Einstellungen** lassen sich folgende Daten hinterlegen (werden lokal gespeichert und in allen Tools verwendet):

| Feld | Verwendung |
|---|---|
| Firmenname | CSV-Export, Planansicht, Stückliste, Ausdrucke |
| Mitarbeiter / Name | Stundennachweis, Prüfprotokoll, Wartungsprotokoll |
| Ort | Anzeige im Dashboard |
| Notizen | Freitext |

---

## Self-Hosting mit Coolify

### App deployen

1. **Coolify öffnen** → *New Resource* → Repository verbinden
2. Build-Einstellungen:
   - **Build Pack:** Nixpacks
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Port:** `80`
3. *Deploy* klicken — fertig.

### PWA — Als App installieren

Die App ist als **Progressive Web App (PWA)** eingerichtet und kann auf Mobilgeräten und Desktop als eigenständige App installiert werden:

- **Android (Chrome):** Beim Aufrufen der URL erscheint "Zum Startbildschirm hinzufügen"
- **iOS (Safari):** Teilen → "Zum Home-Bildschirm"
- **Desktop (Chrome/Edge):** Adressleiste → Installations-Icon

Offline-Fähigkeit: Assets werden per Service Worker gecacht, alle Daten liegen ohnehin lokal im Browser.

---

### Lokale Installation

```bash
git clone https://github.com/Jedrimos/elektronikertools.git
cd elektronikertools
npm install
npm run dev
```

Build für Produktion:

```bash
npm run build
# dist/ Ordner auf beliebigen Webserver deployen
```

---

## Technologie

| | |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Styling | Inline CSS + CSS Custom Properties |
| Datenspeicherung | localStorage |
| KI-Import | Anthropic Claude API (optional) |
| Deployment | Static Build / Nixpacks (Coolify) |

---

## Projektstruktur

```
src/
├── Dashboard.jsx          # Startseite & App-Router
├── Verteilerplaner.jsx    # Tool: Verteilerplaner
├── Stundenbuch.jsx        # Tool: Stundenbuch
├── Pruefprotokoll.jsx     # Tool: Prüfprotokoll
├── Wissensdatenbank.jsx   # Tool: Wissensdatenbank
├── Wartungsprotokoll.jsx  # Tool: Wartungsprotokoll
├── Leitungsberechnung.jsx # Tool: Elektrorechner
├── Materialzaehler.jsx    # Tool: Materialzähler
├── KNXPlaner.jsx          # Tool: KNX-Planer
├── components/
│   └── Toast.jsx              # Gemeinsame Toast-Komponente
├── lib/
│   ├── utils.js               # Gemeinsame Hilfsfunktionen (uid, …)
│   ├── vde.js                 # VDE-Grenzwerte & Bewertungslogik (Prüfprotokoll)
│   ├── db_pruefprotokoll.js    # localStorage-Layer: Prüfprotokoll
│   ├── db_stundenbuch.js       # localStorage-Layer: Stundenbuch
│   ├── db_wissen.js            # localStorage-Layer: Wissensdatenbank
│   ├── db_wartung.js           # localStorage-Layer: Wartungsprotokoll
│   ├── db_materialzaehler.js   # localStorage-Layer: Materialzähler
│   └── db_knx.js               # localStorage-Layer: KNX-Planer
├── index.css                  # Globale CSS-Variablen & Reset
└── main.jsx                   # Einstiegspunkt

docs/
├── index.md                   # Dokumentations-Übersicht
├── setup.md                   # Installation & Deployment
├── development.md             # Entwickler-Guide
└── apps/                      # Per-App Dokumentation
```

---

## Dokumentation

Vollständige Docs im Ordner [`docs/`](docs/index.md):

| | |
|---|---|
| [Setup & Deployment](docs/setup.md) | Installation, Coolify |
| [Entwickler-Guide](docs/development.md) | Neue App anlegen, Konventionen |
| [Verteilerplaner](docs/apps/verteilerplaner.md) | Detaillierte App-Dokumentation |
| [Stundenbuch](docs/apps/stundenbuch.md) | Detaillierte App-Dokumentation |
| [Prüfprotokoll](docs/apps/pruefprotokoll.md) | VDE-Grenzwerte, Import-Feature |
| [Wissensdatenbank](docs/apps/wissensdatenbank.md) | Team-Sharing, Markdown-Syntax |

## Roadmap

Geplante Features und Ideen: → [ROADMAP.md](ROADMAP.md)

---

## Versionierung

Die Elektronikertools verwenden ein Versionsschema analog zu Home Assistant: **`JAHR.MONAT.PATCH`**

Beispiel: `2026.3.4` = März 2026, fünftes Release dieses Monats.

---

## Changelog

Alle Änderungen sind in [CHANGELOG.md](CHANGELOG.md) dokumentiert.

---

## Lizenz

MIT License — frei verwendbar, anpassbar, verteilbar.

---

*Entwickelt von Jedrimos · © 2026*
