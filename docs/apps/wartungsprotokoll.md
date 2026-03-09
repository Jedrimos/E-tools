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
- Supabase-Sync + localStorage-Fallback

## Kategorien

E-Check · Blitzschutz · Notbeleuchtung · Brandschutz · Aufzug · Heizung/Lüftung · Allgemein · Sonstige

## Datenbank

Supabase-Tabelle: `wartungsaufgaben`

```sql
create table wartungsaufgaben (
  id          text primary key,
  bezeichnung text not null,
  kategorie   text default '',
  intervall   text default 'jaehrlich',
  letzte      text default '',
  naechste    text default '',
  zustaendig  text default '',
  notiz       text default '',
  created_at  timestamptz default now()
);
alter table wartungsaufgaben enable row level security;
create policy "allow all" on wartungsaufgaben for all using (true) with check (true);
```

Vollständige SQL-Datei: [docs/supabase.sql](../supabase.sql)

## Dateien

| Datei | Beschreibung |
|---|---|
| `src/Wartungsprotokoll.jsx` | Haupt-Komponente |
| `src/lib/db_wartung.js` | DB-Layer (Supabase + localStorage) |
