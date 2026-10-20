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
      data-motion={wallpaper.motion ?? motionById[wallpaper.id] ?? "drift"}
      data-has-image={wallpaper.image ? "true" : "false"}
      style={style}
    >
      <div
        className={styles.texture}
        style={{ backgroundImage: wallpaper.image ? wallpaper.fallback : getWallpaperBackground(wallpaper) }}
      />
      {wallpaper.image ? (
        <div className={styles.imageLayer}>
          <img src={wallpaper.image} alt="" decoding="async" />
        </div>
      ) : null}
      <div className={styles.glow} />
      <div className={styles.beam} />
      <div className={styles.grain} />
    </div>
  );
}
