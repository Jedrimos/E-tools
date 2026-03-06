import React, { useState, useEffect, useMemo } from "react";
import Toast, { useToasts } from "./components/Toast.jsx";
import { loadWissenDB, saveArtikelDB, deleteArtikelDB } from "./lib/db_wissen.js";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { uid } from "./lib/utils.js";

const LS_KEY = "elektronikertools_wissen";
function load() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function save(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)); }

const TEAL = "#06b6d4";

const KATEGORIEN = [
  "Allgemein",
  "Wechselrichter / PV",
  "Verteiler / Schaltanlagen",
  "FI / RCD / Schutzeinrichtungen",
  "VDE-Normen & Vorschriften",
  "Montagetipps & Tricks",
  "Hersteller & Produkte",
  "Werkzeuge & Messgeräte",
  "Recht & Gewährleistung",
  "Sonstiges",
];

const mkArtikel = (autor = "") => ({
  id:        uid(),
  db_id:     null,
  titel:     "",
  kategorie: "Allgemein",
  inhalt:    "",
  tags:      [],
  autor,
  erstellt:  new Date().toISOString().slice(0, 10),
});

// ── Einfacher Markdown-Renderer ───────────────────────────────────────────────
function InlineText({ text }) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, key = 0, m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={key++} style={{ color: "var(--text)" }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={key++} style={{ background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, fontSize: "0.88em", fontFamily: "var(--mono)", color: TEAL }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("# "))  { out.push(<h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "20px 0 8px 0", lineHeight: 1.3 }}><InlineText text={l.slice(2)} /></h2>); }
    else if (l.startsWith("## ")) { out.push(<h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "16px 0 6px 0" }}><InlineText text={l.slice(3)} /></h3>); }
    else if (l.startsWith("### ")) { out.push(<h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: TEAL, margin: "12px 0 4px 0" }}><InlineText text={l.slice(4)} /></h4>); }
    else if (l.startsWith("- ") || l.startsWith("* ")) { out.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: TEAL, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ lineHeight: 1.6 }}><InlineText text={l.slice(2)} /></span></div>); }
    else if (/^\d+\. /.test(l)) {
      const m = l.match(/^(\d+)\. (.*)/);
      out.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: TEAL, flexShrink: 0, minWidth: 18 }}>{m[1]}.</span><span style={{ lineHeight: 1.6 }}><InlineText text={m[2]} /></span></div>);
    }
    else if (l.startsWith("> ")) { out.push(<div key={i} style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 12, margin: "8px 0", color: "var(--text2)", fontStyle: "italic", lineHeight: 1.6 }}><InlineText text={l.slice(2)} /></div>); }
    else if (l.startsWith("---") || l.startsWith("===")) { out.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />); }
    else if (l.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      out.push(<pre key={i} style={{ background: "var(--bg3)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--text2)", overflowX: "auto", fontFamily: "var(--mono)", margin: "8px 0", lineHeight: 1.6 }}>{codeLines.join("\n")}</pre>);
    }
    else if (l.trim() === "") { out.push(<div key={i} style={{ height: 8 }} />); }
    else { out.push(<p key={i} style={{ margin: "0 0 6px", lineHeight: 1.7, color: "var(--text)" }}><InlineText text={l} /></p>); }
    i++;
  }
  return <div>{out}</div>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = (extra = {}) => ({
  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7,
  color: "var(--text)", padding: "8px 10px", fontSize: 13,
  fontFamily: "inherit", width: "100%", ...extra,
});

const bPrim = { background: TEAL, border: "none", color: "#000", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700 };
const bSec  = { background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12 };
const bDanger = { background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--red)", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12 };

// ── Tag-Chip ──────────────────────────────────────────────────────────────────
function Tag({ label }) {
  return <span style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}40`, color: TEAL, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{label}</span>;
}

// ── Kategorie-Badge ───────────────────────────────────────────────────────────
function KatBadge({ label }) {
  return <span style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", borderRadius: 5, padding: "2px 8px", fontSize: 11 }}>{label}</span>;
}

// ── Artikel-Editor ────────────────────────────────────────────────────────────
function ArtikelEditor({ artikel, onSave, onBack }) {
  const [a, setA] = useState(artikel);
  const [preview, setPreview] = useState(false);
  const [tagInput, setTagInput] = useState((artikel.tags || []).join(", "));

  function set(key, val) { setA(x => ({ ...x, [key]: val })); }

  function handleTagBlur() {
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    set("tags", tags);
  }

  const valid = a.titel.trim().length > 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button style={{ ...bSec, padding: "8px 12px" }} onClick={onBack}>← Zurück</button>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 16, color: "var(--text3)" }}>
          {artikel.db_id || artikel.id !== artikel.db_id ? "Artikel bearbeiten" : "Neuer Artikel"}
        </div>
        <button style={{ ...bSec }} onClick={() => setPreview(v => !v)}>
          {preview ? "✎ Bearbeiten" : "👁 Vorschau"}
        </button>
        <button style={{ ...bPrim, opacity: valid ? 1 : 0.4 }} disabled={!valid} onClick={() => onSave({ ...a, tags: tagInput.split(",").map(t => t.trim()).filter(Boolean) })}>
          Speichern
        </button>
      </div>

      {preview ? (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
            <KatBadge label={a.kategorie} />
            {a.tags.map(t => <Tag key={t} label={t} />)}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: "0 0 8px" }}>{a.titel || <span style={{ color: "var(--text3)" }}>Kein Titel</span>}</h1>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 24 }}>
            {a.autor && <>von {a.autor} · </>}{a.erstellt}
          </div>
          <Markdown text={a.inhalt} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600, marginBottom: 5 }}>Titel *</div>
                <input style={inp()} value={a.titel} onChange={e => set("titel", e.target.value)} placeholder="z.B. SMA Wechselrichter – Inbetriebnahme Checkliste" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600, marginBottom: 5 }}>Kategorie</div>
                <select style={{ ...inp(), appearance: "none" }} value={a.kategorie} onChange={e => set("kategorie", e.target.value)}>
                  {KATEGORIEN.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600, marginBottom: 5 }}>Tags (kommagetrennt)</div>
                <input style={inp()} value={tagInput} onChange={e => setTagInput(e.target.value)} onBlur={handleTagBlur} placeholder="SMA, Wechselrichter, PV, Checkliste" />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600, marginBottom: 5 }}>Autor</div>
                <input style={inp()} value={a.autor} onChange={e => set("autor", e.target.value)} placeholder="Name des Verfassers" />
              </div>
            </div>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 10 }}>
              <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>Inhalt (Markdown)</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>
                # Überschrift · ## Abschnitt · **fett** · *kursiv* · `code` · - Liste · &gt; Hinweis
              </div>
            </div>
            <textarea
              style={{ ...inp({ height: 420, resize: "vertical", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7 }) }}
              value={a.inhalt}
              onChange={e => set("inhalt", e.target.value)}
              placeholder={`# Inbetriebnahme SMA Sunny Boy\n\n## Voraussetzungen\n\n- Netzfreischaltung durch EVU bestätigt\n- Anlagenzertifikat liegt vor\n\n## Ablauf\n\n1. DC-Seite prüfen...\n\n> **Hinweis:** Immer VDE 0100-712 beachten!`}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={bSec} onClick={onBack}>Abbrechen</button>
            <button style={{ ...bPrim, opacity: valid ? 1 : 0.4 }} disabled={!valid}
              onClick={() => onSave({ ...a, tags: tagInput.split(",").map(t => t.trim()).filter(Boolean) })}>
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Artikel-Lese-Ansicht ──────────────────────────────────────────────────────
function ArtikelView({ artikel, onBack, onEdit, onDelete }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button style={{ ...bSec, padding: "8px 12px" }} onClick={onBack}>← Zurück</button>
        <div style={{ flex: 1 }} />
        <button style={bSec} onClick={onEdit}>✎ Bearbeiten</button>
        <button style={bDanger} onClick={onDelete}>✕ Löschen</button>
      </div>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 28 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <KatBadge label={artikel.kategorie} />
          {(artikel.tags || []).map(t => <Tag key={t} label={t} />)}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.3 }}>{artikel.titel}</h1>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 28 }}>
          {artikel.autor && <>✍ {artikel.autor} · </>}📅 {artikel.erstellt}
          {artikel.db_id && <span style={{ marginLeft: 8, color: "var(--text3)" }}>☁ Synced</span>}
        </div>
        <Markdown text={artikel.inhalt} />
      </div>
    </div>
  );
}

// ── Artikel-Liste ─────────────────────────────────────────────────────────────
function ArtikelListe({ artikel, onOpen, onNew, dbSync, dbRequired }) {
  const [suche, setSuche] = useState("");
  const [kat, setKat] = useState("Alle");

  const gefiltert = useMemo(() => {
    const q = suche.toLowerCase();
    return artikel.filter(a => {
      const katOk = kat === "Alle" || a.kategorie === kat;
      const sOk = !q || a.titel.toLowerCase().includes(q)
        || a.inhalt.toLowerCase().includes(q)
        || (a.tags || []).some(t => t.toLowerCase().includes(q))
        || (a.autor || "").toLowerCase().includes(q);
      return katOk && sOk;
    });
  }, [artikel, suche, kat]);

  const kategorienMitAnzahl = useMemo(() => {
    const counts = {};
    artikel.forEach(a => { counts[a.kategorie] = (counts[a.kategorie] || 0) + 1; });
    return counts;
  }, [artikel]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Wissensdatenbank</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Firmenwissen · {artikel.length} Artikel</div>
        </div>
        <div style={{ flex: 1 }} />
        {dbSync && <span style={{ fontSize: 11, color: TEAL, background: `${TEAL}15`, border: `1px solid ${TEAL}30`, borderRadius: 6, padding: "3px 8px", alignSelf: "center" }}>☁ Geteilt im Team</span>}
        {!dbSync && dbRequired && (
          <span style={{ fontSize: 11, color: "var(--red)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 6, padding: "3px 8px", alignSelf: "center" }}>
            ⚠ Supabase nicht konfiguriert – nur lokal
          </span>
        )}
        <button style={bPrim} onClick={onNew}>+ Neuer Artikel</button>
      </div>

      {/* Suche + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{ ...inp({ flex: 1, minWidth: 200 }) }}
          value={suche} onChange={e => setSuche(e.target.value)}
          placeholder="🔍 Suche in Titel, Inhalt, Tags, Autor …"
        />
        <select style={{ ...inp({ appearance: "none", width: "auto", minWidth: 160 }), appearance: "none" }} value={kat} onChange={e => setKat(e.target.value)}>
          <option value="Alle">Alle Kategorien</option>
          {KATEGORIEN.filter(k => kategorienMitAnzahl[k]).map(k => (
            <option key={k} value={k}>{k} ({kategorienMitAnzahl[k]})</option>
          ))}
        </select>
      </div>

      {/* Leerer Zustand */}
      {artikel.length === 0 ? (
        <div style={{ background: "var(--bg2)", border: "1px dashed var(--border2)", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <div style={{ color: "var(--text3)", fontSize: 14, marginBottom: 16 }}>
            Die Wissensdatenbank ist noch leer.
          </div>
          <button style={bPrim} onClick={onNew}>Ersten Artikel anlegen</button>
        </div>
      ) : gefiltert.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: "40px 0" }}>
          Keine Artikel für „{suche || kat}" gefunden.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {gefiltert.map(a => (
            <div
              key={a.id}
              onClick={() => onOpen(a)}
              style={{
                background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12,
                padding: 16, cursor: "pointer", transition: "border-color 0.15s, transform 0.1s",
                display: "flex", flexDirection: "column", gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL + "60"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <KatBadge label={a.kategorie} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1.4 }}>{a.titel}</div>
              {a.inhalt && (
                <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {a.inhalt.replace(/[#*`>\-]/g, "").slice(0, 160)}
                </div>
              )}
              {(a.tags || []).length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: "auto" }}>
                  {a.tags.slice(0, 4).map(t => <Tag key={t} label={t} />)}
                  {a.tags.length > 4 && <span style={{ fontSize: 11, color: "var(--text3)" }}>+{a.tags.length - 4}</span>}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 8 }}>
                {a.autor && <span>✍ {a.autor}</span>}
                <span>📅 {a.erstellt}</span>
                {a.db_id && <span style={{ color: TEAL }}>☁</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function Wissensdatenbank({ config = {} }) {
  const [artikel, setArtikelLive] = useState(load);
  const [ansicht, setAnsicht] = useState({ typ: "liste" }); // liste | lesen | bearbeiten
  const [dbSync, setDbSync] = useState(false);
  const { toasts, addToast } = useToasts();

  // Beim Start: Supabase laden
  useEffect(() => {
    loadWissenDB()
      .then(data => {
        if (data) { setArtikelLive(data); save(data); setDbSync(true); }
      })
      .catch(() => {});
  }, []);

  function setArtikel(fn) {
    setArtikelLive(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(next);
      return next;
    });
  }

  function handleNew() {
    setAnsicht({ typ: "bearbeiten", artikel: mkArtikel(config?.mitarbeiter || "") });
  }

  async function handleSave(a) {
    setArtikel(prev => {
      const exists = prev.find(x => x.id === a.id);
      return exists ? prev.map(x => x.id === a.id ? a : x) : [a, ...prev];
    });
    addToast("Artikel gespeichert ✓");
    setAnsicht({ typ: "lesen", artikel: a });
    try {
      const saved = await saveArtikelDB(a);
      if (saved) {
        setArtikel(prev => prev.map(x => x.id === a.id ? { ...x, db_id: saved.db_id } : x));
        setAnsicht(v => v.typ === "lesen" && v.artikel.id === a.id ? { typ: "lesen", artikel: { ...v.artikel, db_id: saved.db_id } } : v);
        if (!dbSync) setDbSync(true);
      }
    } catch (e) {
      addToast("DB-Sync fehlgeschlagen: " + e.message, "error");
    }
  }

  async function handleDelete(id) {
    const a = artikel.find(x => x.id === id);
    if (!confirm(`"${a?.titel || "Artikel"}" wirklich löschen?`)) return;
    setArtikel(prev => prev.filter(x => x.id !== id));
    addToast("Artikel gelöscht", "error");
    setAnsicht({ typ: "liste" });
    if (a?.db_id) {
      try { await deleteArtikelDB(a.db_id); } catch (_) {}
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {ansicht.typ === "liste" && (
        <ArtikelListe
          artikel={artikel}
          onOpen={a => setAnsicht({ typ: "lesen", artikel: a })}
          onNew={handleNew}
          dbSync={dbSync}
          dbRequired={isSupabaseConfigured()}
        />
      )}
      {ansicht.typ === "lesen" && (
        <ArtikelView
          artikel={ansicht.artikel}
          onBack={() => setAnsicht({ typ: "liste" })}
          onEdit={() => setAnsicht({ typ: "bearbeiten", artikel: ansicht.artikel })}
          onDelete={() => handleDelete(ansicht.artikel.id)}
        />
      )}
      {ansicht.typ === "bearbeiten" && (
        <ArtikelEditor
          artikel={ansicht.artikel}
          onSave={handleSave}
          onBack={() => setAnsicht(ansicht.artikel.db_id || artikel.find(x => x.id === ansicht.artikel.id)
            ? { typ: "lesen", artikel: ansicht.artikel }
            : { typ: "liste" }
          )}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}
