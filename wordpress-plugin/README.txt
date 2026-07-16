=== Elektronikertools ===
Contributors:      Elektronikertools
Tags:              elektriker, elektrotechnik, verteilerplaner, stundenbuch, prüfprotokoll
Requires at least: 5.9
Tested up to:      6.8
Requires PHP:      7.4
Stable tag:        2026.4.0
License:           MIT

Browserbasierte Werkzeuge für Elektrofachkräfte — direkt im WordPress eingebettet.

== Beschreibung ==

Elektronikertools ist eine Sammlung von Werkzeugen für den Arbeitsalltag von
Elektrikern und Elektrotechnikern. Die App läuft direkt im Browser, benötigt
keine separate Installation und lässt sich per Shortcode in jede WordPress-Seite
einbetten.

**Enthaltene Tools:**

* ⚡ **Verteilerplaner** — Elektroverteiler planen, Sicherungen verwalten, Klemmenleisten, Stückliste
* ⏱ **Stundenbuch** — Arbeitszeiten erfassen, Timer, Monatsdiagramm, CSV-Export
* 📋 **Prüfprotokoll** — VDE-Messungen (Riso, FI, PE), automatische Grenzwertbewertung, PDF-Export
* 📚 **Wissensdatenbank** — Firmeninternes Wissen, Markdown, Team-Sharing via Supabase
* 🔧 **Wartungsprotokoll** — E-Check, Blitzschutz, Notbeleuchtung, Intervalle, Fälligkeiten
* ⚡ **Elektrorechner** — Leitungsberechnung, Strom/Leistung, Motorstrom, cos φ, Formelreferenz
* 🏡 **KNX-Planer** — Gruppenadress-Planer, Raumplan, Inbetriebnahme-Checkliste, Rechner
* 🔌 **Materialzähler** — Steckdosen, Schalter, Dimmer, Rahmen zählen und Bestellmengen verwalten

**Datenspeicherung:**
* Standard: `localStorage` im Browser — kein Server nötig
* Optional: Supabase — Daten in eigener Datenbank, Multi-Gerät, Team-Sharing

== Installation ==

= Variante A: Fertige ZIP (empfohlen) =

1. ZIP-Datei bei GitHub Releases herunterladen
2. In WordPress: Plugins → Neu hinzufügen → Plugin hochladen
3. Plugin aktivieren
4. Shortcode `[elektronikertools]` in eine Seite einfügen

= Variante B: Aus Quellcode bauen =

Voraussetzung: Node.js ≥ 18

1. Plugin-Verzeichnis ins WordPress-Plugins-Verzeichnis kopieren:
   `wp-content/plugins/elektronikertools/`
2. Im Plugin-Verzeichnis ausführen:
   ```
   npm install
   npm run build:wp
   ```
3. Plugin in WordPress aktivieren
4. Shortcode in eine Seite einfügen

== Verwendung ==

Shortcode in Seite oder Beitrag einfügen:

  [elektronikertools]

Optionale Parameter:

  [elektronikertools hoehe="100vh"]        Mindesthöhe des Containers
  [elektronikertools klasse="meine-css"]   Zusätzliche CSS-Klasse

== Supabase (optional) ==

Für Team-Sharing und geräteübergreifende Datenspeicherung:

1. Kostenloses Konto bei supabase.com anlegen
2. Neues Projekt erstellen
3. Im SQL-Editor das Schema aus `docs/supabase.sql` ausführen
4. In WordPress: Einstellungen → Elektronikertools
5. Supabase URL und Anon Key eintragen
6. Speichern

Ohne Supabase-Konfiguration läuft alles lokal im Browser (localStorage).

== Changelog ==

= 2026.4.0 =
* Neue App: Materialzähler (Steckdosen, Schalter, Rahmen etc. pro Projekt zählen)
* Bugfix: Null-Guard in vde.js (evalStromkreis, risoMin)
* WordPress Plugin initial erstellt

= 2026.3.6 =
* KNX-Planer App
* Elektrorechner
* Wartungsprotokoll

== Häufige Fragen ==

= Werden Daten in der WordPress-Datenbank gespeichert? =

Nein. Daten werden im Browser-LocalStorage gespeichert (Standard) oder optional
in einer Supabase-Datenbank (eigenes Konto erforderlich).

= Funktioniert die App auf Mobilgeräten? =

Ja. Die App ist für Desktop, Tablet und Mobilgerät optimiert.

= Kann ich mehrere Installationen der App auf einer Website haben? =

Nein, nur eine Instanz pro Seite. Verwende den Shortcode auf einer dedizierten
"Werkzeuge"-Seite.

= Wo finde ich das SQL-Schema für Supabase? =

Bei Installation aus dem Quellcode liegt die Datei unter
`wordpress-plugin/docs/supabase.sql`. Bei der fertigen ZIP-Version ist sie
ebenfalls enthalten.
