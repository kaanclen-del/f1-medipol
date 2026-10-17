-- F1 MEDIPOL / KART RUSH 2.6 - CHAMPIONSHIP
-- Run ONCE in Supabase Dashboard > SQL Editor for the same project as F1 Medipol.
-- Adds fields without dropping/rebuilding existing rooms, members, or RPCs.

alter table public.f1_kr_rooms
  add column if not exists kr_championship_enabled boolean not null default false,
  add column if not exists kr_target_points integer not null default 50,
  add column if not exists kr_round integer not null default 1,
  add column if not exists kr_round_scored boolean not null default false,
  add column if not exists kr_champion_user_id text;

alter table public.f1_kr_members
  add column if not exists kr_points integer not null default 0,
  add column if not exists kr_last_award integer not null default 0;

-- Immutable scoring history: PK prevents re-awarding the same round to a racer.
-- f1_kr_rooms.id and members.room_id are UUIDs in the game's standard schema.
create table if not exists public.f1_kr_round_results (
  room_id uuid not null references public.f1_kr_rooms(id) on delete cascade,
  round_no integer not null,
  user_id text not null,
  finish_position integer not null,
  finish_ms bigint,
  awarded_points integer not null default 0,
  recorded_at timestamptz not null default now(),
  primary key (room_id,round_no,user_id)
);
alter table public.f1_kr_round_results enable row level security;
-- No client write policies. Only guarded SECURITY DEFINER functions can change scores.

create or replace function public.f1_kr_configure_championship(
  p_room_id uuid,
  p_enabled boolean,
  p_target integer default 50
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.f1_kr_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapmalısın.'; end if;
  select * into r from public.f1_kr_rooms where id=p_room_id for update;
  if not found then raise exception 'Lobi bulunamadı.'; end if;
  if r.host_id::text <> auth.uid()::text then raise exception 'Yalnızca lobi kurucusu ayarları değiştirebilir.'; end if;
  if r.status::text <> 'lobby' or r.kr_round <> 1 then raise exception 'Şampiyona ayarları yalnızca ilk yarıştan önce değiştirilebilir.'; end if;
  if p_target is null or p_target < 25 or p_target > 500 then raise exception 'Puan hedefi 25-500 arasında olmalı.'; end if;
  update public.f1_kr_rooms
     set kr_championship_enabled = coalesce(p_enabled,false),
         kr_target_points = p_target,
         kr_round=1,kr_round_scored=false,kr_champion_user_id=null
   where id=p_room_id;
  update public.f1_kr_members set kr_points=0,kr_last_award=0 where room_id=p_room_id;
end;
$$;

-- May be run by the host once all players have finished. Host can also treat
-- late/non-finishing participants as DNF via the explicit 'finalize' action.
-- Transaction + row lock makes repeat calls idempotent across multiple tabs.
create or replace function public.f1_kr_finalize_championship_round(
  p_room_id uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.f1_kr_rooms%rowtype;
declare champion text;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapmalısın.'; end if;
  select * into r from public.f1_kr_rooms where id=p_room_id for update;
  if not found then raise exception 'Lobi bulunamadı.'; end if;
  if r.host_id::text <> auth.uid()::text then raise exception 'Yalnızca lobi kurucusu puanları onaylayabilir.'; end if;
  if not r.kr_championship_enabled then raise exception 'Bu lobi puanlı şampiyona değil.'; end if;
  if r.kr_round_scored then return; end if;
  if r.kr_champion_user_id is not null then raise exception 'Şampiyona zaten tamamlandı.'; end if;
  if r.status::text <> 'racing' then raise exception 'Yarış henüz başlamamış.'; end if;
  if not exists(select 1 from public.f1_kr_members where room_id=p_room_id and finish_ms is not null)
    then raise exception 'Henüz yarışı bitiren oyuncu yok.'; end if;

  insert into public.f1_kr_round_results(room_id,round_no,user_id,finish_position,finish_ms,awarded_points)
    select p_room_id,r.kr_round,classified.user_id::text,classified.pos,classified.finish_ms,
           case when classified.finish_ms is null then 0
                when classified.pos=1 then 25
                when classified.pos=2 then 18
                when classified.pos=3 then 15
                when classified.pos=4 then 12
                when classified.pos=5 then 10
                when classified.pos=6 then 8
                when classified.pos=7 then 6
                when classified.pos=8 then 4
                when classified.pos=9 then 2
                when classified.pos=10 then 1 else 0 end
    from (
      select m.user_id,m.finish_ms,
             row_number() over(order by m.finish_ms asc nulls last,m.best_lap_ms asc nulls last,m.joined_at asc) as pos
        from public.f1_kr_members m where m.room_id=p_room_id
    ) classified;

  update public.f1_kr_members m
     set kr_points=m.kr_points+x.awarded_points,
         kr_last_award=x.awarded_points
    from public.f1_kr_round_results x
   where m.room_id=p_room_id and x.room_id=p_room_id and x.round_no=r.kr_round
     and m.user_id::text=x.user_id;

  select m.user_id::text into champion
    from public.f1_kr_members m
   where m.room_id=p_room_id and m.kr_points>=r.kr_target_points
   order by m.kr_points desc,m.kr_last_award desc,m.finish_ms asc nulls last,m.joined_at asc
   limit 1;

  update public.f1_kr_rooms
     set kr_round_scored=true,kr_champion_user_id=champion
   where id=p_room_id;
end;
$$;

-- New round preserves accumulated points. The preexisting f1_kr_reset_room
-- isn't used, because its internals might reset fields we want to retain.
create or replace function public.f1_kr_next_championship_round(
  p_room_id uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.f1_kr_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Önce giriş yapmalısın.'; end if;
  select * into r from public.f1_kr_rooms where id=p_room_id for update;
  if not found then raise exception 'Lobi bulunamadı.'; end if;
  if r.host_id::text <> auth.uid()::text then raise exception 'Yalnızca lobi kurucusu yeni yarış başlatabilir.'; end if;
  if not r.kr_championship_enabled or not r.kr_round_scored or r.kr_champion_user_id is not null
    then raise exception 'Yeni yarış açılamaz: Önce önceki yarış puanlanmalı ve şampiyona bitmemiş olmalı.'; end if;
  update public.f1_kr_members
    set ready=false,finish_ms=null,best_lap_ms=null,kr_last_award=0
    where room_id=p_room_id;
  update public.f1_kr_rooms
    set status='lobby',started_at=null,kr_round=r.kr_round+1,kr_round_scored=false
    where id=p_room_id;
end;
$$;

grant execute on function public.f1_kr_configure_championship(uuid,boolean,integer) to authenticated;
grant execute on function public.f1_kr_finalize_championship_round(uuid) to authenticated;
grant execute on function public.f1_kr_next_championship_round(uuid) to authenticated;
