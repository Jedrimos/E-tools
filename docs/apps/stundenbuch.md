# ⏱ Stundenbuch

Einfache Zeiterfassung für Elektriker, Monteure und Servicetechniker.

**Version:** `2026.3.3` | **Farbe:** `#3dcc7e` (grün)

---

## Felder pro Eintrag

| Feld | Pflicht | Beschreibung |
|---|---|---|
| Datum | ✓ | Arbeitstag |
| Von | ✓ | Arbeitsbeginn (HH:MM) |
| Bis | ✓ | Arbeitsende (HH:MM) |
| Pause | ✓ | Pausendauer in Minuten (0/15/30/45/60) |
| Projekt / Baustelle | – | Freitext, Autocomplete aus bisherigen Einträgen |
| Tätigkeit | – | z.B. Installation, Montage, Inbetriebnahme |
| Notiz | – | Optionale Bemerkung |

Netto-Stunden werden automatisch berechnet: `(Bis - Von) - Pause`

## Filter & Auswertung

- **Monatsfilter:** Einträge nach Monat filtern
- **Projektfilter:** Freitextsuche nach Projekt/Baustelle
- **Gesamtstunden:** Summe der gefilterten Netto-Stunden
- Einträge sortiert nach Datum (neueste zuerst)

## CSV-Export

Button **↓ CSV Export** — exportiert alle gefilterten Einträge als CSV:
- Trennzeichen: Semikolon (`;`)
- UTF-8 mit BOM (Excel-kompatibel)
- Dateiname: `Stundennachweis_{Firma}_{Monat}.csv`
- Spalten: Datum, Von, Bis, Pause(min), Netto(h), Projekt, Tätigkeit, Notiz

## Datenspeicherung

- **Lokal:** `localStorage` unter Key `elektronikertools_stundenbuch`
- **Supabase:** Tabelle `stunden` (wenn konfiguriert)
  - Jeder Eintrag ist eine eigene Zeile
  - `db_id` wird nach erstem Speichern in Supabase gesetzt
  - Sync: beim Start laden, nach jedem Speichern/Löschen synchronisieren

## Supabase-Tabelle

```sql
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
```

---

## Roadmap

### Kurzfristig
- **Monatsübersicht / Diagramm** — Gestapeltes Balkendiagramm der Arbeitsstunden pro Projekt über den Monat.
- **Tagesberichte** — Strukturierter Tagesbericht als Nachweis für den Auftraggeber (was wurde gemacht, welche Materialien verbraucht).

### Mittelfristig
- **Lohnabrechnung** — Stundenlohn hinterlegen, automatische Bruttolohn-Berechnung pro Monat, Export als PDF-Lohnzettel.
- **Regiezettel / Rechnungsexport** — Aus Stunden + Materialien (vom Verteilerplaner) direkt eine Regie-Rechnung generieren.

---

## Changelog

### [2026.3.3] – 2026-03-05
#### ✨ Neu
- **Supabase-Sync** — Beim Start automatisch aus Supabase laden, nach jedem Speichern/Löschen synchronisieren. `☁ Datenbank`-Indikator wenn aktiv.
- `db_id` pro Eintrag für sicheres Update/Delete in Supabase.
- **`src/lib/db_stundenbuch.js`** — DB-Layer für `stunden`-Tabelle (CRUD mit Supabase→localStorage-Fallback).

---

### [2026.3.0] – 2026-03-05
#### 🎉 Erstveröffentlichung
- Zeiterfassung mit Datum, Von/Bis, Pause, Projekt/Baustelle, Tätigkeit und Notiz
- Monatsfilter, Projektfilter, Gesamtstunden-Anzeige
- CSV-Export als Stundennachweis (Excel-kompatibel)
- Speicherung in `localStorage`
