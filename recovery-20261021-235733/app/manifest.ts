import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "F1 SOCIAL",
    short_name: "F1 SOCIAL",
    description: "F1 SOCIAL yarÄ±ÅŸ tahminleri, etkinlikler ve Arcade.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0d13",
    theme_color: "#cf151d",
    lang: "tr",
    categories: ["sports", "entertainment"],
    icons: [
      { src: "/icon.png", type: "image/png", sizes: "any", purpose: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180", purpose: "any" },
    ],
  };
}

