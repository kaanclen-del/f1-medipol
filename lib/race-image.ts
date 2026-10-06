type RaceForImage = {
  raceName: string;
  circuitName: string;
  city: string;
  country: string;
};

type MediaItem = {
  title?: string;
  type?: string;
  srcset?: {
    src?: string;
    scale?: string;
  }[];
};

type MediaResponse = {
  items?: MediaItem[];
};

const BAD_WORDS = [
  "logo",
  "map",
  "layout",
  "diagram",
  "icon",
  "flag",
  "helmet",
  "portrait",
  "poster",
  "ticket",
  "badge",
  "symbol",
];

function normalizeUrl(url: string) {
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return url;
}

function isPhoto(item: MediaItem) {
  const title =
    item.title?.toLowerCase() ?? "";

  if (item.type !== "image") {
    return false;
  }

  if (title.endsWith(".svg")) {
    return false;
  }

  if (
    BAD_WORDS.some((word) =>
      title.includes(word)
    )
  ) {
    return false;
  }

  return (
    title.endsWith(".jpg") ||
    title.endsWith(".jpeg") ||
    title.endsWith(".png") ||
    title.endsWith(".webp")
  );
}

async function getPageImages(
  pageTitle: string
): Promise<string[]> {
  try {
    const title = encodeURIComponent(
      pageTitle.replaceAll(" ", "_")
    );

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${title}`,
      {
        cache: "no-store",

        headers: {
          "User-Agent":
            "F1-Medipol-Website/1.0",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data =
      (await response.json()) as MediaResponse;

    const images: string[] = [];

    for (const item of data.items ?? []) {
      if (!isPhoto(item)) {
        continue;
      }

      const sources =
        item.srcset ?? [];

      /*
        En yüksek çözünürlüklü
        görseli seç.
      */

      const best =
        sources[sources.length - 1];

      if (!best?.src) {
        continue;
      }

      const url =
        normalizeUrl(best.src);

      if (!images.includes(url)) {
        images.push(url);
      }
    }

    return images;
  } catch {
    return [];
  }
}

export async function getRaceHeroImages(
  race: RaceForImage
): Promise<string[]> {
  const images: string[] = [];

  /*
    Önce yarış sayfası:
    Singapore Grand Prix gibi.
  */

  const raceImages =
    await getPageImages(
      race.raceName
    );

  for (const image of raceImages) {
    if (!images.includes(image)) {
      images.push(image);
    }

    if (images.length >= 5) {
      return images;
    }
  }

  /*
    Yeterli sonuç yoksa
    pist sayfasını da tara.
  */

  const circuitImages =
    await getPageImages(
      race.circuitName
    );

  for (const image of circuitImages) {
    if (!images.includes(image)) {
      images.push(image);
    }

    if (images.length >= 5) {
      return images;
    }
  }

  return images.slice(0, 5);
}

export async function getRaceHeroImage(
  race: RaceForImage
): Promise<
  string | null
> {
  const images =
    await getRaceHeroImages(race);

  return images[0] ?? null;
}