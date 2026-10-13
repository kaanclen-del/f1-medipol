-- Supabase SQL Editor'de bir kez çalıştırın.
-- Yorumlar yalnızca yetkili sunucu API'si tarafından okunur ve değiştirilir.
create table if not exists public.weekly_commentaries (
  id uuid primary key default gen_random_uuid(),
  week_label text not null default '',
  title text not null,
  summary text not null default '',
  content text not null,
  image_url text,
  image_path text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_commentaries_title_limit check (char_length(title) between 1 and 180),
  constraint weekly_commentaries_content_limit check (char_length(content) between 1 and 20000),
  constraint weekly_commentaries_summary_limit check (char_length(summary) <= 400),
  constraint weekly_commentaries_week_label_limit check (char_length(week_label) <= 120)
);

create index if not exists weekly_commentaries_publish_idx
  on public.weekly_commentaries (is_published, published_at desc);

alter table public.weekly_commentaries enable row level security;
-- Herkese açık RLS policy yoktur: halka açık ana sayfa yalnızca yayımlanan kaydı sunucu üzerinden alır.
