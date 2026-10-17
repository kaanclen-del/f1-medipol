-- F1 MEDIPOL / DM 2.0 - mevcut DM ve profil tablolari gereklidir.
-- Tekrar calistirilabilir (ilk kurulumdaki profil isaretleme yalnizca sutun yeniyse).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='onboarding_seen_at') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_seen_at timestamptz;
    -- Mevcut hesaplara tekrar karsilama gostermeyelim; yeni kayitlar NULL kalir.
    UPDATE public.profiles SET onboarding_seen_at=now();
  END IF;
END $$;

ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS media_path text;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS media_kind text;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS media_mime text;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS media_name text;
ALTER TABLE public.dm_messages ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('dm-media','dm-media',false,26214400,
        ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime',
              'audio/webm','audio/mp4','audio/mpeg','audio/ogg'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

DROP POLICY IF EXISTS "dm_v2_upload_own" ON storage.objects;
CREATE POLICY "dm_v2_upload_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='dm-media' AND
  (storage.foldername(name))[1]=auth.uid()::text AND
  char_length(name) < 300
);
DROP POLICY IF EXISTS "dm_v2_read_participants" ON storage.objects;
CREATE POLICY "dm_v2_read_participants" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id='dm-media' AND (
    ((storage.foldername(name))[1]=auth.uid()::text AND
      created_at > now() - interval '1 hour')
    OR EXISTS (
      SELECT 1 FROM public.dm_messages m WHERE m.media_path=storage.objects.name
      AND (m.sender_id=auth.uid() OR m.recipient_id=auth.uid())
    )
  )
);
-- Kasitli olarak UPDATE/DELETE storage policy tanimlamiyoruz.

CREATE OR REPLACE FUNCTION public.dm_send_media(
  p_other uuid, p_path text, p_kind text, p_mime text, p_name text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 me uuid:=auth.uid(); f_id uuid; new_id uuid; label text; sender_name text;
 obj record;
BEGIN
 IF me IS NULL OR p_other IS NULL OR p_other=me THEN RAISE EXCEPTION 'Gecersiz alici.'; END IF;
 IF p_kind NOT IN ('image','video','audio') OR p_path IS NULL OR
   p_path NOT LIKE (me::text || '/%') OR char_length(p_path)>299 OR
   p_path !~ '^[0-9a-f-]+/[a-zA-Z0-9._-]+$' THEN
     RAISE EXCEPTION 'Dosya yolu gecersiz.';
 END IF;
 IF p_mime NOT IN ('image/jpeg','image/png','image/webp','video/mp4','video/webm',
                   'video/quicktime','audio/webm','audio/mp4','audio/mpeg','audio/ogg') THEN
   RAISE EXCEPTION 'Desteklenmeyen dosya turu.';
 END IF;
 IF (p_kind='image' AND p_mime NOT LIKE 'image/%') OR
    (p_kind='video' AND p_mime NOT LIKE 'video/%') OR
    (p_kind='audio' AND p_mime NOT LIKE 'audio/%') THEN
   RAISE EXCEPTION 'Dosya turu uyusmuyor.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.dm_blocks b WHERE
 (b.blocker_id=me AND b.blocked_id=p_other) OR
 (b.blocker_id=p_other AND b.blocked_id=me)) THEN
   RAISE EXCEPTION 'Bu kisiye mesaj gonderilemiyor.';
 END IF;
 SELECT id INTO f_id FROM public.dm_friendships WHERE
   user_low=LEAST(me,p_other) AND user_high=GREATEST(me,p_other) AND status='accepted';
 IF f_id IS NULL THEN RAISE EXCEPTION 'Mesajlasmak icin arkadas olmalisiniz.'; END IF;
 SELECT name,metadata INTO obj FROM storage.objects
 WHERE bucket_id='dm-media' AND name=p_path AND owner_id=me::text;
 IF NOT FOUND THEN RAISE EXCEPTION 'Yuklenen dosya bulunamadi.'; END IF;
 IF coalesce((obj.metadata->>'size')::bigint,0)>26214400 THEN
  RAISE EXCEPTION 'Dosya boyutu siniri asildi.';
 END IF;
 IF (obj.metadata->>'mimetype') IS DISTINCT FROM p_mime THEN
  RAISE EXCEPTION 'Yuklenen dosyanin turu dogrulanamadi.';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(me::text,0));
 IF EXISTS(SELECT 1 FROM public.dm_messages WHERE sender_id=me
     AND created_at>now()-interval '2 seconds') THEN
  RAISE EXCEPTION 'Yeni mesaj icin 2 saniye bekle.';
 END IF;
 label := CASE p_kind WHEN 'image' THEN '📷 Fotoğraf' WHEN 'video' THEN '🎬 Video' ELSE '🎙 Ses kaydı' END;
 INSERT INTO public.dm_messages(friendship_id,sender_id,recipient_id,body,media_path,media_kind,media_mime,media_name)
 VALUES (f_id,me,p_other,label,p_path,p_kind,p_mime,left(coalesce(p_name,''),110))
 RETURNING id INTO new_id;
 IF to_regclass('public.site_notifications') IS NOT NULL THEN
   SELECT coalesce(nullif(btrim(display_name),''),'Bir üye') INTO sender_name
      FROM public.profiles WHERE id=me;
   INSERT INTO public.site_notifications(user_id,kind,title,body,target_url)
   VALUES(p_other,'dm_message',coalesce(sender_name,'Bir üye') || ' sana dosya gönderdi',label,'/?dm=' || me::text);
 END IF;
 RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.dm_get_media_metadata(p_other uuid)
RETURNS TABLE(message_id uuid,media_path text,media_kind text,media_mime text,media_name text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
SELECT m.id,m.media_path,m.media_kind,m.media_mime,m.media_name
FROM public.dm_messages m
WHERE auth.uid() IS NOT NULL AND
  ((m.sender_id=auth.uid() AND m.recipient_id=p_other)
    OR (m.sender_id=p_other AND m.recipient_id=auth.uid()))
  AND m.media_path IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.dm_friendships f
    WHERE f.user_low=LEAST(auth.uid(),p_other)
    AND f.user_high=GREATEST(auth.uid(),p_other) AND f.status='accepted')
ORDER BY m.created_at DESC LIMIT 100;
$$;

-- DM icinden bir arkadasin kamuya acik temel profil alanlari.
CREATE OR REPLACE FUNCTION public.dm_friend_profile(p_target uuid)
RETURNS TABLE(user_id uuid,display_name text,avatar_url text,bio text,favorite_team text,favorite_driver text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
SELECT p.id,coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.username),''),'Sürücü')::text,
       p.avatar_url::text,p.bio::text,p.favorite_team::text,p.favorite_driver::text
FROM public.profiles p WHERE p.id=p_target AND auth.uid() IS NOT NULL
 AND (p.id=auth.uid() OR EXISTS (
   SELECT 1 FROM public.dm_friendships f
   WHERE f.user_low=LEAST(auth.uid(),p_target)
    AND f.user_high=GREATEST(auth.uid(),p_target) AND f.status='accepted'
 ));
$$;
REVOKE ALL ON FUNCTION public.dm_send_media(uuid,text,text,text,text),
 public.dm_get_media_metadata(uuid),public.dm_friend_profile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dm_send_media(uuid,text,text,text,text),
 public.dm_get_media_metadata(uuid),public.dm_friend_profile(uuid) TO authenticated;


-- Bildirim zilinin WebSocket uzerinden guncellenmesi (mevcut tablo varsa).
DO $$ BEGIN
  IF to_regclass('public.site_notifications') IS NOT NULL
    AND EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
    AND NOT EXISTS(SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime' AND schemaname='public'
         AND tablename='site_notifications') THEN
     ALTER PUBLICATION supabase_realtime ADD TABLE public.site_notifications;
  END IF;
END $$;
