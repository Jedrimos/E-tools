-- ══════════════════════════════════════════════════════════════════════════════
-- Elektronikertools – Supabase SQL-Schema
-- Version: 2026.3.4
-- Im Supabase SQL-Editor ausführen (alles auf einmal oder einzeln)
-- ══════════════════════════════════════════════════════════════════════════════


-- ── 1. Verteilerplaner-Projekte ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projekte (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL DEFAULT '',
  ersteller    text DEFAULT '',
  adresse      text DEFAULT '',
  standort     text DEFAULT '',
  kabel        jsonb DEFAULT '[]',
  sicherungen  jsonb DEFAULT '[]',
  fi_konfigs   jsonb DEFAULT '[]',
  stockwerke   jsonb DEFAULT '[]',
  raeume       jsonb DEFAULT '[]',
  sw_color_map jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE projekte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON projekte FOR ALL USING (true) WITH CHECK (true);


-- ── 2. Prüfprotokolle ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pruefprotokolle (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text NOT NULL DEFAULT 'Protokoll',
  auftraggeber      text DEFAULT '',
  auftragnummer     text DEFAULT '',
  anlagenstandort   text DEFAULT '',
  anlage_art        text DEFAULT 'Wohngebäude',
  nennspannung      text DEFAULT '230/400',
  pruefer           text DEFAULT '',
  datum             date,
  naechste_pruefung date,
  stromkreise       jsonb DEFAULT '[]',
  notiz             text DEFAULT '',
  verteiler_id      uuid REFERENCES projekte(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE pruefprotokolle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON pruefprotokolle FOR ALL USING (true) WITH CHECK (true);


-- ── 3. Stundenbuch ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stunden (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  datum       date NOT NULL,
  von         text DEFAULT '',
  bis         text DEFAULT '',
  pause       integer DEFAULT 0,
  projekt     text DEFAULT '',
  taetigkeit  text DEFAULT '',
  notiz       text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE stunden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON stunden FOR ALL USING (true) WITH CHECK (true);


-- ── 4. Wissensdatenbank ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wissensdatenbank (
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
ALTER TABLE wissensdatenbank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON wissensdatenbank FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════════════════
-- Optional: updated_at Trigger (automatisch bei UPDATE setzen)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projekte_updated_at          BEFORE UPDATE ON projekte          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pruefprotokolle_updated_at   BEFORE UPDATE ON pruefprotokolle   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stunden_updated_at           BEFORE UPDATE ON stunden           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wissensdatenbank_updated_at  BEFORE UPDATE ON wissensdatenbank  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
