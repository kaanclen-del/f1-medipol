
import { createAdminClient } from "@/utils/supabase/admin";

/*
  YARIŞ GÖRSELİ TİPLERİ
*/

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

type RaceHeroRecord = {
  image_url: string;
  sort_order: number;
};

const MAX_IMAGES = 5;

/*
  WIKIPEDIA'DA İSTEMEDİĞİMİZ
  GÖRSEL TÜRLERİ
*/

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

/*
  YARIŞ ADINI VERİTABANI
  ANAHTARINA ÇEVİR

  Admin panelindeki slugify
  fonksiyonuyla aynı mantığı kullanır.

  Örnek:
  United States Grand Prix
  ->
  united-states-grand-prix
*/

function getRaceKey(
  raceName: string
): string {
  return raceName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
  URL DÜZENLEME
*/

function normalizeUrl(url: string): string {
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  return url;
}

/*
  TEKRAR EDEN GÖRSELLERİ TEMİZLE
*/

function uniqueImages(
  images: string[]
): string[] {
  const result: string[] = [];

  for (const image of images) {
    const url = image.trim();

    if (
      !url ||
      result.includes(url)
    ) {
      continue;
    }

    result.push(url);

    if (result.length >= MAX_IMAGES) {
      break;
    }
  }

  return result;
}

/*
  ADMIN PANELİNDEN YÜKLENEN
  YARIŞ FOTOĞRAFLARINI AL

  Önceliğimiz her zaman
  yöneticilerin seçtiği görseller.
*/

async function getAdminRaceImages(
  race: RaceForImage
): Promise<string[]> {
  try {
    const raceKey = getRaceKey(
      race.raceName
    );

    if (!raceKey) {
      return [];
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("race_hero_images")
      .select("image_url, sort_order")
      .eq("race_key", raceKey)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(MAX_IMAGES);

    if (error) {
      console.error(
        "RACE HERO DATABASE ERROR:",
        error
      );

      return [];
    }

    const records =
      (data ?? []) as RaceHeroRecord[];

    const images = records
      .map((item) => item.image_url)
      .filter(
        (url): url is string =>
          typeof url === "string" &&
          url.trim().length > 0
      );

    return uniqueImages(images);
  } catch (error) {
    console.error(
      "RACE HERO ADMIN IMAGES ERROR:",
      error
    );

    return [];
  }
}

/*
  WIKIPEDIA FOTOĞRAF KONTROLÜ
*/

function isPhoto(
  item: MediaItem
): boolean {
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

/*
  WIKIPEDIA SAYFASINDAN
  FOTOĞRAFLARI AL

  Bu bölüm yedek kaynak
  olarak kullanılacak.
*/

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

      const sources = item.srcset ?? [];

      /*
        En yüksek çözünürlüklü
        fotoğrafı tercih et.
      */

      const best =
        sources[sources.length - 1];

      if (!best?.src) {
        continue;
      }

      const url = normalizeUrl(
        best.src
      );

      if (!images.includes(url)) {
        images.push(url);
      }

      if (images.length >= MAX_IMAGES) {
        break;
      }
    }

    return images;
  } catch (error) {
    console.error(
      "WIKIPEDIA RACE IMAGES ERROR:",
      error
    );

    return [];
  }
}

/*
  OTOMATİK YEDEK GÖRSELLER

  Önce Grand Prix sayfası,
  ardından pist sayfası kullanılır.
*/

async function getWikipediaRaceImages(
  race: RaceForImage
): Promise<string[]> {
  const images: string[] = [];

  const raceImages =
    await getPageImages(
      race.raceName
    );

  images.push(...raceImages);

  if (images.length >= MAX_IMAGES) {
    return uniqueImages(images);
  }

  const circuitImages =
    await getPageImages(
      race.circuitName
    );

  images.push(...circuitImages);

  return uniqueImages(images);
}

/*
  ANA SAYFANIN KULLANDIĞI
  GÖRSEL SEÇİM SİSTEMİ

  1. Admin görselleri
  2. Wikipedia görselleri
*/

export async function getRaceHeroImages(
  race: RaceForImage
): Promise<string[]> {
  /*
    Önce yönetici tarafından
    yüklenmiş aktif fotoğraflara bak.
  */

  const adminImages =
    await getAdminRaceImages(race);

  if (adminImages.length > 0) {
    return adminImages;
  }

  /*
    O yarış için aktif fotoğraf
    bulunmuyorsa Wikipedia'yı kullan.
  */

  return getWikipediaRaceImages(race);
}

/*
  TEK BİR YARIŞ GÖRSELİ GEREKEN
  SAYFALAR İÇİN
*/

export async function getRaceHeroImage(
  race: RaceForImage
): Promise<string | null> {
  const images =
    await getRaceHeroImages(race);

  return images[0] ?? null;
}
