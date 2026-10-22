import Header from "@/components/Header";
import RaceChat from "@/components/RaceChat";
import { getCurrentRaceWeekend } from "@/lib/race-data";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Grand Prix Canlı Sohbet | F1 SOCIAL",
  description: "Her yarış hafta sonuna çzel F1 SOCIAL topluluk sohbeti.",
};

export default async function RaceChatPage() {
  const [race, supabase] = await Promise.all([
    getCurrentRaceWeekend(),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const year = race?.raceDate ? Number(race.raceDate.slice(0, 4)) : new Date().getUTCFullYear();

  return (
    <>
      <Header />
      <main style={{ width: "min(1120px, calc(100% - 30px))", margin: "35px auto 80px" }}>
        <RaceChat
          season={year}
          round={race?.round ?? 0}
          raceName={race?.raceName ?? "Formula 1 Genel Sohbet"}
          authenticated={Boolean(user)}
        />
      </main>
    </>
  );
}
