-- F1 Medipol Kart Rush: G3.1 weather sync for online rooms.
-- Run once in Supabase SQL Editor, after the earlier Kart Rush lobby tables exist.
-- Existing lobbies remain dry by default.

alter table public.f1_kr_rooms
  add column if not exists kr_weather text not null default 'clear'
  check (kr_weather in ('clear', 'rain'));

create or replace function public.f1_kr_set_weather(p_room_id uuid, p_weather text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare room_info public.f1_kr_rooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Log in before configuring weather.';
  end if;
  if p_weather is null or p_weather not in ('clear', 'rain') then
    raise exception 'Unknown weather.';
  end if;
  select * into room_info from public.f1_kr_rooms where id=p_room_id for update;
  if not found then
    raise exception 'Lobby does not exist.';
  end if;
  if room_info.host_id::text <> auth.uid()::text then
    raise exception 'Only host can configure weather.';
  end if;
  if room_info.status::text <> 'lobby' then
    raise exception 'Weather can only be changed before the race.';
  end if;
  update public.f1_kr_rooms set kr_weather=p_weather where id=p_room_id;
end;
$$;

revoke all on function public.f1_kr_set_weather(uuid, text) from public;
grant execute on function public.f1_kr_set_weather(uuid, text) to authenticated;
