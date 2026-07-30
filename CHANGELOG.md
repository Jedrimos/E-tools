# Changelog

Alle nennenswerten Änderungen an den Elektronikertools werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).
Versionierung nach dem Schema **`JAHR.MONAT.PATCH`** (analog zu Home Assistant).

---

## [2026.7.1] – 2026-07-30

### 🐛 Umfassender Bugfix-Durchgang (Repo-weiter Multi-Agent-Audit, 67 bestätigte Findings)

**Sicherheitskritisch**
- **`vde.js`**: Schleifenimpedanz (Zs) und Kurzschlussstrom (Ik) wurden bisher **nie** gegen einen Grenzwert geprüft — ein Stromkreis mit lebensgefährlich hoher Zs konnte als "bestanden" durchgehen. Neu: `Zs ≤ U₀/Ia` bzw. `Ik ≥ Ia` für Sicherungstyp B/C/D. Falsche NormInfo-Formel in Pruefprotokoll.jsx (war 5× zu streng) korrigiert.
- **`Materialzaehler.jsx`**: Echte XSS-Lücke in `drucken()` behoben — Projekt-/Positionsfelder wurden ungeescaped per `document.write()` in ein neues Fenster geschrieben.

**Rechenfehler**
- **`Leitungsberechnung.jsx`**: Kompensationskondensator-Formel war Faktor 1000 zu groß (2 Stellen betroffen). Kabel-Querschnitt-Empfehlung prüfte nie die Strombelastbarkeit der Verlegeart und konnte ein thermisch unterdimensioniertes Kabel empfehlen; fiel bei zu hohem Spannungsfall-Bedarf zudem still auf 120 mm² zurück statt zu warnen.
- **`Verteilerplaner.jsx`**: FILS-Stromkreise wurden unabhängig vom Sicherungstyp immer als "3P" beschriftet. Manuelle Phasenwahl bei 3-poligen Sicherungen verwarf die 3P-Kennzeichnung. Leitungsrechner (Step 2) nutzte immer die einphasige Formel unabhängig von der Aderzahl. N-Brücken-Länge wich zwischen Stückliste und Klemmenleisten-Visualisierung um genau eine Klemmenbreite ab.
- **`Pruefprotokoll.jsx`**: Gesamtergebnis "bestanden" verlangte nur "kein fail" statt "alle Stromkreise gemessen" — unvermessene Stromkreise zählten automatisch als bestanden. Drei verschiedene Statuslogiken (Liste/Editor/PDF) widersprachen sich, jetzt über `gesamtStatus()` vereinheitlicht. Ik(kA)-Label korrigiert zu Ik(A).

**Datums-/Zeitbugs** (UTC statt lokaler Zeit — betraf alle Nutzer in Deutschland zwischen 00:00–02:00 Uhr)
- Dashboard, Stundenbuch, Wartungsprotokoll, Wissensdatenbank: `new Date().toISOString()` lieferte in den ersten Stunden nach Mitternacht/Monatswechsel den falschen Vortag/-monat (überfällige Prüfprotokolle wurden nicht als abgelaufen gezählt, Monats-Stundenwidget zeigte Vormonats-Werte).
- Wartungsprotokoll `addMonate()`: Monatsend-Daten (29./30./31.) liefen durch JS-`setMonth`-Überlauf in den übernächsten Monat statt korrekt zu clampen.
- Stundenbuch `calcNetto()`: Schichten über Mitternacht (Notdienst) ergaben 0 Minuten statt der tatsächlichen Dauer.

**State-/Formular-Bugs**
- Stundenbuch, KNXPlaner: Formulare ohne `key`-Remount behielten beim direkten Wechsel des Bearbeitungsziels den alten State und konnten fremde Einträge überschreiben.
- Stundenbuch `timerStoppen()`: befüllte nicht alle Felder (id/pause fehlten) → NaN in Netto-Stunden nach dem Speichern.
- Verteilerplaner `geheZuFIPlanung()`: überschrieb bei jedem Schritt-3→4-Wechsel die komplette FI-Konfiguration und verwarf dabei manuelle Anpassungen; berechnet jetzt nur noch beim ersten Mal automatisch.
- Wissensdatenbank: "Neuer Artikel"-Titel wurde nie angezeigt (Bedingung war für jeden frischen Artikel bereits wahr).
- KNXPlaner `raumLoeschen()`: räumte die Checkliste nicht auf (verwaiste Einträge verfälschten den Fortschritt dauerhaft), `aktEtage` wurde nicht zurückgesetzt.

**Sonstiges**
- KI-Analyse-Fehler beim PDF/Foto-Import im Verteilerplaner zeigte keine Fehlermeldung und keinen Retry-Button.
- Wissensdatenbank: Inline-Markdown-Regex interpretierte einzelne `*` (z.B. Multiplikation in Formeln) fälschlich als Kursiv-Markup.
- CSV-Exports (KNXPlaner, Stundenbuch) escapen jetzt Semikolons/Anführungszeichen und verhindern Formula-Injection.
- KNXPlaner: GA-Felder erzwingen jetzt Ganzzahligkeit, KNX-Rechner validiert Bereich/Linie/Gerät und Dezimal-Eingabe.
- Materialzaehler/Wartungsprotokoll zeigen jetzt `config.firma`/`config.mitarbeiter` auf Ausdrucken (vorher stillschweigend ignoriert); Verteilerplaner erhält jetzt die globale Firmenkonfiguration als Fallback.
- Verteilerplaner: fehlender Zurück-Button im Startbildschirm ergänzt; toter "Datenbank einrichten"-Link und weitere Supabase-Migrationsreste entfernt.
- localStorage-Schreibfehler (Verteilerplaner: Projekte/Einstellungen/API-Config) brachen den Speichervorgang bisher lautlos ab — zeigen jetzt eine Fehler-Toast.
- `eslint.config.js` ignorierte das mitgelieferte WordPress-Bundle nicht, wodurch `npm run lint` ~984 Fake-Fehler aus dem minifizierten Code zeigte statt echten Source-Problemen.

**Aufräumarbeiten**
- `src/lib/supabase.js` und `src/lib/db.js` komplett entfernt (vollständig unbenutzte Migrationsreste).
- `uid()` nutzt jetzt `crypto.randomUUID()` statt reinem `Math.random()` — verhindert seltene ID-Kollisionen (verwaiste/überschriebene Einträge bei schnell aufeinanderfolgenden Speichervorgängen).
- `wordpress-plugin/package.json` fehlten `xlsx` und `mammoth`, obwohl der Verteilerplaner sie dynamisch importiert — der Build funktionierte bisher nur zufällig über einen Parent-node_modules-Fallback.
- 14 neue Unit-Tests für die neue Zs/Ik- und `gesamtStatus()`-Logik in `vde.js` (insgesamt jetzt 40 Tests).

---

## [2026.7.0] – 2026-07-30

### 💥 Breaking — Supabase komplett entfernt

- **localStorage ist jetzt die einzige Speichermethode** — keine externe Datenbankverbindung mehr nötig
- Alle `db_*.js`-Layer (db.js, db_stundenbuch.js, db_pruefprotokoll.js, db_wissen.js, db_wartung.js, db_materialzaehler.js, db_knx.js) auf localStorage-only umgestellt
- `src/lib/supabase.js` ist jetzt ein leeres Stub (kein `@supabase/supabase-js`-Import mehr)
- `@supabase/supabase-js` aus beiden `package.json` entfernt
- **Dashboard**: Supabase-Ping-Indikator entfernt, Supabase URL/Key aus den Konfig-Feldern entfernt
- **WP-Plugin**: Supabase-Felder aus der Admin-Einstellungsseite entfernt, keine Credentials mehr im `wp_localize_script`
- **Wissensdatenbank**: „nur lokal"-Hinweis entfernt (Supabase-Warnung ist nicht mehr relevant)

### ✨ Neu — Verteilerplaner: Datei-Import ohne KI (Excel & Word)

- **Excel (.xlsx/.xls)**: Wird sofort beim Hochladen eingelesen — kein KI-Server nötig
  - Automatische Spaltenerkennung: Bezeichnung, Raum, Stockwerk, Kabeltyp, Adern, Querschnitt
  - Fallback: erste Spalte = Bezeichnung, Rest mit Standardwerten
- **Word (.docx)**: Text wird sofort extrahiert — jede Zeile = ein Kabel, Format `3x2,5` wird erkannt
- Optionaler „🤖 Mit KI verfeinern"-Button für bessere Zuordnung nach manuellem Einlesen
- **PDF & Bilder**: weiterhin KI erforderlich (Anthropic API)

### ✨ Neu — Verteilerplaner: Datei-Import (aus vorheriger Version)

- Neuer `DateiImportModal` für PDF/Excel/Word/Fotos (Button in Header + Kabelbereich)
- PDF: Anthropic Document API · Excel: SheetJS → CSV · Word: mammoth

### 🐛 Bugfixes

- **Verteilerplaner**: stale-closure in `autoSpeichere`-useCallback entfernt — Auto-Save läuft jetzt direkt in `generiere()` mit dem frisch berechneten Plan (Plan wurde vorher immer als `null` gespeichert)
- **Dashboard Backup-Export**: 5 fehlende localStorage-Keys ergänzt (`stundenbuch_projekte`, `ui_theme`, `elektronikertools_zuletzt`, `vp_settings`, `vp_api_config`)
- **Wartungsprotokoll**: fehlende `config`-Prop mit Default `{ config = {} }` ergänzt (Dashboard-Crash behoben)
- **KNXPlaner**: alle async-Mutationen mit try-catch + Toast-Fehlermeldungen umschlossen (`handleSave`, `handleDelete`, `raumSpeichern`, `raumLoeschen`, `gaZuweisen`, `addVorlage`, `addItem`, `toggleItem`, `deleteItem`)

### 🔢 Version

- Alle Apps auf `2026.7` hochgezogen (Verteilerplaner, Stundenbuch, Prüfprotokoll, Wissensdatenbank)
- `package.json` und WordPress-Plugin auf `2026.7.0`

---

## [2026.4.2] – 2026-07-30

### ✨ Neu — Verteilerplaner: Datei-Import (PDF / Excel / Word)

- **Neuer Button** „📂 PDF / Excel / Word importieren" in Kabelbereich und Header-Toolbar
- **PDF** (nur Anthropic API): Nativ-Verarbeitung via Anthropic Document API — kein Parsen nötig
- **Excel** (.xlsx / .xls): Alle Blätter werden per SheetJS in CSV konvertiert und zur KI gesendet
- **Word** (.docx): Textextraktion via `mammoth`, anschließend KI-Analyse
- **Bilder**: Auch im Datei-Modal weiterhin unterstützt (gleicher Pfad wie bestehender Foto-Import)
- **`DateiImportModal`**: Neue Komponente mit Drag & Drop, Dateitypanzeige und identischer Ergebnisansicht wie beim Foto-Import
- **`KABEL_PROMPT`**: Kabel-Erkennungsprompt als gemeinsame Konstante ausgelagert (kein Duplikat mehr)
- Beide Bundles neu gebaut: Standalone (`dist/`) und WordPress (`wordpress-plugin/assets/`)

---

## [2026.4.1] – 2026-07-02

### ✨ Neu — WordPress Plugin

- **`wordpress-plugin/`**: Vollständiges WordPress-Plugin (`elektronikertools.php` + Admin-Einstellungsseite)
- **Shortcode** `[elektronikertools]` bettet die komplette React-App in jede WP-Seite ein
- **WP-Einstellungsseite** (Einstellungen → Elektronikertools) für Supabase URL + Key — werden zur Laufzeit per `wp_localize_script` an die App übergeben, kein Rebuild nötig
- **Scoped CSS** (`wp-src/wp-index.css`): CSS-Variablen auf `#elektronikertools-root` statt auf `:root` — WP-Theme bleibt unberührt
- **ESM-Support**: `type="module"` wird via `script_loader_tag`-Filter automatisch gesetzt
- **Einzel-Bundle** (kein Code-Splitting): `inlineDynamicImports: true` — jsPDF und andere dynamische Imports werden eingebettet, keine Chunk-URL-Probleme in WP
- **Build-Skript**: `npm run build:wp` im Plugin-Verzeichnis erzeugt `assets/elektronikertools.js` (1.6 MB / 449 KB gzip) und `assets/elektronikertools.css`
- **Fertige Assets** direkt im Repo enthalten — kein Node.js für die Installation nötig
- **Rückwärtskompatibel**: Standalone-App (`dist/`) und WP-Plugin können aus demselben Quellcode gebaut werden

### 🐛 Bugfixes

- **`src/Materialzaehler.jsx`**: Doppeltes `color`-Property im `<input>`-Inline-Style entfernt (ESBuild-Fehler)

### 🔧 Refactoring (Quelle, abwärtskompatibel)

- **`src/main.jsx`**: Unterstützt jetzt beide Root-IDs (`#elektronikertools-root` und `#root`); Service Worker im WP-Modus deaktiviert
- **`src/lib/supabase.js`**: Liest Supabase-Credentials auch aus `window.elektrotools_config` (WP-Laufzeitkonfig)
- **`src/Dashboard.jsx`**: Theme-Attribut wird auf `#elektronikertools-root` gesetzt (WP) oder `<html>` (Standalone)

---

## [2026.4.0] – 2026-07-02

### ✨ Neu — Materialzähler (neue App)

- **Projektbasiert**: Mehrere Projekte anlegen mit Name, Ort und Notiz
- **Positionen erfassen**: Steckdosen, Schalter, Dimmer, Rahmen, Dosen & Gehäuse, Sonstiges — mit Schnellauswahl für gängige Artikel
- **Mengen verwalten**: Benötigte Menge und bestellte Menge direkt in der Liste editierbar
- **Status-Anzeige**: Offen / Teils bestellt / Bestellt ✓ je Position, Fortschrittsbalken pro Projekt
- **Filter & Suche**: Nach Kategorie filtern oder Freitextsuche über Bezeichnung/Notiz
- **Drucken**: Druckansicht mit Materialliste gruppiert nach Kategorie
- **Supabase-Sync**: `materialzaehler_projekte`-Tabelle mit localStorage-Fallback, Positionen als JSONB
- **Backup integriert**: Key `elektronikertools_materialzaehler` in globalem Backup
- App-Farbe: `#84cc16` (lime)

### 🐛 Bugfixes

- **vde.js**: Null-Guard in `evalStromkreis()` und `risoMin()` — kein Crash mehr wenn `sk` undefined ist

---

## [2026.3.5] – 2026-03-09

### 🐛 Bugfix — Verteilerplaner Header & Light-Mode

- **Doppelter Header entfernt**: TopBar wird im Verteilerplaner nicht mehr aus Dashboard gerendert — der Verteilerplaner hat seinen eigenen vollständigen Header
- **← Zurück-Button** wieder im Verteilerplaner-Header (links, vor dem Logo)
- **☀️/🌙 Theme-Toggle** direkt im Verteilerplaner-Header (rechts, neben 🐛) — kein Wechsel ins Dashboard nötig
- **Light-Mode schwarze Flächen behoben**: Alle Modal-Overlays (`rgba(10,12,14,...)`) durch theme-neutrale `rgba(0,0,0,0.55/0.65)` ersetzt
- **Start-Screen Light-Mode**: Innerer Container bekommt `var(--bg2)` Hintergrund statt transparentem Overlay

---

## [2026.3.4] – 2026-03-09

### ✨ Neu — KNX-Planer (neue App)

- **GA-Planer**: Gruppenadresse anlegen (HG 0–31 / MG 0–7 / UG 0–255), Funktion, DPT, Raum-Zuweisung, Notiz — sortierte Liste nach Adresse, Filter nach Funktion / HG / Suche, CSV-Export (ETS-kompatibel)
- **Raumplan**: Räume nach Etage anlegen (Name, Etage, Typ), GA-Chips per Raum, direkte Zuweisung/Entfernung, nach Neuerstellung direkt auf richtigen Etagen-Tab springen
- **Inbetriebnahme-Checkliste**: Vorlagen-Templates (Licht, Dimmen, Jalousie, Heizung, Szene, Allgemein), eigene Prüfpunkte, Gesamt- und Raum-Fortschrittsbalken
- **KNX-Rechner**: Physikalische Adresse (Bereich.Linie.Gerät → Dez/Hex/Binär), GA↔Dezimal-Umrechnung, Projekt-Statistik, DPT-Kurzreferenz
- localStorage-Datenspeicherung mit Supabase-Fallback (`knx_gruppen`, `knx_raeume`, `knx_checkliste`)
- App-Farbe: `#e11d48` (rose-red, KNX-Branding), KNX-Daten in globalem Backup integriert

### ✨ Neu — Roadmap-Features

**🌙 Dark-/Light-Mode Umschalter**
- Toggle-Button oben rechts im Dashboard und in der TopBar jeder App
- Einstellung persistent in `localStorage`, beim Start sofort angewendet
- Vollständiges Light-Mode-Farbschema via `[data-theme="light"]` in `index.css`

**🐛 Fehler melden / Verbesserung vorschlagen**
- Link-Button im Dashboard-Footer und 🐛-Icon in jeder App-TopBar
- Öffnet direkt `https://github.com/Jedrimos/E-tools/issues/new` in neuem Tab

**📧 Tagesbericht per E-Mail (Stundenbuch)**
- Button „📧 E-Mail" im Tagesbericht-Modal
- `mailto:` mit vorausgefülltem Betreff (Datum, Mitarbeiter) und allen Einträgen als Tabelle

**📋 Projektliste verwalten (Stundenbuch)**
- Button „📋 Projekte" in der Toolbar öffnet Mini-Modal
- Feste Projekte anlegen/löschen (`stundenbuch_projekte`), erscheinen als Vorschläge im Eintrag-Formular

### 🐛 Bugfixes KNX-Planer

- Kyrillisches `м` in `aktRaумId` → korrektes ASCII `aktRaumId`
- `csvExport()` mutierte React-State via `.sort()` → `[...gaListe].sort()`
- `URL.revokeObjectURL()` nach CSV-Download ergänzt (Memory-Leak)
- `GAForm`: `useEffect` synct Formular-State beim GA-Wechsel (stale prop)
- Sequentielle `await`-Schleifen → `Promise.all` (Vorlagen, Raum löschen)
- Etagen-Tab-Filter: widersprüchliche `|| raeume.length===0`-Bedingung entfernt
- `byFunk`: O(n×m) → O(n) Single-Pass `reduce`
- `useMemo` für `gefiltert`, `grouped`, `hgListe`, `raumMap`
- Leer-Zustand "Keine Ergebnisse" bei aktivem Filter
- Doppelter Filter für unassigned GAs auf Variable extrahiert
- `uid()` in `db_knx.js` und `KNXPlaner.jsx` → zentrales `src/lib/utils.js`

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
