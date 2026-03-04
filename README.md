# ⚡ SVP Sicherungsplan – Der smarte Belegungsplaner für Elektroinstallationen

> Schluss mit handgezeichneten Skizzen und Excel-Tabellen. Plane deine Unterverteilung professionell – direkt im Browser, ohne Installation, ohne Einarbeitung.

---

## Was ist SVP Sicherungsplan?

SVP Sicherungsplan ist ein webbasiertes Tool für Elektriker, Elektrotechniker und versierte Heimwerker, das den gesamten Planungsprozess einer Unterverteilung in einem einzigen, durchdachten Workflow abbildet – von der ersten Kabelerfassung bis zur fertigen Stückliste.

Kein Backend. Keine Cloud. Keine monatlichen Kosten. Einfach öffnen und loslegen.

---

## Features auf einen Blick

### 📋 Geführter 5-Schritte-Workflow
Von Projektdaten bis zum fertigen Belegungsplan – strukturiert, übersichtlich, fehlerfrei.

### 🔌 Intelligente Kabelerfassung
Erfasse Kabel mit Typ, Querschnitt, Adernzahl, Raum und Stockwerk. Drag & Drop Sortierung inklusive. Oder überspring die Tipparbeit komplett:

### 📸 KI-gestützter Foto-Import
Fotografiere deine handgeschriebene Kabelliste – die KI erkennt automatisch alle Einträge und überführt sie ins System. Kompatibel mit Anthropic Claude, OpenAI GPT-4o und lokalen Modellen via Ollama oder LM Studio.

### ⚡ Automatische FI-Planung
Das Tool berechnet selbstständig, wie viele FI-Schutzschalter du benötigst und verteilt die Sicherungsgruppen optimal auf die verfügbaren Teilungseinheiten.

### 🎯 Drag & Drop Belegungsplan
Verschiebe Sicherungen zwischen FI-Gruppen per Drag & Drop. Visuell oder als Tabelle – du entscheidest.

### 🔧 FILS-Unterstützung
FI/LS-Kombinationsschalter werden vollständig unterstützt und separat ausgewiesen.

### 🔩 Klemmenleisten-Visualisierung
Sieh auf einen Blick, wie deine Reihenklemmenleiste aufgebaut sein wird – inklusive PE-Einspeiseklemmen, N-Klemmen, Abdeckkappen und optionaler KNX-Reserveklemme.

### 📊 Automatische Stückliste
Alle benötigten Bauteile werden automatisch gezählt und als Stückliste ausgegeben – inklusive Querverbinder und N-Brücken. Export per WhatsApp-Clipboard oder Druck.

### 🏷️ Beschriftungsplan
Generiere sofort einen druckfertigen Beschriftungsplan mit Q- und F-Nummern für jede Sicherung.

### 💾 Projekte speichern & laden
Alle Projekte werden lokal gespeichert. Kein Account, kein Login, keine Datenweitergabe.

### ↩️ Undo-Funktion
Kabel oder Sicherungen versehentlich gelöscht? Strg+Z macht es rückgängig.

---

## Unterstützte Sicherungstypen

| Typ | Beschreibung |
|-----|-------------|
| B6 – B32 | Standard-LSS 1-polig |
| C16 – C25 | C-Charakteristik 1-polig |
| B16 3P – B63 3P | Drehstrom-LSS 3-polig |
| FILS | FI/LS-Kombination mit konfigurierbarem FI |

### FI-Schutzschalter
- Bemessungsströme: 25A, 40A, 63A
- Typen: AC, A, F, B
- Fehlerströme: 10, 30, 100, 300, 500 mA
- 2-polig und 4-polig

---

## Kabeltypen & Querschnitte

**Typen:** NYM-J · NYY-J · H07V-K · LIYY

**Querschnitte:** 1,5 · 2,5 · 4 · 6 · 10 · 16 mm²

**Adernzahlen:** 3, 5, 7, 10 (und custom)

---

## Schnellstart

```bash
# Repository klonen
git clone https://github.com/Jedrimos/sicherungsplaner.git
cd sicherungsplaner

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build
```

Öffne dann `http://localhost:5173` im Browser.

---

## Tech Stack

- **React** mit Hooks
- **Vite** als Build-Tool
- **Reines CSS-in-JS** – keine externen UI-Bibliotheken, keine Abhängigkeiten außer React
- **localStorage** für Projektpersistenz
- **Anthropic Claude API** (optional) für KI-Foto-Import – auch kompatibel mit OpenAI und lokalen Modellen

---

## KI-Foto-Import einrichten (optional)

Unter dem ⚙️-Symbol in der Kopfzeile kannst du die API konfigurieren:

| Anbieter | Endpoint | Modell |
|----------|----------|--------|
| Anthropic Claude | `https://api.anthropic.com/v1/messages` | `claude-sonnet-4-20250514` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o` |
| Ollama (lokal) | `http://localhost:11434/v1/chat/completions` | `llava` |
| LM Studio | `http://localhost:1234/v1/chat/completions` | `llava` |

Für die lokale Nutzung ohne API-Key ist Ollama mit LLaVA empfohlen.

---

## Roadmap

- [ ] PDF-Export des Belegungsplans
- [ ] Mehrsprachigkeit (EN)
- [ ] Klemmensystem wählbar (Phoenix Contact / Weidmüller / WAGO)
- [ ] N-Brückenlängenberechnung
- [ ] Projektversionierung / Änderungshistorie
- [ ] Mehrbenutzerfähigkeit für Teams

---

## Mitmachen

Pull Requests sind willkommen. Für größere Änderungen bitte zuerst ein Issue öffnen.

1. Fork erstellen
2. Feature-Branch anlegen (`git checkout -b feature/mein-feature`)
3. Committen (`git commit -m 'Add: mein Feature'`)
4. Pushen (`git push origin feature/mein-feature`)
5. Pull Request öffnen

---

## Lizenz

MIT License – mach damit was du willst, aber behalte den Copyright-Hinweis.

---

## Über SVP Elektrotechnik

Dieses Tool entstand aus dem Bedarf heraus, die tägliche Planungsarbeit im Elektrohandwerk zu vereinfachen. Kein Papier, kein Excel, kein Herumrechnen – sondern ein Tool, das mitdenkt.

---

*Gebaut mit ❤️ für alle, die Strom respektieren.*
