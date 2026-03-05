# Setup & Installation

## Lokale Entwicklung

```bash
git clone <repo-url>
cd elektronikertools
npm install
npm run dev        # http://localhost:5173
npm run build      # Produktions-Build → dist/
```

**Node.js 18+** wird benötigt.

---

## Coolify Deployment

1. **Coolify** → *New Resource* → *Public Repository* → URL eintragen
2. Build-Einstellungen:
   - Build Pack: **Nixpacks**
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Port: `80`
3. *Deploy* klicken

Ohne Umgebungsvariablen funktioniert die App mit `localStorage` – keine Datenbank nötig.

---

## Supabase

Die Datenbank ist **optional**. Ohne Supabase-Konfiguration speichern alle Apps im Browser-`localStorage`.

### Supabase Self-Hosted (empfohlen)

1. **Coolify** → *New Resource* → *Service* → **Supabase** → deployen
2. *Settings → API*: Project URL und anon key kopieren

### SQL-Schema einrichten

Im Supabase SQL-Editor den Inhalt von [`supabase.sql`](supabase.sql) ausführen.

Alternativ einzelne Tabellen selektiv anlegen — Kommentare im jeweiligen `src/lib/db_*.js` enthalten die benötigten SQL-Statements.

### Umgebungsvariablen setzen

In Coolify unter *Environment Variables*:

```
VITE_SUPABASE_URL=https://supabase.deine-domain.de
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

Danach App neu deployen.

### Supabase Cloud (alternative)

Kostenloses Tier auf [supabase.com](https://supabase.com) – gleiche Konfiguration, nur andere URL.

---

## Einstellungen in der App

Über das **⚙ Einstellungen**-Symbol im Dashboard können Supabase-URL und Key auch direkt in der App eingetragen werden. Diese werden dann im `localStorage` gespeichert und beim nächsten Start automatisch genutzt.

> **Hinweis:** Umgebungsvariablen (`VITE_SUPABASE_*`) haben Priorität vor den App-Einstellungen.

---

## Aktualisierung

```bash
git pull
npm install      # falls neue Pakete
npm run build
```

Bei Coolify: neuen Commit pushen → auto-deploy.
