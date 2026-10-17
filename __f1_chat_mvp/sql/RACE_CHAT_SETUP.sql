-- F1 MEDIPOL / GRAND PRIX SOHBETI
-- Supabase SQL Editor'de sadece bu SQL dosyasinin icerigini calistirin.
-- Bu kurulum eski paddock ve tahmin verilerini degistirmez.

create table if not exists public.race_chat_messages (
  id uuid primary key default gen_random_uuid(),
  season integer not null check (season between 2020 and 2100),
  round integer not null check (round between 0 and 30),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Sürücü' check (char_length(author_name) <= 60),
  content text not null check (char_length(btrim(content)) between 1 and 400),
  created_at timestamptz not null default now()
);

create index if not exists race_chat_race_time_idx
  on public.race_chat_messages (season, round, created_at desc);
create index if not exists race_chat_user_time_idx
  on public.race_chat_messages (user_id, created_at desc);

alter table public.race_chat_messages enable row level security;

-- Her mesaj oturum acmis bir uye tarafindan okunabilir.
drop policy if exists "race_chat_select_authenticated" on public.race_chat_messages;
create policy "race_chat_select_authenticated" on public.race_chat_messages
  for select to authenticated using (true);

-- Uye yalnizca kendi kimligi ile yazabilir.
drop policy if exists "race_chat_insert_own" on public.race_chat_messages;
create policy "race_chat_insert_own" on public.race_chat_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- Her uye yalnizca kendi mesajini silebilir.
drop policy if exists "race_chat_delete_own" on public.race_chat_messages;
create policy "race_chat_delete_own" on public.race_chat_messages
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, delete on public.race_chat_messages to authenticated;
revoke all on public.race_chat_messages from anon;

-- Mesaj yazilirken kullanici adini veritabanindan belirle.
-- Tarayici tarafindan sahte ad gonderilmesi etkisizdir.
-- 4 saniyede birden sik mesaj atilmasi engellenir.
create or replace function public.race_chat_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
  recent_message timestamptz;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'Oturum kimligi dogrulanamadi.';
  end if;

  new.content := btrim(new.content);
  if char_length(new.content) < 1 or char_length(new.content) > 400 then
    raise exception 'Mesaj 1-400 karakter olmalidir.';
  end if;

  -- Iki es zamanli istekte de mesaj araligi kontrol edilir.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select max(m.created_at)
  into recent_message
  from public.race_chat_messages m
  where m.user_id = new.user_id
    and m.created_at > now() - interval '4 seconds';

  if recent_message is not null then
    raise exception 'Yeni mesaj icin 4 saniye beklemelisin.';
  end if;

  select coalesce(
    nullif(btrim(p.display_name), ''),
    nullif(btrim(p.username), '')
  ) into profile_name
  from public.profiles p
  where p.id = new.user_id;

  new.author_name := left(
    coalesce(profile_name, 'Sürücü ' || left(new.user_id::text, 6)),
    60
  );
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.race_chat_before_insert() from public;

drop trigger if exists race_chat_validate_insert on public.race_chat_messages;
create trigger race_chat_validate_insert
before insert on public.race_chat_messages
for each row execute function public.race_chat_before_insert();

-- Supabase Realtime yayinina ekle (mevcut yayindaysa tekrar eklemez).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'race_chat_messages'
     ) then
    alter publication supabase_realtime add table public.race_chat_messages;
  end if;
end;
$$;

-- Uygunsuz mesajlarin yonetime bildirilebilmesi.
create table if not exists public.race_chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.race_chat_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'Uygunsuz içerik' check (char_length(reason) between 3 and 200),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);
alter table public.race_chat_reports enable row level security;
drop policy if exists "race_chat_report_insert_own" on public.race_chat_reports;
create policy "race_chat_report_insert_own" on public.race_chat_reports
  for insert to authenticated with check (auth.uid() = reporter_id);
grant insert on public.race_chat_reports to authenticated;
revoke all on public.race_chat_reports from anon;
