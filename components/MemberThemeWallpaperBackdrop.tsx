import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";
import { getProfileWallpaper, type ProfileWallpaper } from "@/lib/profile-wallpapers";
import { managedToWallpaper, type ManagedWallpaper } from "@/lib/profile-wallpaper-catalog";
import { createAdminClient } from "@/utils/supabase/admin";
import styles from "./MemberThemeWallpaperBackdrop.module.css";

type Props = {
  wallpaper: ProfileWallpaper;
  lightId: string | null;
  redId: string | null;
};

export default async function MemberThemeWallpaperBackdrop({ wallpaper, lightId, redId }: Props) {
  const ids = [lightId, redId].filter((id): id is string => Boolean(id?.startsWith("custom-")));
  const admin = createAdminClient();
  const rows = ids.length ? await admin.from("profile_wallpaper_options")
    .select("id,name,description,image_url,color_a,color_b,accent,motion,is_published,sort_order")
    .in("id", Array.from(new Set(ids))).eq("is_published", true) : { data: [] };
  const custom = new Map((rows.data || []).map(row => [row.id, managedToWallpaper(row as ManagedWallpaper)]));
  const resolve = (id: string | null) => id ? (custom.get(id) || getProfileWallpaper(id)) : wallpaper;
  const light = resolve(lightId);
  const red = resolve(redId);
  return <div aria-hidden="true" className={styles.stage}>
    <div className={styles.dark}><ProfileWallpaperBackdrop wallpaper={wallpaper} /></div>
    <div className={styles.light}><ProfileWallpaperBackdrop wallpaper={light} /></div>
    <div className={styles.red}><ProfileWallpaperBackdrop wallpaper={red} /></div>
  </div>;
}
