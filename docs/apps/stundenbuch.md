# ⏱ Stundenbuch

Einfache Zeiterfassung für Elektriker, Monteure und Servicetechniker.

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
