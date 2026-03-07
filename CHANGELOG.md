# Changelog

Alle nennenswerten Änderungen an den Elektronikertools werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).
Versionierung nach dem Schema **`JAHR.MONAT.PATCH`** (analog zu Home Assistant).

---

## [2026.3.6] – 2026-03-07

### ✨ Neu

**Elektrorechner — neuer Tab Abstandsrechner**
- Gleichmäßige Verteilung von Objekten (Lampen, Rohrschellen, Steckdosen …) auf einer Strecke
- 3 Modi: Gleichmäßig inkl. Randabstand · Wand-zu-Wand · Frei (Wandabstand vorgeben)
- SVG-Visualisierung mit Positions-Nummern, Abstands-Labels und Wandabstand-Markierung
- Positionsliste aller Objekte als „Abstand ab linker Wand"
- Referenztabelle Max. Befestigungsabstände nach VDE / DIN (NYM, NYY, H07V-K, Rohre, Kabelkanal, Datenkabel)
- Einheit wählbar: Meter oder Zentimeter

---

## [2026.3.5] – 2026-03-07

### ✨ Neu / Geändert

**Elektrorechner (erweitert aus Leitungsberechnung)**
- App umbenannt von „Leitungsberechnung" zu „Elektrorechner" mit 5 Tabs:
- **Leitungsberechnung** (unverändert): Querschnitt + Spannungsfall nach VDE 0100-520
- **Strom & Leistung**: P/U/I/cosφ für 1-phasig und Drehstrom; Schein- und Blindleistung; Ohm'sches Gesetz (U/I/R)
- **Motorstrom**: Nennstrom/Anlaufstrom (P, U, cosφ, η, Anlauf-Faktor), Sicherungsempfehlung, Leitungsquerschnitt-Richtwert
- **cos φ Korrektur**: Q_C (kVAr), Kondensatorgröße (µF), Stromeinsparung ΔI
- **Formelsammlung**: 7 Gruppen — Ohm, 1P/3P Wechselstrom, Leitungsberechnung, Kompensation, Schutzmaßnahmen VDE, Konstanten

---

## [2026.3.4] – 2026-03-07

### ✨ Neu

**Wartungsprotokoll (neue App)**
- Wiederkehrende Wartungsaufgaben erfassen: E-Check, Blitzschutz, Notbeleuchtung, Brandschutz u.v.m.
- Kategorien, Intervalle (monatlich / vierteljährlich / halbjährlich / jährlich / 2-jährlich)
- Fälligkeits-Automatik: „Zuletzt durchgeführt" → Nächster Termin wird automatisch berechnet
- Farbkodierter Status: überfällig (rot), bald fällig (gelb), OK (grün)
- „Erledigt"-Button setzt Datum auf heute und berechnet Fälligkeit neu
- Supabase-Sync + localStorage-Fallback; im Backup-Export enthalten

**Leitungsberechnung (neue App)**
- Eigenständiges Berechnungstool nach VDE 0100-520
- Eingaben: Strom (A), Länge (m), Verlegeart (B1/B2/C/E), Material (Cu/Al), Phasenzahl (1P/3P), cos φ
- Empfehlung des Mindest-Querschnitts (nächste Normstufe ≥ rechnerischer Wert)
- Spannungsfall-Tabelle: ΔU (V), ΔU (%), max. Belastungsstrom, max. Leitungslänge für alle Normstufen
- Grenzwert ΔU ≤ 3 % nach VDE 0100-520, Überschreitung farbkodiert
- Kein Datenbankzugriff – reines Rechentool

---

## [2026.3.3] – 2026-03-07

### ✨ Neu

**Verteilerplaner — Klemmenbezeichnungen**
- Jede FI-Gruppe (Q1, Q2, …) bekommt eine Klemmleisten-Nummer: X1, X2, …
- Die PE-Einspeisung jeder Klemmleiste trägt das Strip-Label (z.B. "X1")
- Jede Reihenklemme (rk_mit_pe, rk_ohne_pe, rk_n_fils) wird fortlaufend nummeriert: X1.1, X1.2, X1.3 …
- FILS-Gruppen erhalten die nächste verfügbare Nummer nach den FI-Gruppen
- Labels erscheinen unter jeder Klemme in der Klemmenleisten-Visualisierung
- Im Beschriftungsplan: Q-Zeile zeigt "Q1 X1", LS-Zeile zeigt "1F1 / X1.1" (oder X1.2–X1.4 bei mehreren Klemmen)

**Verteilerplaner — FILS Querverbinder komplett**
- L-QV + N-QV für die L- und N-Seite der 3-pol rk_n_fils Klemme (beide Brücken benötigt)
- Bei 5×-Kabeln in FILS: zusätzlich LL-QV für rk_ohne_pe (L2+L3)
- QV-Overlay jetzt **über** den Klemmen dargestellt (physikalisch korrekt: QV wird von oben aufgesteckt)

**Verteilerplaner — Projektstand persistieren**
- Beim Speichern werden jetzt mitgespeichert: aktueller Schritt, aktiver Tab, Plantyp (visuell/tabelle), alle Toggles (RK, QV, N-Brücke, KNX) sowie der generierte Belegungsplan
- Beim Laden eines Projekts öffnet die App direkt auf dem zuletzt genutzten Schritt / Tab — kein manuelles Weiterklicken mehr nötig

**Mobile Responsiveness — alle Tools**
- *Verteilerplaner:* Header auf Mobilgeräten zweizeilig: Zeile 1 mit Logo-Icon + Laden/Speichern, Zeile 2 mit Step-Navigation (horizontal scrollbar). Logo-Text, Version-Badge, Foto/Einstellungen/Info-Buttons auf kleinen Screens ausgeblendet.
- *Verteilerplaner:* Redundanter Step-Fortschrittsbalken in der Hauptansicht auf Mobile ausgeblendet (Header-Nav übernimmt)
- *Stundenbuch:* Eintrags-Karten responsives 2-Spalten-Grid auf < 600 px; Pause-Spalte automatisch ausgeblendet
- *Prüfprotokoll:* Stromkreis-Tabelle mit horizontalem Scroll auf Mobile; StromkreisForm 2-spaltig; Anlagendaten-Grid 2-spaltig; Header-Aktionsbuttons wrappen in neue Zeile

**Info-Buttons — alle Tools**
- ℹ️-Button in Stundenbuch, Prüfprotokoll und Wissensdatenbank (analog zum Verteilerplaner)
- Jede App zeigt ein App-spezifisches Info-Modal mit Beschreibung, Features und Versionsnummer

**Normreferenzen im Prüfprotokoll**
- ⓘ-Buttons direkt bei den Messabschnitten: PE-Durchgangswiderstand, Isolationswiderstand, Schleifenimpedanz, FI/RCD
- Popover zeigt Normreferenz (DIN VDE 0100-600 §xx), Grenzwert und technische Begründung
- Beispiel Schleifenimpedanz: Formel Zs ≤ U₀/(5×Ia) mit konkreten Beispielwerten für gängige Sicherungstypen

**Leitungsberechnung im Verteilerplaner**
- Neues Feld "Länge (m)" pro Kabel in Schritt 2 (wird gespeichert)
- ⚡-Button öffnet Inline-Leitungsrechner direkt im Kabel-Formular
- Rechner: Nennstrom wählen → Max-Länge für gewählten Querschnitt + Empfehlung + "Übernehmen"-Button
- Formel: VDE 0100-520, Kupfer, cos φ=1, ΔU ≤ 3 % (6,9 V)

**Tagesberichte im Stundenbuch**
- Button "📄 Tagesbericht" im Header
- Datum wählen → strukturierte Tabelle aller Einträge des Tages: Von/Bis, Pause, Nettozeit, Projekt, Tätigkeit, Notiz
- Gesamt-Stunden-Auswertung, Unterschriftsfelder für Mitarbeiter und Auftraggeber
- Druckfunktion (Browserdruckdialog)

**Zuletzt geöffnet im Dashboard**
- Dashboard zeigt die letzten 3 geöffneten Apps als Schnellzugriff-Buttons über den App-Karten
- Zeitstempel (z.B. "vor 2 Std.") direkt am Button

**Todo.md**
- Neue Datei `Todo.md` im Repository: zentrale Aufgabenliste für Ideen die während der Arbeit einfallen
- PocketBase-Migration als offene Aufgabe eingetragen

### 🐛 Bugfixes

- Verteilerplaner: `buildSeq`-Kontext in der Beschriftungs-Klemmen-Zählung korrekt (FILS-Gruppe hatte fehlende `xLabels`-Definition → `?.get()` als sicherer Fallback)
- Prüfprotokoll: FL-Komponente akzeptiert kein `className` — 3-polig-Feld korrekt in eigenen `div` gewrappt
- Verteilerplaner: Step-2-Buttons overflow auf schmalen Screens behoben (flexWrap + whiteSpace:nowrap)

---

## [2026.3.1] – 2026-03-06

### ✨ Neu

**PDF-Export (Prüfprotokoll)**
- Button "⬇ PDF" in der Protokollliste und im Editor
- Erzeugt ein professionelles A4-PDF nach DIN VDE 0100-600 mit Kopfzeile, Metadaten-Box, Gesamtergebnis-Banner und Stromkreis-Tabelle
- Lazy-geladen: jsPDF wird erst beim ersten PDF-Klick heruntergeladen (spart ~250kB beim Seitenstart)

**PWA — App installierbar**
- `public/manifest.json` mit Name, Icons, Theme-Color
- Service Worker mit Cache-Strategie (Supabase-Requests nie gecacht)
- Meta-Tags für iOS Safari; App kann auf Android/iOS als eigenständige App installiert werden

**Stundenbuch: Monats-Chart**
- SVG-Balkendiagramm direkt über der Eintrags-Liste
- Stunden pro Tag, farbkodiert: grün ≥ 8h, blau 4–8h, grau < 4h
- Gestrichelte 8h-Referenzlinie, heutiger Tag hervorgehoben

**Prüfprotokoll**
- Fortschrittsring (SVG) im Editor-Header: zeigt % der gemessenen Stromkreise live an
- Ctrl+S / Cmd+S speichert das Protokoll direkt aus dem Editor
- Drucken-Button im Protokoll-Editor (`window.print()`)
- Ablaufwarnung direkt an jedem Protokoll in der Liste: roter Badge bei abgelaufener Prüffrist, gelber Badge bei Fälligkeit in 30 Tagen
- Print-CSS verbessert: saubere Druckansicht, Buttons werden ausgeblendet, helle Hintergrundfarben

**Stundenbuch**
- Ctrl+S / Cmd+S speichert den Stunden-Eintrag im offenen Formular
- Feierabend-Hinweis: läuft der Timer ≥ 8h, erscheint eine diskrete Meldung mit der Gesamtzeit
- Wochenstunden-Anzeige: Netto-Stunden der aktuellen Woche direkt im Header
- Start/Stop-Timer: Zeitmessung per Klick, füllt beim Stopp automatisch Von/Bis-Felder im neuen Eintrag

**Dashboard**
- Live-Stats unterhalb des Titels: Verteiler-Anzahl, Protokoll-Anzahl, Arbeitsstunden diesen Monat
- Stats aktualisieren sich automatisch beim Zurücknavigieren
- Ablaufdatum-Badge auf der Prüfprotokoll-Karte: zeigt Anzahl abgelaufener und bald fälliger Protokolle
- Supabase-Verbindungsstatus-Indikator (grün/rot/grau) direkt im Dashboard
- Backup-Export: alle App-Daten als JSON-Datei herunterladen
- Backup-Import: JSON-Backup einlesen und localStorage wiederherstellen

**Verteilerplaner**
- Projekt-Suche in beiden Lade-Dialogen (StartScreen + Mid-Session-Modal), erscheint ab 4 Projekten
- Reserveplatz-Markierung: Sicherung als "Reserve" flaggen (erscheint grau/gedimmt), wird in der Stückliste als "Reserveplatz (leer)" aufgeführt

### 🐛 Bugfixes

- **Stundenbuch**: Timer-Prefill-State war nach der nutzenden Funktion deklariert — Reihenfolge korrigiert
- **Prüfprotokoll**: Totes Ternary in L2-PE-Label entfernt

### ♻ Refactoring

- `uid()` in alle Dateien war dupliziert → `src/lib/utils.js` zentralisiert, alle Importe aktualisiert

---

## [2026.3.0] – 2026-03-06

### 🎉 Elektronikertools – Erster vollständiger Release

Kompletter Neuaufbau von Grund auf: Dashboard, 4 Tools, Supabase-Anbindung, vollständige Dokumentation und öffentliche Veröffentlichung.

### ✨ Neu

**Dashboard & Infrastruktur**
- Dashboard als Startseite mit App-Auswahl und globaler Konfiguration (Firma, Mitarbeiter, Ort, Supabase)
- Gemeinsame Toast-Komponente (`src/components/Toast.jsx`) für alle Apps
- Globale CSS Design-Tokens (`--bg`, `--blue`, `--green`, `--red` …) in `index.css`
- Vollständige Projektdokumentation unter `docs/` (Setup, SQL-Schema, Entwickler-Guide, App-Docs)
- `CLAUDE.md` — Projektregeln und Konventionen für die Entwicklung

**Tool: Verteilerplaner** *(ehemals eigenständiges Projekt, jetzt integriert)*
- "← Dashboard"-Button im Startfenster und im Header
- Logo-Klick führt zurück zur Projektauswahl

**Tool: Stundenbuch** *(neu)*
- Zeiterfassung mit Datum, Von/Bis, Pause, Projekt, Tätigkeit und Notiz
- Monats- und Projektfilter, CSV-Export als Stundennachweis
- Supabase-Sync

**Tool: Prüfprotokoll** *(neu)*
- VDE-konforme Messprotokollierung nach VDE 0100-600
- PE-Durchgangswiderstand, Isolationswiderstand, Schleifenimpedanz, FI/RCD-Prüfung
- Automatische Ampel-Bewertung nach VDE-Grenzwerten
- Import aus Verteilerplaner (Stromkreise, Nennstrom, Sicherungstyp)
- Supabase-Sync

**Tool: Wissensdatenbank** *(neu)*
- Firmeninternes Wissen mit Titel, Kategorie, Tags, Autor und Markdown-Inhalt
- Volltextsuche + Kategoriefilter, Markdown-Renderer mit Live-Vorschau
- Team-Sharing via Supabase

### 🔧 Geändert
- Branding bereinigt: alle internen Bezeichnungen neutral, kein voreingestellter Firmenname
- CSS-Variablen: `--svp`/`--svp2` → `--blue`/`--blue2`
- localStorage-Keys: `svp_*` → `vp_*` mit automatischer Migration

---

## Ältere Versionen (vor Elektronikertools, Semver)

### [1.6.0] – 2026-03-05

#### ✨ Neu
- **Startfenster** — Modal beim App-Start mit "Neues Projekt anlegen" oder "Vorhandenes Projekt laden"
- **Einstellungsseite (⚙️)** — Firmenname, Standard-Ersteller und KI-API-Konfiguration in einem Dialog
- **Supabase-Datenbankanbindung** — Projekte optional in Supabase PostgreSQL speichern (self-hosted oder Cloud)
- **Auto-Save** — Nach jeder Plan-Generierung automatisches Speichern lokal und in Supabase
- **Ersteller & Standort** — Neue Felder in Schritt 1, erscheinen im Belegungsplan-Kopf

#### 🐛 Behoben
- Steckbrückenlogik (Querverbinder): Querverbinder wurden nie berechnet wegen fehlendem `setShowKlemmen`. Fix: überflüssige Abhängigkeit entfernt

#### 🔧 Geändert
- ⚙️-Button öffnet jetzt das neue kombinierte Einstellungs-Modal
- Toten Code entfernt: `kabelId`, `kabelLabel`, `showKlemmen` u.a.

---

### [1.5.0] – 2025

#### ✨ Neu
- Custom Tooltips bei gesperrten Navigationsschritten
- Warnung bei unvollständiger Projektkonfiguration in Schritt 1

#### 🐛 Behoben
- Navigation gesperrt / nicht anklickbar unter bestimmten Bedingungen (Erreichbarkeits-Logik überarbeitet)
- Kein vordefiniertes leeres Kabel beim App-Start
- Speichern-Button ohne Projektname

#### 🔧 Geändert
- Touch Drag & Drop vollständig überarbeitet
- Mobile UI verbessert

---

### [1.4.0] – 2025

#### ✨ Neu
- Undo-Funktion (Ctrl+Z) für gelöschte Kabel und Sicherungen
- Plan-Edit-Modal — FI und LSS direkt im Belegungsplan bearbeiten
- Querverbinder-Berechnung
- N-Brücken-Kalkulation
- FILS-Unterstützung
- KNX-Reserveklemme

---

### [1.3.0] – 2025

#### ✨ Neu
- KI-Import via Foto (Anthropic Claude API)
- Beschriftungsplan im Q1F1-Schema
- Stockwerk-Farbcodierung

---

### [1.2.0] – 2025

#### ✨ Neu
- Klemmenleiste-Visualisierung
- Stückliste mit WhatsApp-Export
- Projekt speichern / laden

---

### [1.1.0] – 2025

#### ✨ Neu
- Drag & Drop für Kabelzuweisung
- 3-phasige Leitungsschutzschalter
- FILS-Konfiguration

---

### [1.0.0] – 2025

#### 🎉 Erstveröffentlichung
- Geführter 5-Schritte-Workflow: Projekt → Kabel → Sicherungen → FI → Plan
- Automatische Verteilung auf FI-Gruppen mit TE-Kapazitätsprüfung
- Visuelle und tabellarische Plan-Ansicht
