-- Supabase SQL Editor'de bir kez çalıştır.
create table if not exists public.site_race_ticker (
  id integer primary key check (id = 1),
  message text not null default '' check (char_length(message) <= 240),
  updated_at timestamptz not null default now()
);
alter table public.site_race_ticker enable row level security;
-- Bu tablo API'deki service-role istemcisiyle okunur/yazılır; tarayıcıdan doğrudan erişim gerekmez.
insert into public.site_race_ticker (id, message) values (1, '') on conflict (id) do nothing;
