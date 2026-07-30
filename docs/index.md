# Elektronikertools – Dokumentation

Browserbasierte Werkzeuge für Elektrofachkräfte.

## Navigation

| Dokument | Inhalt |
|---|---|
| [Setup & Installation](setup.md) | Lokale Installation, Coolify, Umgebungsvariablen |
| [Entwickler-Guide](development.md) | Projektstruktur, neue App anlegen, Konventionen |
| **Apps** | |
| [⚡ Verteilerplaner](apps/verteilerplaner.md) | Verteiler planen, FI, Sicherungen, KI-Import |
| [⏱ Stundenbuch](apps/stundenbuch.md) | Zeiterfassung, CSV-Export |
| [📋 Prüfprotokoll](apps/pruefprotokoll.md) | VDE-Messungen, Grenzwerte, Verteilerplaner-Import |
| [📚 Wissensdatenbank](apps/wissensdatenbank.md) | Firmenwissen, Markdown |
| [🔧 Wartungsprotokoll](apps/wartungsprotokoll.md) | Wiederkehrende Wartungen, Fälligkeiten |
| [📐 Leitungsberechnung](apps/leitungsberechnung.md) | Querschnittsberechnung VDE 0100-520 |
| [🔌 Materialzähler](apps/materialzaehler.md) | Installationsmaterial zählen, Bestellmengen |

## Schnellstart

```bash
git clone <repo>
cd elektronikertools
npm install
npm run dev
```

Alle Daten werden lokal im Browser gespeichert (`localStorage`) — keine Datenbank nötig. → [Setup-Guide](setup.md)
