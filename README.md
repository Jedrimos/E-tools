# 🔧 Elektronikertools

**Browserbasierte Werkzeuge für Elektrofachkräfte — kein Download, keine Installation, optional mit eigener Datenbank.**

[![Version](https://img.shields.io/badge/version-2026.3.3-2196C9?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-52d98a?style=flat-square)](LICENSE)
[![Built with](https://img.shields.io/badge/built%20with-React%20%2B%20Vite-a78bfa?style=flat-square)](https://vitejs.dev)

---

## Was sind die Elektronikertools?

Eine Sammlung von Werkzeugen für den Arbeitsalltag von Elektrikern und Elektrotechnikern. Direkt im Browser, funktioniert auf Desktop, Tablet und Mobilgerät. Keine Anmeldung notwendig — Daten bleiben lokal im Browser oder optional in einer selbst gehosteten Datenbank.

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

---

### ⏱ Stundenbuch

Einfache Zeiterfassung für Elektriker und Monteure.

**Features:**
- Einträge mit Datum, Von/Bis-Zeit, Pause, Projekt/Baustelle, Tätigkeit und Notiz
- Automatische Netto-Stundenberechnung
- Monats- und Projektfilter
- CSV-Export als Stundennachweis (mit Firmenname)
- Projekte/Baustellen per Autocomplete
- Optionale Synchronisierung mit Supabase

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
- Optionale Synchronisierung mit Supabase

---

## Dashboard & Konfiguration

Beim Start erscheint das Dashboard zur Tool-Auswahl. Über **⚙ Einstellungen** lassen sich folgende Daten hinterlegen (werden lokal gespeichert und in allen Tools verwendet):

| Feld | Verwendung |
|---|---|
| Firmenname | CSV-Export, Planansicht, Stückliste |
| Mitarbeiter / Name | Stundennachweis, Prüfprotokoll |
| Ort | Anzeige im Dashboard |
| Datenbank-Name | Referenz für eigene DB |
| Supabase URL | Datenbankverbindung für alle Tools |
| Supabase Anon Key | Datenbankverbindung für alle Tools |

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

### Datenbank (optional) — Supabase self-hosted

1. **Coolify** → *New Resource* → *Service* → **Supabase** → deployen
2. Im Supabase-Dashboard: *Settings → API* → Project URL & anon key kopieren
3. Im SQL-Editor die folgenden Tabellen anlegen:

```sql
-- Verteilerplaner-Projekte
CREATE TABLE projekte (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  ersteller    text DEFAULT '',
  adresse      text DEFAULT '',
  standort     text DEFAULT '',
  kabel        jsonb DEFAULT '[]',
  sicherungen  jsonb DEFAULT '[]',
  fi_konfigs   jsonb DEFAULT '[]',
  stockwerke   jsonb DEFAULT '[]',
  raeume       jsonb DEFAULT '[]',
  sw_color_map jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE projekte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON projekte FOR ALL USING (true) WITH CHECK (true);

-- Prüfprotokolle
CREATE TABLE pruefprotokolle (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text NOT NULL DEFAULT 'Protokoll',
  auftraggeber      text DEFAULT '',
  auftragnummer     text DEFAULT '',
  anlagenstandort   text DEFAULT '',
  anlage_art        text DEFAULT 'Wohngebäude',
  nennspannung      text DEFAULT '230/400',
  pruefer           text DEFAULT '',
  datum             date,
  naechste_pruefung date,
  stromkreise       jsonb DEFAULT '[]',
  notiz             text DEFAULT '',
  verteiler_id      uuid REFERENCES projekte(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE pruefprotokolle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON pruefprotokolle FOR ALL USING (true) WITH CHECK (true);

-- Stundenbuch
CREATE TABLE stunden (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  datum       date NOT NULL,
  von         text DEFAULT '',
  bis         text DEFAULT '',
  pause       integer DEFAULT 0,
  projekt     text DEFAULT '',
  taetigkeit  text DEFAULT '',
  notiz       text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE stunden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON stunden FOR ALL USING (true) WITH CHECK (true);
```

4. Environment Variables setzen:
   ```
   VITE_SUPABASE_URL=https://supabase.deine-domain.de
   VITE_SUPABASE_ANON_KEY=dein-anon-key
   ```
5. App neu deployen.

Ohne Supabase-Konfiguration fällt die App automatisch auf `localStorage` zurück.

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
| Datenspeicherung | localStorage + Supabase (optional) |
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
├── components/
│   └── Toast.jsx          # Gemeinsame Toast-Komponente
├── lib/
│   ├── supabase.js        # Supabase-Client
│   ├── db.js              # DB-Layer: Verteilerplaner
│   ├── db_pruefprotokoll.js # DB-Layer: Prüfprotokoll
│   └── db_stundenbuch.js  # DB-Layer: Stundenbuch
├── index.css              # Globale CSS-Variablen & Reset
└── main.jsx               # Einstiegspunkt
```

---

## Roadmap

Geplante Features und Ideen: → [ROADMAP.md](ROADMAP.md)

---

## Versionierung

Die Elektronikertools verwenden ein Versionsschema analog zu Home Assistant: **`JAHR.MONAT.PATCH`**

Beispiel: `2026.3.3` = März 2026, viertes Release dieses Monats.

---

## Changelog

Alle Änderungen sind in [CHANGELOG.md](CHANGELOG.md) dokumentiert.

---

## Lizenz

MIT License — frei verwendbar, anpassbar, verteilbar.

---

*Entwickelt von Jedrimos · © 2026*
