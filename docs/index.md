# Elektronikertools – Dokumentation

Browserbasierte Werkzeuge für Elektrofachkräfte.

## Navigation

| Dokument | Inhalt |
|---|---|
| [Setup & Installation](setup.md) | Lokale Installation, Coolify, Umgebungsvariablen |
| [Supabase SQL-Schema](supabase.sql) | Vollständiges SQL zum Copy-Paste |
| [Entwickler-Guide](development.md) | Projektstruktur, neue App anlegen, Konventionen |
| **Apps** | |
| [⚡ Verteilerplaner](apps/verteilerplaner.md) | Verteiler planen, FI, Sicherungen, KI-Import |
| [⏱ Stundenbuch](apps/stundenbuch.md) | Zeiterfassung, CSV-Export |
| [📋 Prüfprotokoll](apps/pruefprotokoll.md) | VDE-Messungen, Grenzwerte, Verteilerplaner-Import |
| [📚 Wissensdatenbank](apps/wissensdatenbank.md) | Team-Wissen, Markdown, Supabase-Sync |

## Schnellstart

```bash
git clone <repo>
cd elektronikertools
npm install
npm run dev
```

Optional mit Datenbank: → [Setup-Guide](setup.md#supabase)
