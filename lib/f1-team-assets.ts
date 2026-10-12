export type F1TeamAsset = {
  key: string;
  car: string;
};

const TEAM_ASSETS: F1TeamAsset[] = [
  {
    key: "ferrari",
    car: "/f1-cars/ferrari.png",
  },
  {
    key: "mclaren",
    car: "/f1-cars/mclaren.png",
  },
  {
    key: "mercedes",
    car: "/f1-cars/mercedes.png",
  },
  {
    key: "red bull",
    car: "/f1-cars/red-bull.png",
  },
  {
    key: "aston martin",
    car: "/f1-cars/aston-martin.png",
  },
  {
    key: "alpine",
    car: "/f1-cars/alpine.png",
  },
  {
    key: "williams",
    car: "/f1-cars/williams.png",
  },
  {
    key: "haas",
    car: "/f1-cars/haas.png",
  },
  {
    key: "racing bulls",
    car: "/f1-cars/racing-bulls.png",
  },
  {
    key: "rb",
    car: "/f1-cars/racing-bulls.png",
  },
  {
    key: "audi",
    car: "/f1-cars/audi.png",
  },
  {
    key: "cadillac",
    car: "/f1-cars/cadillac.png",
  },
];

function normalizeTeamName(
  teamName: string
) {
  return teamName
    .trim()
    .toLowerCase()
    .replaceAll("-", " ")
    .replace(/\s+/g, " ");
}

export function getF1TeamCar(
  teamName: string
): string | null {
  const normalized =
    normalizeTeamName(
      teamName
    );

  /*
    Önce uzun isimleri kontrol ediyoruz.

    Örneğin:
    "Red Bull Racing"
    "Visa Cash App Racing Bulls"
  */

  if (
    normalized.includes(
      "racing bulls"
    )
  ) {
    return "/f1-cars/racing-bulls.png";
  }

  if (
    normalized.includes(
      "red bull"
    )
  ) {
    return "/f1-cars/red-bull.png";
  }

  if (
    normalized.includes(
      "aston martin"
    )
  ) {
    return "/f1-cars/aston-martin.png";
  }

  /*
    Diğer takımlar.
  */

  const match =
    TEAM_ASSETS.find(
      (team) =>
        normalized.includes(
          team.key
        )
    );

  return (
    match?.car ??
    null
  );
}