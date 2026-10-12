/**
 * Kaynaklı Formula 1 gündemi. Pilot açıklamaları, ceza/komiser kararları ve
 * yarış öncesi gelişmeler. RSS manşetleri doğrulanmamış doğrudan alıntı olarak
 * değil, kaynak bağlantısı bulunan haber başlıkları olarak sunulur.
 * Boş akışta haber uydurulmaz.
 */
export type DriverNewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: "GRAND PRIX" | "CEZA VE HAKEM KARARLARI" | "F1 GÜNDEMİ";
};

const DRIVER_NAMES = [
  "verstappen", "norris", "piastri", "leclerc", "hamilton", "russell", "alonso",
  "sainz", "gasly", "ocon", "bearman", "antonelli", "hadjar", "lawson",
  "albon", "hulkenberg", "bortoleto", "colapinto", "stroll", "bottas", "perez",
];

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
      const e = entity.toLowerCase();
      if (e.startsWith("#x")) {
        const code = parseInt(e.slice(2), 16);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      }
      if (e.startsWith("#")) {
        const code = parseInt(e.slice(1), 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      }
      return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " } as Record<string, string>)[e] ?? "";
    }).trim();
}

function xmlField(xml: string, name: string): string {
  const found = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return found ? decodeXml(found[1]) : "";
}

function raceKeywords(raceName: string, city: string): string[] {
  const key = raceName.replace(/\s+Grand Prix$/i, "").toLowerCase();
  const terms = [key, city.toLowerCase()];
  if (key.includes("united states")) terms.push("austin", "cota", "us gp");
  if (key.includes("mexico")) terms.push("mexican gp", "mexico city");
  if (key.includes("são paulo") || key.includes("sao paulo")) terms.push("interlagos", "brazilian gp");
  if (key.includes("qatar")) terms.push("lusail");
  if (key.includes("abu dhabi")) terms.push("yas marina");
  return terms.filter((v) => v.length > 3);
}

function classify(title: string, relatedRace: boolean): DriverNewsItem["category"] {
  if (/penalt|steward|grid drop|grid penalty|disqualif|investigat|fia ruling|reprimand|sanction|ceza|hakem/i.test(title)) {
    return "CEZA VE HAKEM KARARLARI";
  }
  return relatedRace ? "GRAND PRIX" : "F1 GÜNDEMİ";
}

async function readFeed(query: string, oldest: number): Promise<DriverNewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4200) });
    if (!response.ok) return [];
    const xml = await response.text();
    if (xml.length > 1200000) return [];
    const items: DriverNewsItem[] = [];
    const now = Date.now();
    for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const part = match[1];
      const rawTitle = xmlField(part, "title");
      const rawLink = xmlField(part, "link");
      const pubDate = Date.parse(xmlField(part, "pubDate"));
      const source = xmlField(part, "source") || "Haber Kaynağı";
      if (!rawTitle || !rawLink || !Number.isFinite(pubDate) || pubDate < oldest || pubDate > now + 60000) continue;
      if (/motogp|formula e|nascar|indycar/i.test(rawTitle)) continue;
      let link: URL;
      try { link = new URL(rawLink); } catch { continue; }
      if (link.protocol !== "https:" || link.hostname !== "news.google.com") continue;
      const title = rawTitle.endsWith(` - ${source}`)
        ? rawTitle.slice(0, -source.length - 3).trim()
        : rawTitle;
      items.push({ title, source, url: link.toString(), publishedAt: new Date(pubDate).toISOString(), category: "F1 GÜNDEMİ" });
      if (items.length >= 22) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function getUpcomingDriverNews(
  race: { raceName: string; city: string; raceDate: string } | null
): Promise<DriverNewsItem[]> {
  if (!race) return [];
  const year = Number(race.raceDate.slice(0, 4));
  if (!Number.isInteger(year)) return [];
  const raceLabel = race.raceName.replace(/\s+Grand Prix$/i, "");
  const now = Date.now();
  const oldest = now - 21 * 86400000;
  const feeds = await Promise.all([
    readFeed(`"${raceLabel}" "Formula 1" ${year} when:21d`, oldest),
    readFeed(`Formula 1 FIA stewards penalty grid investigation ${year} when:14d`, oldest),
    readFeed(`F1 drivers teams paddock ${year} when:7d`, oldest),
  ]);
  const keyWords = raceKeywords(race.raceName, race.city);
  const seen = new Set<string>();
  const combined: { item: DriverNewsItem; priority: number }[] = [];
  for (const [feedIndex, feed] of feeds.entries()) {
    for (const entry of feed) {
      const lower = entry.title.toLowerCase();
      const raceRelated = keyWords.some((keyword) => lower.includes(keyword));
      const hasF1 = /\bf1\b|formula\s*1|grand prix|fia|ferrari|mclaren|mercedes|red bull racing|aston martin|haas/i.test(lower);
      const driverMentioned = DRIVER_NAMES.some((name) => lower.includes(name));
      // Genel kaynaklardan yarışla alakasız spor haberlerini ele.
      if (feedIndex !== 0 && !hasF1 && !driverMentioned) continue;
      if (feedIndex === 0 && !raceRelated) continue;
      const normalized = lower.replace(/[^a-z0-9]/g, "");
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      const category = classify(entry.title, raceRelated);
      combined.push({ item: { ...entry, category }, priority: raceRelated ? 3 : category === "CEZA VE HAKEM KARARLARI" ? 2 : 1 });
    }
  }
  return combined.sort((a, b) => b.priority - a.priority || Date.parse(b.item.publishedAt) - Date.parse(a.item.publishedAt))
    .slice(0, 9).map(({ item }) => item);
}
