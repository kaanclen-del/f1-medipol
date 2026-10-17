import type { CSSProperties } from "react";
import {
  getWallpaperBackground,
  type ProfileWallpaper,
} from "@/lib/profile-wallpapers";
import styles from "./ProfileWallpaperBackdrop.module.css";

const motionById: Record<string, "drift" | "pulse" | "rain" | "aurora" | "speed"> = {
  "night-grid": "drift",
  "red-garage": "pulse",
  "blue-paddock": "speed",
  "rain-race": "rain",
  "carbon-grid": "drift",
  "neon-circuit": "aurora",
  "telemetry": "speed",
  "checkered": "drift",
  "sunburst-yellow": "pulse",
  "amethyst-night": "aurora",
  "emerald-speed": "speed",
  "solar-flare": "pulse",
  "polar-ice": "aurora",
  "magenta-rush": "speed",
  "copper-night": "drift",
};

export default function ProfileWallpaperBackdrop({
  wallpaper,
}: {
  wallpaper: ProfileWallpaper;
}) {
  const style = {
    "--wall-accent": wallpaper.accent,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={styles.root}
      data-motion={motionById[wallpaper.id] ?? "drift"}
      style={style}
    >
      <div
        className={styles.texture}
        style={{ backgroundImage: getWallpaperBackground(wallpaper) }}
      />
      <div className={styles.glow} />
      <div className={styles.beam} />
      <div className={styles.grain} />
    </div>
  );
}
