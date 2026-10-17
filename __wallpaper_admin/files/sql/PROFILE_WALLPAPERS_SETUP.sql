-- F1 Medipol | Admin yonetimli profil arka planlari
-- Bunu Supabase SQL Editor'de bir kez calistirin.
create table if not exists public.profile_wallpaper_options (
  id text primary key check (id ~ '^custom-[a-f0-9-]{36}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 240),
  image_url text,
  image_path text,
  color_a text not null default '#080e20' check (color_a ~ '^#[0-9a-fA-F]{6}$'),
  color_b text not null default '#45152d' check (color_b ~ '^#[0-9a-fA-F]{6}$'),
  accent text not null default '#fa3449' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  motion text not null default 'drift' check (motion in ('drift','pulse','rain','aurora','speed')),
  is_published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallpaper_public on public.profile_wallpaper_options(is_published, sort_order);
alter table public.profile_wallpaper_options enable row level security;
drop policy if exists "Members can view published wallpapers" on public.profile_wallpaper_options;
create policy "Members can view published wallpapers" on public.profile_wallpaper_options
  for select to anon, authenticated using (is_published = true);
-- Yönetim islemleri sadece sunucuda admin oturumu kontrol edildikten sonra,
-- SUPABASE_SECRET_KEY ile yapilir. Browser direkt INSERT/UPDATE/DELETE yapmaz.
grant select on public.profile_wallpaper_options to anon, authenticated;
revoke insert, update, delete on public.profile_wallpaper_options from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-wallpapers', 'profile-wallpapers', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Depolama yuklemelerini browser degil, yetkili sunucu API'si yapar.
