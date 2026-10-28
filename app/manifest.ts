
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const icon = "/f1-social-push-icon.png";

  return {
    id: "/",
    name: "F1 SOCIAL",
    short_name: "F1 SOCIAL",
    description: "F1 SOCIAL yarış tahminleri, etkinlikler ve Arcade.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0d13",
    theme_color: "#cf151d",
    lang: "tr",
    categories: ["sports", "entertainment"],
    icons: [
      {
        src: icon,
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
    ],
  };
}
