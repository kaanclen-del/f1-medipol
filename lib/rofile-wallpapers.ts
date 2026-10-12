// Eski yazım hatalı import yolunu kullanan sayfalar için uyumluluk katmanı.
// Tek kaynak: lib/profile-wallpapers.ts
import {
  PROFILE_WALLPAPERS as canonical,
  DEFAULT_PROFILE_WALLPAPER,
  getProfileWallpaper as getCanonicalProfileWallpaper,
  getWallpaperBackground as getCanonicalWallpaperBackground,
} from "./profile-wallpapers";

export type ProfileWallpaper = {
  id: string; name: string; description: string; image: string; fallback: string; accent: string;
};
export { DEFAULT_PROFILE_WALLPAPER };
export const PROFILE_WALLPAPERS: ProfileWallpaper[] = canonical.map((item) => ({
  ...item, image: item.image ?? "",
}));
export function getProfileWallpaper(id?: string | null): ProfileWallpaper {
  const item = getCanonicalProfileWallpaper(id);
  return {...item, image: item.image ?? ""};
}
export function getWallpaperBackground(wallpaper: ProfileWallpaper) {
  return getCanonicalWallpaperBackground({ ...wallpaper, image: wallpaper.image || null });
}
