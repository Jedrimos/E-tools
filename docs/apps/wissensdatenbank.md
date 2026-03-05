# 📚 Wissensdatenbank

Firmeninternes Wissen strukturiert erfassen und im Team teilen. Checklisten, Herstellerhinweise, Montagetipps, Normen – alles an einem Ort.

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

## Team-Sharing via Supabase

Die Wissensdatenbank ist speziell für die Team-Nutzung ausgelegt:

- **Ohne Supabase:** Artikel nur lokal im Browser — kein Sharing
- **Mit Supabase:** Alle Techniker mit derselben Supabase-URL sehen dieselben Artikel
- Indikator **"☁ Geteilt im Team"** erscheint wenn Supabase aktiv
- Ohne Supabase: Warnung **"Supabase nicht konfiguriert – nur lokal"**

> **Für echtes Team-Sharing** muss Supabase konfiguriert sein. → [Setup-Guide](../setup.md)

## Datenspeicherung

- **Lokal:** `localStorage` unter Key `elektronikertools_wissen` (Fallback / Offline-Cache)
- **Supabase:** Tabelle `wissensdatenbank`

## Supabase-Tabelle

```sql
CREATE TABLE wissensdatenbank (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titel       text NOT NULL DEFAULT '',
  kategorie   text DEFAULT 'Allgemein',
  inhalt      text DEFAULT '',
  tags        text[] DEFAULT '{}',
  autor       text DEFAULT '',
  erstellt    date DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

## Geplante Erweiterungen

Siehe [ROADMAP.md](../../ROADMAP.md):
- Anhänge / Bilder in Artikeln
- Versionierung von Artikeländerungen
- Bewertungen / Hilfreich-Markierungen
- Export als PDF
- Verlinkung zwischen Artikeln
