# 📚 Wissensdatenbank

Firmeninternes Wissen strukturiert erfassen und im Team teilen. Checklisten, Herstellerhinweise, Montagetipps, Normen – alles an einem Ort.

**Version:** `2026.3.4` | **Farbe:** `#06b6d4` (teal)

---

## Anwendungsfälle

- Inbetriebnahme-Checklisten für bestimmte Wechselrichter-/Anlagentypen
- Herstellerspezifische Hinweise ("Beim SMA Sunny Boy immer X beachten")
- Häufige Fehler und Lösungen
- VDE-Normen und Vorschriften zum schnellen Nachschlagen
- Montage- und Installationstipps
- Werkzeuganleitungen

## Artikel-Struktur

| Feld | Beschreibung |
|---|---|
| Titel | Prägnanter Artikeltitel |
| Kategorie | Themenbereich (s.u.) |
| Tags | Kommagetrennte Schlagwörter für die Suche |
| Autor | Name des Verfassers (aus Einstellungen vorausgefüllt) |
| Inhalt | Freitext mit Markdown-Formatierung |

### Kategorien
- Allgemein
- Wechselrichter / PV
- Verteiler / Schaltanlagen
- FI / RCD / Schutzeinrichtungen
- VDE-Normen & Vorschriften
- Montagetipps & Tricks
- Hersteller & Produkte
- Werkzeuge & Messgeräte
- Recht & Gewährleistung
- Sonstiges

## Markdown-Syntax

Der Artikelinhalt unterstützt einfaches Markdown:

```markdown
# Hauptüberschrift
## Abschnitt
### Unterabschnitt

**fetter Text**
*kursiver Text*
`code oder Messwert`

- Aufzählungspunkt
- Noch ein Punkt

1. Nummerierter Schritt
2. Nächster Schritt

> Wichtiger Hinweis oder Warnung

---

    Codeblock (mit 4 Leerzeichen einrücken)
    oder mit ```-Zäunen
```

**Vorschau:** Im Editor über den Button "👁 Vorschau" jederzeit sichtbar.

## Suche & Filter

- **Volltextsuche** über Titel, Inhalt, Tags und Autor
- **Kategoriefilter** mit Artikelanzahl je Kategorie
- Suchergebnisse in Echtzeit (kein Submit nötig)

## Datenspeicherung

- `localStorage` unter Key `elektronikertools_wissen`
- Im globalen Backup-Export enthalten

---

## Roadmap

### Kurzfristig
- **Anhänge / Bilder in Artikeln** — Fotos oder PDFs an Artikel anhängen.
- **Export als PDF** — Artikel als druckbares PDF exportieren.

### Mittelfristig
- **Verlinkung zwischen Artikeln** — `[[Artikelname]]`-Syntax oder ähnliches.
- **Bewertungen / Hilfreich-Markierungen** — Artikel als hilfreich markieren, Sortierung nach Beliebtheit.
- **Versionierung von Artikeländerungen** — Änderungshistorie pro Artikel.

---

## Changelog

### [2026.3.4] – 2026-03-05
#### 🎉 Erstveröffentlichung
- Artikel mit Titel, Kategorie (10 Voreinstellungen), Tags, Autor und Markdown-Inhalt
- Volltextsuche (Titel, Inhalt, Tags, Autor) + Kategoriefilter in Echtzeit
- Artikel-Karten-Übersicht + Detailansicht mit gerendertem Markdown
- Markdown-Renderer: Überschriften, fett, kursiv, code, Listen, Blockquote, Codeblöcke
- Live-Vorschau im Editor
- Team-Sharing via Supabase (`☁ Geteilt im Team`-Indikator)
- Warnung wenn Supabase nicht konfiguriert
- `src/lib/db_wissen.js` — Supabase CRUD für `wissensdatenbank`-Tabelle
