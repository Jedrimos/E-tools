# 📐 Leitungsberechnung

Eigenständiges Berechnungstool nach VDE 0100-520. Kein Datenbankzugriff – reines Rechentool.

## Features

- Eingaben: Strom (A), Leitungslänge (m), Verlegeart, Material, Phasenzahl, cos φ
- **Empfehlung** des Mindest-Querschnitts (nächste Normstufe ≥ rechnerischer Wert)
- **Spannungsfall-Tabelle** für alle Normstufen 1,5 … 120 mm²:
  - Spannungsfall ΔU (V) und ΔU (%)
  - Max. Belastungsstrom nach VDE 0100-520 (Tabelle B.52.2 vereinfacht)
  - Max. Leitungslänge bei ΔU ≤ 3 %
  - Statusanzeige OK / Überschreitung

## Eingabeparameter

| Parameter | Optionen |
|---|---|
| Verlegeart | B1 (Rohr/Wand), B2 (Kabelkanal), C (Aufputz), E (Freiluft) |
| Material | Kupfer (κ = 56), Aluminium (κ = 35) |
| Phasenzahl | Einphasig 230 V, Drehstrom 400 V |
| cos φ | 1,0 / 0,95 / 0,90 / 0,85 / 0,80 |

## Formeln

**Mindest-Querschnitt:**
```
A_min = (Faktor × I × L × cosφ) / (κ × ΔU_zul)
Faktor: 2 (einphasig), √3 (Drehstrom)
ΔU_zul = 3% × U_N
```

**Spannungsfall:**
```
ΔU = (Faktor × I × L × cosφ) / (κ × A)
ΔU% = ΔU / U_N × 100
```

## Dateien

| Datei | Beschreibung |
|---|---|
| `src/Leitungsberechnung.jsx` | Haupt-Komponente (kein DB-Layer nötig) |
