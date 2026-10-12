export type ProfileWallpaper = {
  id: string;
  name: string;
  description: string;
  image: string;
  fallback: string;
  accent: string;
};

export const DEFAULT_PROFILE_WALLPAPER =
  "night-grid";

export const PROFILE_WALLPAPERS: ProfileWallpaper[] = [
  {
    id: "night-grid",
    name: "Night Grid",
    description: "Gece yarışı ve grid ışıkları.",
    image: "/profile-wallpapers/night-grid.jpg",
    fallback:
      "radial-gradient(circle at 75% 20%,#253c63 0,transparent 31%),linear-gradient(135deg,#080b11,#111827 52%,#05070b)",
    accent: "#5f8dff",
  },

  {
    id: "red-garage",
    name: "Red Garage",
    description: "Kırmızı pit garage atmosferi.",
    image: "/profile-wallpapers/red-garage.jpg",
    fallback:
      "radial-gradient(circle at 78% 18%,#b9141b 0,transparent 34%),linear-gradient(135deg,#120608,#42090e 48%,#080608)",
    accent: "#ff443c",
  },

  {
    id: "blue-paddock",
    name: "Blue Paddock",
    description: "Soğuk mavi paddock ışıkları.",
    image: "/profile-wallpapers/blue-paddock.jpg",
    fallback:
      "radial-gradient(circle at 72% 22%,#07569a 0,transparent 35%),linear-gradient(135deg,#06101a,#092b49 50%,#04090e)",
    accent: "#37a6ff",
  },

  {
    id: "rain-race",
    name: "Rain Race",
    description: "Yağmur altında gece yarışı.",
    image: "/profile-wallpapers/rain-race.jpg",
    fallback:
      "radial-gradient(circle at 70% 20%,#536270 0,transparent 30%),linear-gradient(135deg,#090d11,#1a232b 53%,#05070a)",
    accent: "#a8c4dc",
  },

  {
    id: "carbon-grid",
    name: "Carbon Grid",
    description: "Minimal karbon ve yarış çizgileri.",
    image: "/profile-wallpapers/carbon-grid.jpg",
    fallback:
      "repeating-linear-gradient(135deg,rgba(255,255,255,.025) 0 2px,transparent 2px 8px),linear-gradient(135deg,#08090b,#1a1b1f 55%,#050506)",
    accent: "#b8bec7",
  },

  {
    id: "neon-circuit",
    name: "Neon Circuit",
    description: "Fütüristik pist ve neon ışıklar.",
    image: "/profile-wallpapers/neon-circuit.jpg",
    fallback:
      "radial-gradient(circle at 74% 18%,#712aa3 0,transparent 31%),radial-gradient(circle at 28% 70%,#004b6f 0,transparent 34%),linear-gradient(135deg,#070812,#171026 55%,#05060a)",
    accent: "#c369ff",
  },
];

export function getProfileWallpaper(
  id?: string | null
) {
  return (
    PROFILE_WALLPAPERS.find(
      (wallpaper) =>
        wallpaper.id === id
    ) ??
    PROFILE_WALLPAPERS.find(
      (wallpaper) =>
        wallpaper.id ===
        DEFAULT_PROFILE_WALLPAPER
    ) ??
    PROFILE_WALLPAPERS[0]
  );
}

export function getWallpaperBackground(
  wallpaper: ProfileWallpaper
) {
  return `
    linear-gradient(
      180deg,
      rgba(4,7,11,.20),
      rgba(4,7,11,.70) 65%,
      rgba(4,7,11,.94)
    ),
    url("${wallpaper.image}"),
    ${wallpaper.fallback}
  `;
}