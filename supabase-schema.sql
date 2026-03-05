-- SVP Verteilerplaner – Supabase Datenbankschema
-- Dieses Script im Supabase SQL-Editor ausführen (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS projekte (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  ersteller    TEXT DEFAULT '',
  adresse      TEXT DEFAULT '',
  standort     TEXT DEFAULT '',
  kabel        JSONB DEFAULT '[]'::jsonb,
  sicherungen  JSONB DEFAULT '[]'::jsonb,
  fi_konfigs   JSONB DEFAULT '[]'::jsonb,
  stockwerke   JSONB DEFAULT '[]'::jsonb,
  raeume       JSONB DEFAULT '[]'::jsonb,
  sw_color_map JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelles Laden (sortiert nach Datum)
CREATE INDEX IF NOT EXISTS projekte_updated_at_idx ON projekte(updated_at DESC);

-- Row Level Security aktivieren
ALTER TABLE projekte ENABLE ROW LEVEL SECURITY;

-- Policy: Alle Operationen erlauben (für Firmen-internen Einsatz ohne Login)
-- Für Multi-User mit Auth: Diese Policy durch user-spezifische ersetzen
CREATE POLICY IF NOT EXISTS "Alle Operationen erlaubt" ON projekte
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger: updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON projekte;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON projekte
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
