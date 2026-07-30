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

Die App braucht keine Umgebungsvariablen und keine Datenbank — alle Daten werden ausschließlich im Browser-`localStorage` gespeichert.

---

## Einstellungen in der App

Über das **⚙ Einstellungen**-Symbol im Dashboard lassen sich Firmenname, Mitarbeitername, Ort und Notizen hinterlegen. Diese werden im `localStorage` gespeichert und in CSV-Exports, Ausdrucken und Stücklisten aller Tools verwendet.

---

## Aktualisierung

```bash
git pull
npm install      # falls neue Pakete
npm run build
```

Bei Coolify: neuen Commit pushen → auto-deploy.
