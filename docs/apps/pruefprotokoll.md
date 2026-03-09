# 📋 Prüfprotokoll

VDE-konforme Messprotokollierung für Erst- und Wiederholungsprüfungen nach VDE 0100-600.

**Version:** `2026.3.3` | **Farbe:** `#f59e0b` (amber)

---

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

---

## Roadmap

### Kurzfristig
- **PDF-Export / Drucken** — Druckansicht mit Briefkopf (Firma, Logo, Prüfer), sauber formatierten Tabellen und Unterschriftsfeld. `window.print()` mit CSS `@media print` als erster Schritt.
- **Unterschriftsfeld** — Canvas-basiertes Unterschrifts-Pad, Signatur wird als Base64 im Protokoll gespeichert. Nützlich auf dem Tablet direkt vor Ort.
- **Wiederholungsprüfungs-Erinnerung** — Protokolle mit abgelaufenem `naechste_pruefung`-Datum werden im Dashboard hervorgehoben.
- **Messwert-Import aus Gerät** — Schnittstelle für gängige Messgeräte (Fluke, Metrel, Benning) die Ergebnisse als CSV oder Bluetooth exportieren.

### Mittelfristig
- **Normreferenzen im UI** — Kleine Info-Icons mit Tooltip der genauen Norm und Grenzwert-Begründung (z.B. "VDE 0100-600 §61.3.3" bei Riso).
- **Prüfmittel-Verwaltung** — Welches Messgerät wurde verwendet, Kalibrierungsdatum, Seriennummer — für die Rückverfolgbarkeit.
- **Vorlagen** — Vordefinierte Stromkreis-Listen für typische Anlagen (EFH, Gewerbeeinheit, Tiefgarage) als Schnellstart.

---

## Changelog

### [2026.3.3] – 2026-03-05
#### ✨ Neu
- **Supabase-Sync** — Beim Start automatisch aus Supabase laden, nach jedem Speichern/Löschen synchronisieren. `☁ Datenbank`-Indikator wenn aktiv.
- **Import aus Verteilerplaner** — Gespeicherte Verteiler-Projekte direkt importieren. Übernommen werden: Auftraggeber, Anlagenstandort, Prüfer sowie alle Stromkreise (Bezeichnung, Nennstrom, Sicherungstyp, 3-phasig-Flag).
- **`src/lib/db_pruefprotokoll.js`** — DB-Layer für `pruefprotokolle`-Tabelle (CRUD + `loadProjekteForImport` mit Supabase→localStorage-Fallback).

---

### [2026.3.2] – 2026-03-05
#### 🎉 Erstveröffentlichung
- Protokoll-Liste mit Gesamtbewertung je Protokoll
- Kopfdaten: Auftraggeber, Standort, Anlagenart, Nennspannung, Prüfer, Datum, nächste Prüfung, Auftragsnummer
- Stromkreis-Tabelle mit aufklappbaren Detailformularen
- PE-Durchgangswiderstand R_PE (Ω)
- Isolationswiderstand Riso L1/L2/L3/N-PE (MΩ) — 1- und 3-phasig
- Schleifenimpedanz Zs (Ω) + Kurzschlussstrom Ik (A)
- FI/RCD-Prüfung: IΔN, Typ (AC/A/F/B/S), t@IΔN, t@5×IΔN, t@½×IΔN, UB
- Automatische Ampel-Bewertung nach VDE-Grenzwerten
- Speicherung in `localStorage`
- Dashboard-Integration mit amber/gold Farbschema
