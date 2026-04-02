# Materialzähler

Installationsmaterial (Steckdosen, Schalter, Rahmen etc.) pro Projekt erfassen und Bestellmengen verwalten.

---

## Funktionsübersicht

### Projektliste

Die Startansicht zeigt alle angelegten Projekte als Karten mit:
- Projektname und Ort
- Anzahl Positionen und Gesamtstückzahl
- Fortschrittsbalken (bestellt / benötigt in %)
- Anzahl offener Positionen

Über **+ Neues Projekt** legt man ein Projekt an.

### Projekt bearbeiten / löschen

Jede Projektkarte hat Buttons zum Bearbeiten (✏️) und Löschen (🗑️). Das Löschen erfordert eine Bestätigung.

---

## Positionen erfassen

Nach dem Öffnen eines Projekts erscheint die Positionsliste. Über **+ Position** öffnet sich das Modal:

| Feld | Beschreibung |
|---|---|
| Kategorie | Steckdosen / Schalter / Dimmer / Rahmen / Dosen & Gehäuse / Sonstiges |
| Schnellauswahl | Häufige Artikel als klickbare Chips (je nach Kategorie) |
| Bezeichnung | Freitext oder per Schnellauswahl befüllt |
| Menge benötigt | Anzahl die für das Projekt gebraucht wird |
| Menge bestellt | Bereits bestellte Menge |
| Notiz | z.B. Serie, Farbe, Hersteller |

---

## Schnellauswahl

Vordefinierte Artikel je Kategorie:

| Kategorie | Beispiele |
|---|---|
| Steckdosen | Schuko 1-fach/2-fach/3-fach, USB A+C, Feuchtraum IP44, CEE 16A/32A |
| Schalter | Ausschalter, Wechselschalter, Serienschalter, Kreuzschalter, Taster |
| Dimmer | Druckknopf, Drehknopf, LED-Dimmer |
| Rahmen | 1-fach bis 5-fach |
| Dosen & Gehäuse | Gerätedose UP, Hohlwanddose, Abzweigdose, Kabelkanal, Leerrohr |

---

## Mengen direkt anpassen

In der Positionsliste können **Benötigt** und **Bestellt** direkt inline über Zahlfelder geändert werden — kein Modal nötig.

---

## Statusanzeige

| Status | Bedeutung |
|---|---|
| — | Menge = 0, noch nicht geplant |
| Offen | Menge > 0, noch nichts bestellt |
| Teils bestellt | Bestellt < Benötigt |
| Bestellt ✓ | Bestellt ≥ Benötigt |

---

## Filter & Suche

- **Kategoriefilter**: Tabs oben in der Positionsansicht
- **Suche**: Freitext über Bezeichnung und Notiz

---

## Drucken

Der Button **🖨 Drucken** öffnet eine Druckansicht mit der Materialliste, gruppiert nach Kategorie. Enthält Projektname, Ort, Datum und Spalten: Bezeichnung / Benötigt / Bestellt / Notiz.

---

## Datenspeicherung

- **localStorage**: Key `elektronikertools_materialzaehler` — immer aktiv, auch ohne Netzwerk
- **Supabase**: Tabelle `materialzaehler_projekte`, Positionen als JSONB-Array im Projekt-Datensatz
- Im globalen **Backup/Restore** des Dashboards enthalten

### Supabase-Tabelle

```sql
CREATE TABLE materialzaehler_projekte (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL DEFAULT '',
  ort          text DEFAULT '',
  notiz        text DEFAULT '',
  positionen   jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE materialzaehler_projekte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON materialzaehler_projekte FOR ALL USING (true) WITH CHECK (true);
```
