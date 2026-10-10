export type ProfileAccent = {
  id: string;
  name: string;

  primary: string;
  secondary: string;

  soft: string;
  glow: string;
};

export const DEFAULT_PROFILE_ACCENT =
  "f1-red";

export const PROFILE_ACCENTS: ProfileAccent[] = [
  {
    id: "f1-red",
    name: "F1 Red",

    primary: "#ff443c",
    secondary: "#c90000",

    soft: "rgba(255,68,60,.12)",
    glow: "rgba(255,68,60,.32)",
  },

  {
    id: "papaya",
    name: "Papaya",

    primary: "#ff8700",
    secondary: "#c85f00",

    soft: "rgba(255,135,0,.12)",
    glow: "rgba(255,135,0,.30)",
  },

  {
    id: "electric-blue",
    name: "Electric Blue",

    primary: "#5c91ff",
    secondary: "#2759c7",

    soft: "rgba(92,145,255,.12)",
    glow: "rgba(92,145,255,.30)",
  },

  {
    id: "cyan",
    name: "Velocity Cyan",

    primary: "#2bd9fe",
    secondary: "#0589b7",

    soft: "rgba(43,217,254,.12)",
    glow: "rgba(43,217,254,.30)",
  },

  {
    id: "purple",
    name: "Neon Purple",

    primary: "#bb6cff",
    secondary: "#7234b9",

    soft: "rgba(187,108,255,.12)",
    glow: "rgba(187,108,255,.30)",
  },

  {
    id: "emerald",
    name: "Racing Green",

    primary: "#3ddd9a",
    secondary: "#128558",

    soft: "rgba(61,221,154,.12)",
    glow: "rgba(61,221,154,.29)",
  },

  {
    id: "silver",
    name: "Silver",

    primary: "#cbd2dc",
    secondary: "#727d8a",

    soft: "rgba(203,210,220,.11)",
    glow: "rgba(203,210,220,.24)",
  },

  {
    id: "gold",
    name: "Champion Gold",

    primary: "#f0c75e",
    secondary: "#a47618",

    soft: "rgba(240,199,94,.12)",
    glow: "rgba(240,199,94,.28)",
  },
];

export function getProfileAccent(
  id?: string | null
) {
  return (
    PROFILE_ACCENTS.find(
      (accent) =>
        accent.id === id
    ) ??
    PROFILE_ACCENTS.find(
      (accent) =>
        accent.id ===
        DEFAULT_PROFILE_ACCENT
    ) ??
    PROFILE_ACCENTS[0]
  );
}