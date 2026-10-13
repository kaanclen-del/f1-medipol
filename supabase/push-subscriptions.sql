-- F1 Medipol Web Push abonelikleri
-- Supabase SQL Editor'de BIR KEZ çalıştır.
-- Bu tablo yalnızca sunucudaki service-role istemcisiyle okunur/yazılır.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_test_sent_at timestamptz
);

create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- Bilerek SELECT/INSERT/UPDATE/DELETE RLS politikası tanımlamıyoruz.
-- Authenticated ve anon istemciler doğrudan bu tablodaki push endpoint'lerine erişemez.
