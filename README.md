# 🔧 Elektronikertools

**Browserbasierte Werkzeuge für Elektrofachkräfte — kein Download, keine Installation, optional mit eigener Datenbank.**

[![Version](https://img.shields.io/badge/version-2026.3.0-2196C9?style=flat-square)](CHANGELOG.md)
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

---

## Dashboard & Konfiguration

Beim Start erscheint das Dashboard zur Tool-Auswahl. Über **⚙ Einstellungen** lassen sich folgende Daten hinterlegen (werden lokal gespeichert und in allen Tools verwendet):

| Feld | Verwendung |
|---|---|
| Firmenname | CSV-Export, Planansicht, Stückliste |
| Mitarbeiter / Name | Stundennachweis |
| Ort | Anzeige im Dashboard |
| Datenbank-Name | Referenz für eigene DB |
| Supabase URL | Datenbankverbindung |
| Supabase Anon Key | Datenbankverbindung |

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
3. Im SQL-Editor das Schema aus `supabase-schema.sql` ausführen
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
| Styling | Inline CSS |
| Datenspeicherung | localStorage + Supabase (optional) |
| KI-Import | Anthropic Claude API (optional) |
| Deployment | Static Build / Nixpacks (Coolify) |

---

## Versionierung

Die Elektronikertools verwenden ein Versionsschema analog zu Home Assistant: **`JAHR.MONAT.PATCH`**

Beispiel: `2026.3.0` = März 2026, erste Veröffentlichung dieses Monats.

---

## Changelog

Alle Änderungen sind in [CHANGELOG.md](CHANGELOG.md) dokumentiert.

---

## Lizenz

MIT License — frei verwendbar, anpassbar, verteilbar.

---

*Entwickelt von Jedrimos · © 2026*
