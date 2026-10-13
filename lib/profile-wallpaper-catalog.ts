import type { ProfileWallpaper } from "@/lib/profile-wallpapers";

export const WALLPAPER_MOTIONS = ["drift", "pulse", "rain", "aurora", "speed"] as const;
export type WallpaperMotion = (typeof WALLPAPER_MOTIONS)[number];

export type ManagedWallpaper = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  image_path?: string | null;
  color_a: string;
  color_b: string;
  accent: string;
  motion: WallpaperMotion;
  is_published: boolean;
  sort_order: number;
};

export function hexColor(value: unknown, fallback = "#db243c") {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

export function managedToWallpaper(entry: ManagedWallpaper): ProfileWallpaper {
  const a = hexColor(entry.color_a, "#0a1025");
  const b = hexColor(entry.color_b, "#3d173c");
  const accent = hexColor(entry.accent, "#ef2441");
  const fallback = `radial-gradient(ellipse at 83% 17%, ${accent}55, transparent 43%), linear-gradient(125deg, ${a} 0%, ${b} 58%, ${a} 100%)`;
  // Only backend-generated public Storage URLs are stored by the admin API.
  const image = entry.image_url && /^(https:\/\/|blob:)/.test(entry.image_url) ? entry.image_url : null;
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    image,
    accent,
    fallback,
    motion: WALLPAPER_MOTIONS.includes(entry.motion) ? entry.motion : "drift",
  };
}
