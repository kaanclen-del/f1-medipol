type WikimediaPage = {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    url?: string;
  }[];
};

export async function getRaceHeroImages(
  raceName: string,
  circuitName: string,
  city: string
): Promise<string[]> {
  try {
    const searchText =
      `${raceName} ${circuitName} ${city} Formula One Grand Prix race`;

    const url =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: searchText,
        gsrnamespace: "6",
        gsrlimit: "25",
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: "1800",
        format: "json",
        origin: "*",
      }).toString();

    const response = await fetch(url, {
      next: {
        revalidate: 86400,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    const pages: WikimediaPage[] = Object.values(
      data?.query?.pages || {}
    );

    const blockedWords = [
      "logo",
      "map",
      "icon",
      "diagram",
      "flag",
      "helmet",
      "portrait",
      "headshot",
      "poster",
      "ticket",
      "programme",
      "program",
    ];

    const images = pages
      .filter((page) => {
        const title =
          page.title?.toLowerCase() || "";

        const hasBlockedWord =
          blockedWords.some((word) =>
            title.includes(word)
          );

        const hasImage =
          Boolean(page.imageinfo?.[0]);

        return !hasBlockedWord && hasImage;
      })
      .map((page) => {
        return (
          page.imageinfo?.[0]?.thumburl ||
          page.imageinfo?.[0]?.url ||
          null
        );
      })
      .filter(
        (image): image is string =>
          Boolean(image)
      );

    /*
      Aynı görselin tekrar gelmesini engelliyoruz.
    */

    const uniqueImages = [
      ...new Set(images),
    ];

    /*
      Hero için maksimum 5 görsel kullanıyoruz.
    */

    return uniqueImages.slice(0, 5);
  } catch {
    return [];
  }
}

/*
  Eski sistem şimdilik çalışmaya devam etsin.

  page.tsx şu anda getRaceHeroImage kullanıyor.
  Bir sonraki adımda onu 5 görsellik kayan sisteme
  dönüştüreceğiz.
*/

export async function getRaceHeroImage(
  raceName: string,
  circuitName: string,
  city: string
): Promise<string | null> {
  const images =
    await getRaceHeroImages(
      raceName,
      circuitName,
      city
    );

  return images[0] || null;
}