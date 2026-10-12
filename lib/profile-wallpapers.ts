export type ProfileWallpaper = {
  id: string;
  name: string;
  description: string;

  /*
    Şimdilik null.
    Daha sonra sen gerçek görselleri verdiğinde:
    /profile-wallpapers/xxx.jpg
    şeklinde bağlayacağız.
  */
  image: string | null;

  /*
    Görsel yüklenmeden önce kullanılan
    tamamen CSS tabanlı F1 wallpaper.
  */
  fallback: string;

  accent: string;
};

export const DEFAULT_PROFILE_WALLPAPER =
  "night-grid";

export const PROFILE_WALLPAPERS: ProfileWallpaper[] = [
  /* =====================================================
     01 — NIGHT GRID
     ===================================================== */

  {
    id: "night-grid",

    name: "Night Grid",

    description:
      "Gece yarışı, grid çizgileri ve soğuk pist ışıkları.",

    image: null,

    accent: "#6d96ff",

    fallback: `
      radial-gradient(
        circle at 72% 22%,
        rgba(88,132,255,.34) 0 1.5%,
        transparent 17%
      ),

      radial-gradient(
        circle at 18% 75%,
        rgba(37,91,180,.22),
        transparent 28%
      ),

      repeating-linear-gradient(
        90deg,
        transparent 0 118px,
        rgba(120,160,255,.055) 119px,
        transparent 120px
      ),

      repeating-linear-gradient(
        0deg,
        transparent 0 72px,
        rgba(255,255,255,.025) 73px,
        transparent 74px
      ),

      linear-gradient(
        115deg,
        transparent 0 56%,
        rgba(89,127,225,.12) 56.2% 56.5%,
        transparent 56.8%
      ),

      linear-gradient(
        135deg,
        #05070b 0%,
        #0c1422 46%,
        #101d32 69%,
        #05070b 100%
      )
    `,
  },

  /* =====================================================
     02 — RED START LIGHTS
     ===================================================== */

  {
    id: "red-garage",

    name: "Red Start",

    description:
      "Start ışıkları, kırmızı yarış enerjisi ve pit duvarı atmosferi.",

    image: null,

    accent: "#ff4239",

    fallback: `
      radial-gradient(
        circle at 69% 24%,
        #ff2d25 0 1.3%,
        rgba(255,45,37,.40) 1.5% 3%,
        transparent 7%
      ),

      radial-gradient(
        circle at 76% 24%,
        #ff2d25 0 1.3%,
        rgba(255,45,37,.40) 1.5% 3%,
        transparent 7%
      ),

      radial-gradient(
        circle at 83% 24%,
        #ff2d25 0 1.3%,
        rgba(255,45,37,.40) 1.5% 3%,
        transparent 7%
      ),

      radial-gradient(
        circle at 90% 24%,
        #ff2d25 0 1.3%,
        rgba(255,45,37,.40) 1.5% 3%,
        transparent 7%
      ),

      linear-gradient(
        110deg,
        transparent 0 49%,
        rgba(255,57,48,.18) 49.2% 49.7%,
        transparent 50%
      ),

      repeating-linear-gradient(
        -18deg,
        transparent 0 47px,
        rgba(255,255,255,.018) 48px,
        transparent 49px
      ),

      radial-gradient(
        circle at 80% 25%,
        rgba(225,6,0,.28),
        transparent 31%
      ),

      linear-gradient(
        135deg,
        #090506,
        #260609 47%,
        #52090e 72%,
        #080506
      )
    `,
  },

  /* =====================================================
     03 — BLUE PADDOCK
     ===================================================== */

  {
    id: "blue-paddock",

    name: "Blue Paddock",

    description:
      "Teknolojik paddock ışıkları ve modern mavi pit alanı.",

    image: null,

    accent: "#2bb7ff",

    fallback: `
      linear-gradient(
        90deg,
        transparent 0 63%,
        rgba(56,177,255,.18) 63% 63.25%,
        transparent 63.5%
      ),

      linear-gradient(
        90deg,
        transparent 0 72%,
        rgba(77,199,255,.08) 72% 72.2%,
        transparent 72.4%
      ),

      repeating-linear-gradient(
        0deg,
        transparent 0 54px,
        rgba(78,187,255,.035) 55px,
        transparent 56px
      ),

      radial-gradient(
        ellipse at 78% 32%,
        rgba(24,170,255,.32),
        transparent 23%
      ),

      radial-gradient(
        ellipse at 22% 85%,
        rgba(0,84,150,.24),
        transparent 30%
      ),

      linear-gradient(
        140deg,
        #030a11,
        #071827 45%,
        #092d47 72%,
        #02070c
      )
    `,
  },

  /* =====================================================
     04 — RAIN RACE
     ===================================================== */

  {
    id: "rain-race",

    name: "Wet Race",

    description:
      "Yağmurlu gece yarışı, pist yansımaları ve ıslak asfalt.",

    image: null,

    accent: "#b3d9ef",

    fallback: `
      repeating-linear-gradient(
        104deg,
        transparent 0 13px,
        rgba(205,231,245,.055) 14px,
        transparent 15px 28px
      ),

      linear-gradient(
        178deg,
        transparent 0 62%,
        rgba(168,216,242,.10) 63%,
        rgba(80,146,181,.04) 67%,
        transparent 72%
      ),

      radial-gradient(
        ellipse at 71% 31%,
        rgba(187,226,246,.21),
        transparent 24%
      ),

      radial-gradient(
        ellipse at 23% 73%,
        rgba(58,93,113,.28),
        transparent 34%
      ),

      linear-gradient(
        135deg,
        #080c10,
        #121b22 44%,
        #253640 72%,
        #070a0d
      )
    `,
  },

  /* =====================================================
     05 — CARBON RACING
     ===================================================== */

  {
    id: "carbon-grid",

    name: "Carbon Racing",

    description:
      "Karbon fiber dokusu, kırmızı yarış çizgisi ve teknik görünüm.",

    image: null,

    accent: "#d5dae0",

    fallback: `
      linear-gradient(
        107deg,
        transparent 0 68%,
        rgba(225,6,0,.72) 68.1% 68.65%,
        transparent 68.8%
      ),

      linear-gradient(
        107deg,
        transparent 0 72%,
        rgba(255,255,255,.13) 72.1% 72.25%,
        transparent 72.4%
      ),

      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,.018) 0 3px,
        transparent 3px 8px
      ),

      repeating-linear-gradient(
        -45deg,
        rgba(255,255,255,.012) 0 3px,
        transparent 3px 8px
      ),

      radial-gradient(
        circle at 78% 20%,
        rgba(225,6,0,.15),
        transparent 27%
      ),

      linear-gradient(
        135deg,
        #050506,
        #131416 48%,
        #1b1c1f 71%,
        #050506
      )
    `,
  },

  /* =====================================================
     06 — NEON CIRCUIT
     ===================================================== */

  {
    id: "neon-circuit",

    name: "Neon Circuit",

    description:
      "Fütüristik gece pisti, mor ve cyan neon yarış atmosferi.",

    image: null,

    accent: "#cc68ff",

    fallback: `
      radial-gradient(
        ellipse at 74% 23%,
        rgba(191,70,255,.30),
        transparent 22%
      ),

      radial-gradient(
        ellipse at 24% 72%,
        rgba(0,190,255,.22),
        transparent 27%
      ),

      linear-gradient(
        121deg,
        transparent 0 52%,
        rgba(203,93,255,.28) 52.15% 52.45%,
        transparent 52.7%
      ),

      linear-gradient(
        144deg,
        transparent 0 38%,
        rgba(0,194,255,.21) 38.1% 38.35%,
        transparent 38.55%
      ),

      repeating-linear-gradient(
        90deg,
        transparent 0 110px,
        rgba(131,97,255,.04) 111px,
        transparent 112px
      ),

      linear-gradient(
        135deg,
        #060611,
        #151027 48%,
        #21113a 69%,
        #04060b
      )
    `,
  },

  /* =====================================================
     07 — TELEMETRY
     ===================================================== */

  {
    id: "telemetry",

    name: "Telemetry",

    description:
      "Canlı timing, telemetri grafikleri ve yarış kontrol ekranı.",

    image: null,

    accent: "#47e8a2",

    fallback: `
      linear-gradient(
        90deg,
        transparent 0 14%,
        rgba(75,235,165,.19) 14.1% 14.3%,
        transparent 14.4% 31%,
        rgba(75,235,165,.08) 31.1% 31.2%,
        transparent 31.3%
      ),

      repeating-linear-gradient(
        0deg,
        transparent 0 42px,
        rgba(75,235,165,.038) 43px,
        transparent 44px
      ),

      repeating-linear-gradient(
        90deg,
        transparent 0 72px,
        rgba(75,235,165,.022) 73px,
        transparent 74px
      ),

      linear-gradient(
        168deg,
        transparent 0 56%,
        rgba(62,234,154,.23) 56.1% 56.35%,
        transparent 56.5%
      ),

      radial-gradient(
        circle at 79% 20%,
        rgba(44,218,145,.16),
        transparent 29%
      ),

      linear-gradient(
        135deg,
        #030907,
        #071712 47%,
        #0b2820 69%,
        #020705
      )
    `,
  },

  /* =====================================================
     08 — CHECKERED FLAG
     ===================================================== */

  {
    id: "checkered",

    name: "Chequered",

    description:
      "Damali bayrak dokusu ve klasik yarış bitiş atmosferi.",

    image: null,

    accent: "#ffffff",

    fallback: `
      linear-gradient(
        125deg,
        transparent 0 61%,
        rgba(225,6,0,.52) 61.1% 61.6%,
        transparent 61.8%
      ),

      repeating-conic-gradient(
        from 45deg at 84% 28%,
        rgba(255,255,255,.07) 0 25%,
        rgba(0,0,0,.05) 0 50%
      ),

      radial-gradient(
        circle at 82% 27%,
        rgba(255,255,255,.10),
        transparent 30%
      ),

      linear-gradient(
        135deg,
        #090a0c,
        #1a1c20 50%,
        #282a2e 72%,
        #07080a
      )
    `,
  },
  {
    id: "sunburst-yellow",
    name: "Sunburst Yellow",
    description: "Sarı pist ışıkları, sıcak yarış atmosferi.",
    image: null,
    accent: "#ffdc48",
    fallback: `
      radial-gradient(ellipse at 78% 28%, rgba(255,219,68,.38) 0%, transparent 33%),
      repeating-linear-gradient(112deg, transparent 0 62px, rgba(255,255,255,.055) 63px, transparent 64px),
      linear-gradient(112deg, transparent 0 55%, rgba(255,219,68,.38) 55.2% 55.5%, transparent 55.8%),
      radial-gradient(ellipse at 16% 82%, rgba(255,219,68,.38), transparent 38%),
      linear-gradient(135deg, #332706 0%, #735616 58%, #332706 100%)
    `,
  },
  {
    id: "amethyst-night",
    name: "Amethyst Night",
    description: "Mor neonlar, gece pisti ve ışık izleri.",
    image: null,
    accent: "#bc78ff",
    fallback: `
      radial-gradient(ellipse at 78% 28%, rgba(173,95,255,.39) 0%, transparent 33%),
      repeating-linear-gradient(112deg, transparent 0 62px, rgba(255,255,255,.055) 63px, transparent 64px),
      linear-gradient(112deg, transparent 0 55%, rgba(173,95,255,.39) 55.2% 55.5%, transparent 55.8%),
      radial-gradient(ellipse at 16% 82%, rgba(173,95,255,.39), transparent 38%),
      linear-gradient(135deg, #150824 0%, #421b60 58%, #150824 100%)
    `,
  },
  {
    id: "emerald-speed",
    name: "Emerald Speed",
    description: "Yeşil yarış enerjisi ve parlak pist çizgileri.",
    image: null,
    accent: "#4dfbb1",
    fallback: `
      radial-gradient(ellipse at 78% 28%, rgba(50,225,148,.35) 0%, transparent 33%),
      repeating-linear-gradient(112deg, transparent 0 62px, rgba(255,255,255,.055) 63px, transparent 64px),
      linear-gradient(112deg, transparent 0 55%, rgba(50,225,148,.35) 55.2% 55.5%, transparent 55.8%),
      radial-gradient(ellipse at 16% 82%, rgba(50,225,148,.35), transparent 38%),
      linear-gradient(135deg, #061f16 0%, #12523a 58%, #061f16 100%)
    `,
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

export function getProfileWallpaper(
  id?: string | null
) {
  return (
    PROFILE_WALLPAPERS.find(
      (wallpaper) =>
        wallpaper.id ===
        id
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
  /*
    Daha sonra gerçek görsel bağlandığında:
    - Görsel üstte
    - CSS fallback altta kalacak.

    Şimdilik image null olduğu için
    sadece özel CSS tasarımı kullanılıyor.
  */

  if (
    wallpaper.image
  ) {
    return `
      linear-gradient(
        180deg,
        rgba(3,6,10,.16),
        rgba(3,6,10,.51) 58%,
        rgba(3,6,10,.87)
      ),
      url("${wallpaper.image}"),
      ${wallpaper.fallback}
    `;
  }

  return `
    linear-gradient(
      180deg,
      rgba(3,6,10,.04),
      rgba(3,6,10,.18) 62%,
      rgba(3,6,10,.54)
    ),
    ${wallpaper.fallback}
  `;
}