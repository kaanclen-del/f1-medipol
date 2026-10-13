-- F1 MEDİPOL — TEK ANA YÖNETİCİ VE YETKİ GÜVENLİĞİ
-- ÇALIŞTIRMADAN ÖNCE aşağıdaki UUID yerine KENDİ hesabının Supabase Authentication -> Users -> User UID değerini yaz.
-- ÖNEMLİ: Bu değer e-posta, kullanıcı adı veya şifre değil, UUID olmalıdır.
-- Gerçek kimliğini doğru seçtiğinden emin ol; diğer adminler bunu uygulama üzerinden değiştiremez.
-- __OWNER_USER_UUID__ değerini bir kez değiştir, sonra SQL Editor -> Run.

begin;

create table if not exists public.site_admin_config (
  singleton boolean primary key default true check (singleton = true),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.site_admin_config enable row level security;
revoke all on public.site_admin_config from anon, authenticated;

-- Ana yönetici ilk kurulumda atanır. Daha sonra farklı biriyle sessizce değiştirilemez.
do $$
declare
  desired_owner uuid := '__OWNER_USER_UUID__'::uuid;
  current_owner uuid;
begin
  if not exists (select 1 from auth.users where id = desired_owner) then
    raise exception 'Girilen User UID Authentication -> Users listesinde bulunamadı.';
  end if;
  select owner_id into current_owner from public.site_admin_config where singleton = true;
  if current_owner is not null and current_owner <> desired_owner then
    raise exception 'Ana yönetici daha önce tanımlanmış. Yeni hesap atanmadı.';
  end if;
  insert into public.site_admin_config(singleton, owner_id)
    values(true,desired_owner) on conflict (singleton) do nothing;
  update public.profiles set is_admin = true where id = desired_owner;
  if not found then
    raise exception 'Ana yöneticinin profiles kaydı bulunamadı.';
  end if;
end $$;

-- Kullanıcıların kendi profillerinden yönetici bayrağını değiştirmesine izin verilmez.
-- Yetki atama/kaldırma işlemleri yalnızca ana yöneticinin doğrulandığı sunucu API'sinden yapılır.
create or replace function public.guard_profiles_admin_flag()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  protected_owner uuid;
  trusted_server boolean;
begin
  select owner_id into protected_owner from public.site_admin_config where singleton = true;
  trusted_server := (coalesce(auth.role(),'') = 'service_role');

  if TG_OP = 'DELETE' then
    if OLD.id = protected_owner then
      raise exception 'Ana yöneticinin profil kaydı silinemez.';
    end if;
    return OLD;
  end if;

  if TG_OP = 'INSERT' then
    if coalesce(NEW.is_admin,false) and not trusted_server then
      raise exception 'Yönetici yetkisi profil oluştururken atanamaz.';
    end if;
    return NEW;
  end if;

  if OLD.id = protected_owner and coalesce(NEW.is_admin,false) is not true then
    raise exception 'Ana yöneticinin yetkisi geri alınamaz.';
  end if;
  if NEW.is_admin is distinct from OLD.is_admin and not trusted_server then
    raise exception 'Yönetici yetkileri sadece güvenli sunucu API üzerinden değiştirilebilir.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists guard_profiles_admin_flag_trigger on public.profiles;
create trigger guard_profiles_admin_flag_trigger
  before insert or update or delete on public.profiles
  for each row execute function public.guard_profiles_admin_flag();

commit;
