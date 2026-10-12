import type { RaceWeekend } from "@/lib/race-data";
import { getSeasonRaces } from "@/lib/race-data";

export type TrackInsight = {
  title: string;
  detail: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

type JolpicaResult = {
  Driver?: { givenName?: string; familyName?: string };
};
type JolpicaResponse = {
  MRData?: { RaceTable?: { Races?: Array<{
    raceName?: string;
    Results?: JolpicaResult[];
  }> } };
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/grandprix$/g, "");
}

const CIRCUIT_INSIGHTS: Record<string, TrackInsight[]> = {
  "unitedstates": [
    { title: "Austin'de start, yokuş yukarı 1. virajla başlıyor.", detail: "Keskin sol viraja yaklaşırken frenleme noktası ve ilk turdaki pozisyon mücadeleleri önem kazanıyor." },
    { title: "Hızlı yön değişimlerinde denge belirleyici olabilir.", detail: "Circuit of the Americas'ın ilk sektöründeki ardışık virajlar, aracın yüksek hızdaki dengesini sınar." },
    { title: "Sıralama temposu yarışın tamamını anlatmaz.", detail: "Lastik aşınması ve trafik nedeniyle uzun sürüş temposu, tek turdan farklı olabilir." },
  ],
  "mexicocity": [
    { title: "Mexico City'de yüksek rakım önemli bir etken.", detail: "İnce hava, araçların soğutulmasını ve aerodinamik davranışlarını yarış hafta sonunda öne çıkarır." },
    { title: "Uzun düzlükte geçiş fırsatları oluşabilir.", detail: "İlk viraj frenlemesi öncesinde hava koridoru ve DRS etkisi yarışın akışını değiştirebilir." },
  ],
  "sãopaulo": [
    { title: "Interlagos saat yönünün tersine koşuluyor.", detail: "Yükseklik değişimleri ve ritmi farklı virajlar, sürücülere alışılmışın dışında bir sınav sunar." },
    { title: "São Paulo'da hava koşullarını takip etmek değerli.", detail: "Değişken hava ve kısa tur, doğru pit stop zamanlamasını kritik hâle getirebilir." },
  ],
  "saopaulo": [
    { title: "Interlagos saat yönünün tersine koşuluyor.", detail: "Yükseklik değişimleri ve ritmi farklı virajlar, sürücülere alışılmışın dışında bir sınav sunar." },
    { title: "São Paulo'da hava koşullarını takip etmek değerli.", detail: "Değişken hava ve kısa tur, doğru pit stop zamanlamasını kritik hâle getirebilir." },
  ],
  "brazilian": [
    { title: "Interlagos'ta tek tur kısadır, farklar küçük kalabilir.", detail: "Kısa ve akıcı turda sıralama dereceleri birbirine yaklaşabilir." },
    { title: "Hava değişirse strateji hızla değişebilir.", detail: "São Paulo'da yağmur olasılığına karşı pit duvarının kararları önem kazanır." },
  ],
  "lasvegas": [
    { title: "Las Vegas'ta uzun düzlükler ön plana çıkıyor.", detail: "Yüksek son hız ve ağır frenlemelerde lastik sıcaklığını korumak önemli olabilir." },
    { title: "Serin asfalt lastik ısınmasını zorlaştırabilir.", detail: "Gece koşullarında pist sıcaklığı, lastiklerin çalışma aralığına ulaşmasını etkileyebilir." },
  ],
  "qatar": [
    { title: "Lusail'de hızlı virajlar lastiklere yüksek yük bindirir.", detail: "Uzun hızlı viraj sekanslarında lastik yönetimi yarış temposunu belirleyebilir." },
    { title: "Kum ve rüzgâr pist tutuşunu etkileyebilir.", detail: "Çöl koşullarındaki değişimler takımların hafta sonu ayar tercihlerini zorlaştırabilir." },
  ],
  "abudhabi": [
    { title: "Yas Marina'da son sektör çekiş açısından önemli.", detail: "Yavaş viraj çıkışlarında arka lastiklerin durumu tur süresine yansıyabilir." },
    { title: "Uzun düzlüklerin sonunda frenleme kritik.", detail: "Geçiş denemelerinde frenleme istikrarı ve viraj çıkışı büyük rol oynayabilir." },
  ],
};

async function previousWinner(race: RaceWeekend): Promise<TrackInsight | null> {
  try {
    const year = Number(race.raceDate.slice(0, 4));
    if (!Number.isInteger(year) || year < 1951) return null;
    const lastSeason = year - 1;
    const races = await getSeasonRaces(lastSeason);
    const oldRace = races.find((item) =>
      normalize(item.raceName) === normalize(race.raceName) ||
      (normalize(item.circuitName) === normalize(race.circuitName) && normalize(item.city) === normalize(race.city))
    );
    if (!oldRace) return null;
    const url = `https://api.jolpi.ca/ergast/f1/${lastSeason}/${oldRace.round}/results/1.json`;
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(3800) });
    if (!response.ok) return null;
    const result = (await response.json()) as JolpicaResponse;
    const recordedRace = result.MRData?.RaceTable?.Races?.[0];
    if (!recordedRace || normalize(recordedRace.raceName ?? "") !== normalize(oldRace.raceName)) return null;
    const driver = recordedRace.Results?.[0]?.Driver;
    const fullName = [driver?.givenName, driver?.familyName].filter(Boolean).join(" ");
    if (!fullName) return null;
    return {
      title: `${lastSeason} yılında bu GP'yi ${fullName} kazandı.`,
      detail: "Önceki sezonun yarış galibi, bu yılki mücadele için bir karşılaştırma sunuyor; güncel sonucu önceden belirlemez.",
      sourceUrl: url,
      sourceLabel: "ÖNCEKİ YILIN SONUCU ↗",
    };
  } catch {
    return null;
  }
}

export async function getTrackInsights(race: RaceWeekend | null): Promise<TrackInsight[]> {
  if (!race) return [{ title: "Yeni yarış bilgileri bekleniyor.", detail: "Sıradaki Grand Prix takvimi geldiğinde bu alanda piste özel notlar gösterilecek." }];
  const key = normalize(race.raceName);
  const notes = CIRCUIT_INSIGHTS[key] ?? [
    { title: `${race.circuitName} için yarış stratejisi mercek altında.`, detail: "Sıralama, lastik tercihleri ve uzun sürüş temposu arasındaki farklara dikkat etmekte fayda var." },
    { title: "İlk tur, yarışın gidişatını değiştirebilir.", detail: "Startta kazanılan veya kaybedilen pozisyonlar strateji seçeneklerini etkileyebilir." },
  ];
  const winner = await previousWinner(race);
  return winner ? [notes[0], winner, ...notes.slice(1)] : notes;
}
