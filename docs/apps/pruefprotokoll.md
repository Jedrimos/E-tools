# 📋 Prüfprotokoll

VDE-konforme Messprotokollierung für Erst- und Wiederholungsprüfungen nach VDE 0100-600.

## Protokoll-Kopfdaten

| Feld | Beschreibung |
|---|---|
| Auftraggeber | Kunde / Anlageninhaber |
| Anlagenstandort | Adresse der Anlage |
| Auftragsnummer | Interne Referenz |
| Anlagenart | Wohngebäude / Gewerbe / Industrie / Büro / Außenanlage |
| Nennspannung | 230/400V (Standard), 120/208V, 400V |
| Prüfer | Name der Elektrofachkraft |
| Prüfdatum | Datum der Messung |
| Nächste Prüfung | Datum der nächsten Wiederholungsprüfung |

## Messungen pro Stromkreis

Jeder Stromkreis wird als aufklappbare Zeile in der Übersichtstabelle dargestellt.

### PE-Durchgangswiderstand
- **R_PE** (Ω) — kein fester Grenzwert ohne Kabellänge/Querschnitt, wird dokumentiert

### Isolationswiderstand (Riso)
- **L1-PE, L2-PE, L3-PE, N-PE** (MΩ)
- L2/L3 nur bei 3-phasigen Stromkreisen aktiv
- Grenzwert: **≥ 1 MΩ** (VDE 0100-600 §61.3)

### Schleifenimpedanz
- **Zs** (Ω) — gemessene Schleifenimpedanz
- **Ik** (A) — prospektiver Kurzschlussstrom
- Grenzwert abhängig von Sicherungstyp und Nennstrom (kein fixer Wert)

### FI / RCD-Prüfung
| Messung | Grenzwert | Norm |
|---|---|---|
| t @ IΔN | ≤ 300 ms (Typ S: ≤ 500 ms) | VDE 0664 |
| t @ 5×IΔN | ≤ 40 ms | VDE 0664 |
| t @ ½×IΔN | darf nicht auslösen (Feld leer lassen) | VDE 0664 |
| UB (Berührungsspannung) | ≤ 50 V | VDE 0100-410 |

FI-Typen: **AC** (nur Sinus), **A** (Sinus + pulsierend), **F** (frequenzunabhängig), **B** (allstromsensitiv), **S** (selektiv, verzögert)

## Automatische Bewertung

Die App bewertet jeden Messwert automatisch:
- 🟢 **Grün** = Grenzwert eingehalten
- 🔴 **Rot** = Grenzwert überschritten
- **—** = Kein Messwert eingetragen (offen)

Gesamtbewertung pro Stromkreis und pro Protokoll:
- **✓ OK** = alle eingetragenen Werte in Ordnung
- **✗ Fehler** = mindestens ein Grenzwert verletzt
- **— Offen** = keine Messwerte eingetragen

## Import aus Verteilerplaner

Button **⚡ Aus Verteilerplaner** öffnet ein Modal mit allen gespeicherten Verteiler-Projekten. Bei Auswahl wird ein neues Protokoll erstellt mit:

- Auftraggeber ← Projektname
- Anlagenstandort ← Adresse + Standort
- Prüfer ← Ersteller des Projekts
- Stromkreise ← aus Sicherungen + zugehörigen Kabeln
  - Bezeichnung: Kabel-Bezeichnung(en) der Sicherung
  - Nennstrom: aus LSS-Typ (z.B. "B16" → 16A)
  - Sicherungstyp: B/C/D aus LSS-Bezeichnung
  - 3-phasig: aus FILS/3P-Flag

## Datenspeicherung

- **Lokal:** `localStorage` unter Key `elektronikertools_pruefprotokoll`
- **Supabase:** Tabelle `pruefprotokolle`
  - `verteiler_id` verknüpft mit dem Quell-Projekt in `projekte`

## Supabase-Tabelle

```sql
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
```
