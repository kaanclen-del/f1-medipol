-- G6.14: Run in Supabase SQL Editor before deploying the code.
-- Existing records remain intact. Defaults preserve the previous appearance.
ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS image_layout text NOT NULL DEFAULT 'portrait';
ALTER TABLE public.gallery_images DROP CONSTRAINT IF EXISTS gallery_images_image_layout_check;
ALTER TABLE public.gallery_images
  ADD CONSTRAINT gallery_images_image_layout_check CHECK (image_layout IN ('portrait','landscape'));

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS show_when_locked boolean NOT NULL DEFAULT true;

-- Separate per-event thumbnail crop selection; no changes to events CRUD needed.
CREATE TABLE IF NOT EXISTS public.event_thumbnail_settings (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  position_x integer NOT NULL DEFAULT 50 CHECK (position_x BETWEEN 0 AND 100),
  position_y integer NOT NULL DEFAULT 50 CHECK (position_y BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_thumbnail_settings ENABLE ROW LEVEL SECURITY;
-- Only service-role access is used for changing/reading settings from the server.
-- No browser-direct policies are required.
