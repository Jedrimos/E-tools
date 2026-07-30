# 🔧 Wartungsprotokoll

Wiederkehrende Wartungsaufgaben verwalten mit Intervallen, automatischer Fälligkeitsberechnung und Statusanzeige.

## Features

- Aufgaben anlegen mit Kategorie, Intervall und Zuständigem
- Intervalle: monatlich, vierteljährlich, halbjährlich, jährlich, 2-jährlich
- Datum „Zuletzt durchgeführt" → nächster Termin wird automatisch berechnet
- Farbkodierter Status: **rot** = überfällig · **gelb** = in ≤ 30 Tagen fällig · **grün** = OK
- „✓ Erledigt"-Button setzt Datum auf heute und berechnet Fälligkeit neu
- Filter nach Kategorie, Suche, Sortierung nach Fälligkeit / Name / Kategorie
- Drucken / PDF via `window.print()`
- Speicherung in `localStorage`

## Kategorien

E-Check · Blitzschutz · Notbeleuchtung · Brandschutz · Aufzug · Heizung/Lüftung · Allgemein · Sonstige

## Datenspeicherung

`localStorage` unter Key `elektronikertools_wartung`, im globalen Backup-Export enthalten.

## Dateien

| Datei | Beschreibung |
|---|---|
| `src/Wartungsprotokoll.jsx` | Haupt-Komponente |
| `src/lib/db_wartung.js` | localStorage-Layer |
