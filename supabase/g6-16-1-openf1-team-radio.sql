-- F1 Medipol G6.16.1 — yalnızca yönetici seçimiyle OpenF1 telsiz bağlantıları
-- Supabase SQL Editor'da çalıştırın. G6.16 uygulanmış olsa da olmasa da çalışır.
-- Eski yüklenmiş telsiz kayıtları korunur.

CREATE TABLE IF NOT EXISTS public.team_radio_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  driver_name text NOT NULL CHECK (char_length(driver_name) BETWEEN 2 AND 100),
  grand_prix text NOT NULL CHECK (char_length(grand_prix) BETWEEN 2 AND 120),
  team_name text,
  season integer CHECK (season IS NULL OR season BETWEEN 1950 AND 2100),
  audio_path text UNIQUE,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_radio_clips ALTER COLUMN audio_path DROP NOT NULL;
ALTER TABLE public.team_radio_clips ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'openf1';
ALTER TABLE public.team_radio_clips ADD COLUMN IF NOT EXISTS recording_url text;
ALTER TABLE public.team_radio_clips ADD COLUMN IF NOT EXISTS session_key integer;
ALTER TABLE public.team_radio_clips ADD COLUMN IF NOT EXISTS driver_number integer;
ALTER TABLE public.team_radio_clips ADD COLUMN IF NOT EXISTS recorded_at timestamptz;

-- G6.16 yüklemeleri varsa arşivde kaybetmeyelim.
UPDATE public.team_radio_clips SET source_type = 'upload' WHERE audio_path IS NOT NULL;
ALTER TABLE public.team_radio_clips ALTER COLUMN source_type SET DEFAULT 'openf1';

CREATE UNIQUE INDEX IF NOT EXISTS team_radio_clips_openf1_recording_url_uniq
  ON public.team_radio_clips (recording_url)
  WHERE recording_url IS NOT NULL;

ALTER TABLE public.team_radio_clips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_radio_clips FROM anon, authenticated;

-- Sunucu API'leri service role ile erişir; herkese açık tabloda değişiklik izni yoktur.
-- OpenF1 ses dosyalarını Supabase'e kopyalamıyoruz; sadece recording_url saklanır.
