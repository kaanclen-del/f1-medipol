export type TeamBranding = {
  name: string;
  color: string;
  secondaryColor: string;
  logoUrl: string;
  logoShape: "wide" | "square";
  aliases?: string[];
};

function commons(file: string) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    file
  )}`;
}

function enWiki(file: string) {
  return `https://en.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    file
  )}`;
}

function deWiki(file: string) {
  return `https://de.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    file
  )}`;
}

function roWiki(file: string) {
  return `https://ro.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    file
  )}`;
}

function frWiki(file: string) {
  return `https://fr.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(
    file
  )}`;
}

export const TEAM_BRANDING: TeamBranding[] = [
  {
    name: "McLaren",
    color: "#FF8000",
    secondaryColor: "#FFFFFF",
    logoUrl: commons(
      "McLaren logo (2026).svg"
    ),
    logoShape: "wide",
  },

  {
    name: "Ferrari",
    color: "#E8002D",
    secondaryColor: "#FFF200",

    /*
      KLASİK FERRARI AMBLEMİ
      Sarı zemin + siyah Cavallino Rampante
    */

    logoUrl: frWiki(
      "Ferrari-Logo.svg"
    ),

    logoShape: "square",
  },

  {
    name: "Mercedes",
    color: "#27F4D2",
    secondaryColor: "#111111",
    logoUrl: commons(
      "Mercedes-AMG Petronas F1 Team logo (2026).svg"
    ),
    logoShape: "square",
  },

  {
    name: "Red Bull Racing",
    color: "#3671C6",
    secondaryColor: "#E10600",
    logoUrl: deWiki(
      "Red Bull Racing logo.svg"
    ),
    logoShape: "wide",
    aliases: [
      "Red Bull",
      "Oracle Red Bull Racing",
    ],
  },

  {
    name: "Aston Martin",
    color: "#229971",
    secondaryColor: "#CEDC00",
    logoUrl: roWiki(
      "Aston Martin Aramco F1.svg"
    ),
    logoShape: "wide",
    aliases: [
      "Aston Martin Aramco",
    ],
  },

  {
    name: "Williams",
    color: "#1868DB",
    secondaryColor: "#FFFFFF",
    logoUrl: commons(
      "Atlassian Williams F1 Team logo.svg"
    ),
    logoShape: "square",
    aliases: [
      "Williams Racing",
    ],
  },

  {
    name: "Racing Bulls",
    color: "#6692FF",
    secondaryColor: "#FFFFFF",
    logoUrl: enWiki(
      "VCARB F1 logo.svg"
    ),
    logoShape: "wide",
    aliases: [
      "VCARB",
      "Visa Cash App Racing Bulls",
    ],
  },

  {
    name: "Haas",
    color: "#DEE1E2",
    secondaryColor: "#E6002D",
    logoUrl: commons(
      "TGR Haas F1 Team Logo (2026).svg"
    ),
    logoShape: "square",
    aliases: [
      "Haas F1 Team",
      "TGR Haas F1 Team",
    ],
  },

  {
    name: "Alpine",
    color: "#00A1E8",
    secondaryColor: "#FF87BC",
    logoUrl: commons(
      "BWT Alpine F1 Team Logo.png"
    ),
    logoShape: "wide",
    aliases: [
      "Alpine F1 Team",
      "BWT Alpine",
    ],
  },

  {
    name: "Audi",
    color: "#F50537",
    secondaryColor: "#FFFFFF",
    logoUrl: commons(
      "Audif1.com logo17 (cropped).svg"
    ),
    logoShape: "square",
    aliases: [
      "Audi F1 Team",
      "Audi Revolut F1 Team",
    ],
  },

  {
    name: "Cadillac",
    color: "#AAAAAD",
    secondaryColor: "#FFFFFF",
    logoUrl: commons(
      "Cadillac Formula 1 Team logo.png"
    ),
    logoShape: "wide",
    aliases: [
      "Cadillac F1 Team",
      "Cadillac Formula 1 Team",
    ],
  },
];

export function getTeamBranding(
  teamName?: string | null
): TeamBranding | null {
  if (!teamName) {
    return null;
  }

  const normalized =
    teamName.trim().toLowerCase();

  return (
    TEAM_BRANDING.find((team) => {
      if (
        team.name.toLowerCase() ===
        normalized
      ) {
        return true;
      }

      return team.aliases?.some(
        (alias) =>
          alias.toLowerCase() ===
          normalized
      );
    }) ?? null
  );
}