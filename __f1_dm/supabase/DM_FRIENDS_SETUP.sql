-- F1 Medipol / Arkadaslar ve ozel mesajlar v1
-- Supabase SQL Editor > New query > Run
-- Var olan profil, tahmin ve bildirim tablolarini silmez.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.dm_friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (user_low,user_high),
  CONSTRAINT dm_friend_order CHECK (user_low < user_high),
  CONSTRAINT dm_requester_in_pair CHECK (requested_by IN (user_low,user_high))
);

CREATE TABLE IF NOT EXISTS public.dm_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT dm_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid NOT NULL REFERENCES public.dm_friendships(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT dm_no_self_message CHECK (sender_id <> recipient_id)
);

CREATE TABLE IF NOT EXISTS public.dm_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, message_id)
);

CREATE INDEX IF NOT EXISTS dm_message_pair_recent ON public.dm_messages(friendship_id,created_at DESC);
CREATE INDEX IF NOT EXISTS dm_message_recipient_unread ON public.dm_messages(recipient_id,sender_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS dm_friendships_req ON public.dm_friendships(requested_by, status);

ALTER TABLE public.dm_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_friendships_own_read ON public.dm_friendships;
CREATE POLICY dm_friendships_own_read ON public.dm_friendships
  FOR SELECT TO authenticated USING (auth.uid() = user_low OR auth.uid() = user_high);
DROP POLICY IF EXISTS dm_blocks_own_read ON public.dm_blocks;
CREATE POLICY dm_blocks_own_read ON public.dm_blocks
  FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS dm_messages_own_read ON public.dm_messages;
CREATE POLICY dm_messages_own_read ON public.dm_messages
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS dm_reports_own_read ON public.dm_reports;
CREATE POLICY dm_reports_own_read ON public.dm_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

REVOKE ALL ON public.dm_friendships, public.dm_blocks, public.dm_messages, public.dm_reports FROM anon, authenticated;
GRANT SELECT ON public.dm_friendships,public.dm_blocks,public.dm_messages,public.dm_reports TO authenticated;
-- Degisiklikler sadece asagidaki kontrollu RPC fonksiyonlari uzerinden yapilir.

CREATE OR REPLACE FUNCTION public.dm_find_users(p_search text)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, relationship text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT p.id,
    COALESCE(NULLIF(btrim(p.display_name),''), NULLIF(btrim(p.username),''), 'Sürücü')::text,
    p.avatar_url::text,
    COALESCE(f.status, 'none')::text
  FROM public.profiles p
  LEFT JOIN public.dm_friendships f
    ON f.user_low = LEAST(auth.uid(),p.id) AND f.user_high = GREATEST(auth.uid(),p.id)
  WHERE auth.uid() IS NOT NULL
    AND char_length(btrim(COALESCE(p_search,''))) BETWEEN 2 AND 40
    AND p.id <> auth.uid()
    AND (COALESCE(p.display_name,'') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(p.username,'') ILIKE '%' || btrim(p_search) || '%')
    AND NOT EXISTS (
      SELECT 1 FROM public.dm_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
    )
  ORDER BY p.display_name NULLS LAST, p.id
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.dm_list_friends()
RETURNS TABLE (friendship_id uuid, user_id uuid, display_name text, avatar_url text,
               last_message text, last_at timestamptz, unread_count bigint)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT f.id, other.id,
    COALESCE(NULLIF(btrim(p.display_name),''),NULLIF(btrim(p.username),''),'Sürücü')::text,
    p.avatar_url::text, recent.body, recent.created_at,
    (SELECT count(*) FROM public.dm_messages m
     WHERE m.friendship_id=f.id AND m.recipient_id=auth.uid() AND m.read_at IS NULL)::bigint
  FROM public.dm_friendships f
  JOIN LATERAL (
    SELECT CASE WHEN f.user_low=auth.uid() THEN f.user_high ELSE f.user_low END AS id
  ) other ON TRUE
  LEFT JOIN public.profiles p ON p.id=other.id
  LEFT JOIN LATERAL (
    SELECT m.body,m.created_at FROM public.dm_messages m
    WHERE m.friendship_id=f.id ORDER BY m.created_at DESC LIMIT 1
  ) recent ON TRUE
  WHERE auth.uid() IN (f.user_low,f.user_high) AND f.status='accepted'
  ORDER BY recent.created_at DESC NULLS LAST, f.accepted_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.dm_list_requests()
RETURNS TABLE (friendship_id uuid, user_id uuid, display_name text, avatar_url text,
               direction text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT f.id, other.id,
    COALESCE(NULLIF(btrim(p.display_name),''), NULLIF(btrim(p.username),''),'Sürücü')::text,
    p.avatar_url::text,
    (CASE WHEN f.requested_by=auth.uid() THEN 'outgoing' ELSE 'incoming' END)::text,
    f.created_at
  FROM public.dm_friendships f
  JOIN LATERAL (
    SELECT CASE WHEN f.user_low=auth.uid() THEN f.user_high ELSE f.user_low END AS id
  ) other ON TRUE
  LEFT JOIN public.profiles p ON p.id=other.id
  WHERE auth.uid() IN (f.user_low,f.user_high) AND f.status='pending'
  ORDER BY f.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.dm_add_friend(p_target uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid(); result_id uuid; existing_status text; sender_name text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Oturum acmalisin.'; END IF;
  IF p_target IS NULL OR p_target = me THEN RAISE EXCEPTION 'Kullanici secimi gecersiz.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_target) THEN RAISE EXCEPTION 'Kullanici bulunamadi.'; END IF;
  IF EXISTS(SELECT 1 FROM public.dm_blocks
     WHERE (blocker_id=me AND blocked_id=p_target) OR (blocker_id=p_target AND blocked_id=me))
  THEN RAISE EXCEPTION 'Bu kisiye istek gonderilemiyor.'; END IF;
  IF (SELECT count(*) FROM public.dm_friendships
    WHERE requested_by=me AND created_at > now()-interval '1 hour') >= 20
  THEN RAISE EXCEPTION 'Bir saatlik istek sinirina ulastin.'; END IF;
  SELECT id,status INTO result_id,existing_status FROM public.dm_friendships
    WHERE user_low=LEAST(me,p_target) AND user_high=GREATEST(me,p_target);
  IF result_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bu kisiyle zaten bir arkadaslik durumun var.';
  END IF;
  INSERT INTO public.dm_friendships(user_low,user_high,requested_by)
    VALUES(LEAST(me,p_target),GREATEST(me,p_target),me) RETURNING id INTO result_id;
  IF to_regclass('public.site_notifications') IS NOT NULL THEN
    SELECT COALESCE(NULLIF(btrim(display_name),''),'Bir uye') INTO sender_name FROM public.profiles WHERE id=me;
    INSERT INTO public.site_notifications(user_id,kind,title,body,target_url)
      VALUES(p_target,'dm_friend_request','Yeni arkadaslik istegi',
        COALESCE(sender_name,'Bir uye') || ' sana arkadaslik istegi gonderdi.','/?dm=requests');
  END IF;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_respond_friend(p_friendship uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid(); f public.dm_friendships%ROWTYPE; other_id uuid; my_name text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Oturum acmalisin.'; END IF;
  SELECT * INTO f FROM public.dm_friendships WHERE id=p_friendship FOR UPDATE;
  IF NOT FOUND OR f.status<>'pending' OR f.requested_by=me OR me NOT IN (f.user_low,f.user_high)
  THEN RAISE EXCEPTION 'Bu istek senin icin gecerli degil.'; END IF;
  other_id := f.requested_by;
  IF p_accept THEN
    IF EXISTS(SELECT 1 FROM public.dm_blocks b
       WHERE (b.blocker_id=me AND b.blocked_id=other_id) OR (b.blocker_id=other_id AND b.blocked_id=me))
    THEN RAISE EXCEPTION 'Engellenen bir hesapla arkadas olunamaz.'; END IF;
    UPDATE public.dm_friendships SET status='accepted',accepted_at=now() WHERE id=p_friendship;
    IF to_regclass('public.site_notifications') IS NOT NULL THEN
      SELECT COALESCE(NULLIF(btrim(display_name),''),'Bir uye') INTO my_name FROM public.profiles WHERE id=me;
      INSERT INTO public.site_notifications(user_id,kind,title,body,target_url)
        VALUES(other_id,'dm_friend_accepted','Arkadaslik istegin kabul edildi',
          COALESCE(my_name,'Bir uye') || ' arkadaslik istegini kabul etti.','/?dm=' || me::text);
    END IF;
  ELSE
    UPDATE public.dm_friendships SET status='declined' WHERE id=p_friendship;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_remove_friend(p_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL OR p_target IS NULL OR p_target=me THEN RAISE EXCEPTION 'Gecersiz islem.'; END IF;
  DELETE FROM public.dm_friendships f
   WHERE f.user_low=LEAST(me,p_target) AND f.user_high=GREATEST(me,p_target)
   AND (f.status='accepted' OR (f.status='pending' AND f.requested_by=me));
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_block_user(p_target uuid, p_block boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL OR p_target IS NULL OR p_target=me THEN RAISE EXCEPTION 'Gecersiz islem.'; END IF;
  IF p_block THEN
    INSERT INTO public.dm_blocks(blocker_id,blocked_id) VALUES(me,p_target) ON CONFLICT DO NOTHING;
    DELETE FROM public.dm_friendships f
      WHERE f.user_low=LEAST(me,p_target) AND f.user_high=GREATEST(me,p_target);
  ELSE
    DELETE FROM public.dm_blocks WHERE blocker_id=me AND blocked_id=p_target;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_get_messages(p_other uuid, p_limit integer DEFAULT 70)
RETURNS TABLE (id uuid, sender_id uuid, recipient_id uuid, body text, created_at timestamptz, read_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '' AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Oturum acmalisin.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.dm_friendships f
    WHERE f.user_low=LEAST(me,p_other) AND f.user_high=GREATEST(me,p_other) AND f.status='accepted')
  THEN RAISE EXCEPTION 'Mesajlari gormek icin arkadas olmalisiniz.'; END IF;
  RETURN QUERY SELECT q.id,q.sender_id,q.recipient_id,q.body,q.created_at,q.read_at FROM (
    SELECT m.id,m.sender_id,m.recipient_id,m.body,m.created_at,m.read_at
    FROM public.dm_messages m
    WHERE (m.sender_id=me AND m.recipient_id=p_other) OR (m.sender_id=p_other AND m.recipient_id=me)
    ORDER BY m.created_at DESC LIMIT LEAST(GREATEST(COALESCE(p_limit,70),1),100)
  ) q ORDER BY q.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_send_message(p_other uuid, p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid(); f_id uuid; new_id uuid; sender_name text; clean_body text;
BEGIN
  IF me IS NULL OR p_other IS NULL OR p_other=me THEN RAISE EXCEPTION 'Gecersiz alici.'; END IF;
  clean_body := btrim(COALESCE(p_body,''));
  IF char_length(clean_body) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Mesaj 1-1000 karakter olmali.'; END IF;
  IF EXISTS(SELECT 1 FROM public.dm_blocks
    WHERE (blocker_id=me AND blocked_id=p_other) OR (blocker_id=p_other AND blocked_id=me))
  THEN RAISE EXCEPTION 'Bu kisiyle mesajlasamazsin.'; END IF;
  SELECT id INTO f_id FROM public.dm_friendships
  WHERE user_low=LEAST(me,p_other) AND user_high=GREATEST(me,p_other) AND status='accepted';
  IF f_id IS NULL THEN RAISE EXCEPTION 'Mesaj gondermek icin arkadas olmalisiniz.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(me::text, 0));
  IF EXISTS(SELECT 1 FROM public.dm_messages WHERE sender_id=me AND created_at>now()-interval '2 seconds')
  THEN RAISE EXCEPTION 'Yeni mesaj icin 2 saniye bekle.'; END IF;
  INSERT INTO public.dm_messages(friendship_id,sender_id,recipient_id,body)
    VALUES(f_id,me,p_other,clean_body) RETURNING id INTO new_id;
  IF to_regclass('public.site_notifications') IS NOT NULL THEN
    SELECT COALESCE(NULLIF(btrim(display_name),''),'Bir uye') INTO sender_name FROM public.profiles WHERE id=me;
    INSERT INTO public.site_notifications(user_id,kind,title,body,target_url)
      VALUES(p_other,'dm_message',COALESCE(sender_name,'Bir uye') || ' sana mesaj gonderdi',
        left(clean_body,140),'/?dm=' || me::text);
  END IF;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_mark_read(p_other uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid(); updated_count integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Oturum acmalisin.'; END IF;
  UPDATE public.dm_messages SET read_at=now()
    WHERE recipient_id=me AND sender_id=p_other AND read_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF to_regclass('public.site_notifications') IS NOT NULL THEN
    UPDATE public.site_notifications SET read_at=now()
      WHERE user_id=me AND kind='dm_message' AND target_url='/?dm=' || p_other::text
        AND read_at IS NULL;
  END IF;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.dm_report_message(p_message uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Oturum acmalisin.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.dm_messages
     WHERE id=p_message AND recipient_id=me) THEN RAISE EXCEPTION 'Bu mesaj bildirilemez.'; END IF;
  INSERT INTO public.dm_reports(reporter_id,message_id,reason)
    VALUES(me,p_message,left(COALESCE(NULLIF(btrim(p_reason),''),'Uygunsuz icerik'),200))
  ON CONFLICT(reporter_id,message_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.dm_find_users(text), public.dm_list_friends(),public.dm_list_requests(),
  public.dm_add_friend(uuid),public.dm_respond_friend(uuid,boolean), public.dm_remove_friend(uuid),
  public.dm_block_user(uuid,boolean),public.dm_get_messages(uuid,integer),public.dm_send_message(uuid,text),
  public.dm_mark_read(uuid),public.dm_report_message(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dm_find_users(text), public.dm_list_friends(),public.dm_list_requests(),
  public.dm_add_friend(uuid),public.dm_respond_friend(uuid,boolean), public.dm_remove_friend(uuid),
  public.dm_block_user(uuid,boolean),public.dm_get_messages(uuid,integer),public.dm_send_message(uuid,text),
  public.dm_mark_read(uuid),public.dm_report_message(uuid,text) TO authenticated;

-- Realtime: kayit gonderimlerini dinleyebilmek icin.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    IF NOT EXISTS(SELECT 1 FROM pg_publication_tables
        WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='dm_messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_publication_tables
        WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='dm_friendships') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_friendships;
    END IF;
  END IF;
END $$;
