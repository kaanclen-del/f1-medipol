-- G6.17.4: Dark theme retains existing profile_wallpaper.
-- Empty values in the new columns automatically fall back to the dark theme.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_wallpaper_light text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_wallpaper_red text;
