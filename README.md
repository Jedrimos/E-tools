# ⚡ SVP Verteilerplaner

**Professionelle Planung und Dokumentation von Elektroverteiler-Belegungen — direkt im Browser. Keine Installation, optionale Datenbankanbindung, keine Kompromisse.**

[![Version](https://img.shields.io/badge/version-1.6.0-2196C9?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-52d98a?style=flat-square)](LICENSE)
[![Built with](https://img.shields.io/badge/built%20with-React%20%2B%20Vite-a78bfa?style=flat-square)](https://vitejs.dev)

---

## Was ist der SVP Verteilerplaner?

Der SVP Verteilerplaner ist ein schlankes, browserbasiertes Werkzeug für Elektrotechniker und Planer. In fünf geführten Schritten entsteht aus einer einfachen Kabelliste ein vollständiger Belegungsplan mit Stückliste, Beschriftungsplan und Klemmenleisten-Visualisierung — lokal, schnell, ohne Anmeldung.

Entwickelt für den Alltag auf der Baustelle und im Büro. Funktioniert auf Desktop, Tablet und Mobilgerät.

---

## Features

### 🏗️ Schritt 1 – Projektdaten
Projektname/Kunde, Adresse, Ersteller und Standort des Verteilers angeben. Stockwerke mit Farbcodierung und Räume definieren. Warnungen wenn die Konfiguration unvollständig ist, bevor es weitergeht.

### 🔌 Schritt 2 – Kabelerfassung
Kabel mit Bezeichnung, Raum, Stockwerk, Kabeltyp (NYM-J, NYY-J, H07V-K, LIYY), Adernanzahl und Querschnitt erfassen. Duplikate per Knopfdruck, Reihenfolge per Drag & Drop. KI-Import per Foto oder Scan über die Anthropic API.

### ⚡ Schritt 3 – Sicherungen planen
Kabel per Drag & Drop auf Sicherungsgruppen (LSS) verteilen. Unterstützt 1-phasige und 3-phasige Leitungsschutzschalter, FILS-Konfiguration sowie Touch-Drag auf Mobilgeräten.

### 🔒 Schritt 4 – FI-Konfiguration
FI-Schutzschalter (RCD) nach Bemessungsstrom, Typ (AC/A/F/B), Fehlerstrom und Polzahl konfigurieren. Automatische TE-Berechnung und Kapazitätsanzeige pro Gruppe.

### 📊 Schritt 5 – Belegungsplan
- **Visuell:** Maßstabsgetreue Darstellung des Verteilers mit richtiger TE-Breite pro FI und LSS. Drag & Drop zum Verschieben von Sicherungen zwischen FI-Gruppen.
- **Tabellarisch:** Übersichtliche Tabelle aller Stromkreise.
- **Klemmenleiste:** Vollständige Visualisierung der Reihenklemmen-Belegung pro FI-Block inkl. PE-Einspeisung, N-Einspeisung/-Endklemme, Abdeckkappen und optionaler KNX-Reserveklemme.

### 📦 Stückliste
Automatisch berechnete Materialliste: FI-Schutzschalter, Leitungsschutzschalter, FILS, Phasenschienen, Reihenklemmen, Querverbinder, N-Brücken. Export per Copy-to-Clipboard für WhatsApp oder Druck.

### 🏷️ Beschriftungsplan
Vollständiger Beschriftungsplan im Q1F1-Schema, exportierbar als WhatsApp-Text oder Druckversion.

### 💾 Projektverwaltung
Projekte werden lokal im Browser gespeichert (localStorage) — optional auch in einer selbst gehosteten **Supabase-Datenbank** (PostgreSQL). Auto-Save nach jeder Plan-Generierung. Startfenster beim App-Start: neues Projekt anlegen oder vorhandenes laden.

---

## Screenshots

> *(Screenshots hier einfügen)*

---

## Self-Hosting mit Coolify

Der Verteilerplaner lässt sich in wenigen Minuten auf jeder eigenen Infrastruktur betreiben — inklusive selbst gehosteter Datenbank.

### Voraussetzungen
- [Coolify](https://coolify.io) Instanz (v4+)
- GitHub/GitLab Repository mit diesem Code

### App deployen

1. **Coolify öffnen** → *New Resource* → *Public Repository* (oder dein privates Repo verbinden)
2. Repository-URL eintragen
3. Build-Einstellungen:
   - **Build Pack:** Nixpacks
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Port:** `80`
4. *Deploy* klicken — fertig.

Coolify erkennt das Vite-Projekt automatisch via Nixpacks. Bei jedem Push auf den konfigurierten Branch wird automatisch neu gebaut und deployed.

### Datenbank (optional) — Supabase self-hosted auf Coolify

Statt der Cloud-Version kann Supabase vollständig auf der eigenen Coolify-Instanz laufen:

1. **Coolify** → *New Resource* → *Service* → **Supabase** → deployen
2. Im Supabase-Dashboard: *Settings → API* → Project URL & anon key kopieren
3. Im SQL-Editor das Schema aus `supabase-schema.sql` ausführen
4. In der App-Konfiguration (Coolify Environment Variables oder `.env`):
   ```
   VITE_SUPABASE_URL=https://supabase.deine-domain.de
   VITE_SUPABASE_ANON_KEY=dein-anon-key
   ```
5. App neu deployen — fertig.

Ohne konfigurierte Umgebungsvariablen fällt die App automatisch auf localStorage zurück (funktioniert weiterhin vollständig).

### Manuelle Installation (ohne Coolify)

```bash
git clone https://github.com/DEIN-USERNAME/svp-verteilerplaner.git
cd svp-verteilerplaner
npm install
npm run build
# dist/ Ordner auf beliebigen Webserver deployen
```

Für lokale Entwicklung:

```bash
npm run dev
```

---

## Technologie

| | |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Styling | Inline CSS + CSS-in-JS |
| Datenspeicherung | Browser localStorage + Supabase (optional) |
| KI-Import | Anthropic Claude API (optional) |
| Deployment | Static Build / Nixpacks (Coolify) |

Keine externen CSS-Frameworks, keine UI-Bibliotheken. Einzige optionale Abhängigkeit: `@supabase/supabase-js` für die Datenbankanbindung.

---

## Einstellungen (⚙️)

Der ⚙️-Button öffnet das Einstellungs-Modal mit drei Bereichen:

| Bereich | Inhalt |
|---|---|
| Firma & Export | Firmenname (erscheint in Stückliste, Beschriftungsplan, Planansicht) |
| Firma & Export | Standard-Ersteller (wird bei neuen Projekten vorausgefüllt) |
| KI-Foto-Import | API-Endpunkt, Modell, API-Key für die Kabellistenerkennung |

### KI-Import konfigurieren (optional)

Der Foto-Import von Kabellisten nutzt die Anthropic Claude API (oder kompatible Alternativen). Zum Aktivieren:

1. [Anthropic API Key](https://console.anthropic.com) erstellen
2. In der App: ⚙️ → KI-Foto-Import → Key eintragen
3. Der Key wird ausschließlich lokal im Browser gespeichert und nie an eigene Server übertragen.

---

## Changelog

Alle Änderungen sind in [CHANGELOG.md](CHANGELOG.md) dokumentiert.

---

## Lizenz

MIT License — frei verwendbar, anpassbar, verteilbar.

---

*Entwickelt von Jedrimos · SVP Elektrotechnik · © 2025*
