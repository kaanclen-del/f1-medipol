import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Calendar = {
  MRData?: { RaceTable?: { Races?: Array<{
    round?: string;
    date?: string;
    time?: string;
  }> } };
};
type StandingsResponse = {
  MRData?: { StandingsTable?: { StandingsLists?: Array<{
    DriverStandings?: Array<{
      position?: string;
      points?: string;
      wins?: string;
      Driver?: {
        driverId?: string;
        permanentNumber?: string;
        code?: string;
        givenName?: string;
        familyName?: string;
      };
      Constructors?: Array<{name?:string}>;
    }>;
  }> } };
};

async function fetchJolpica<T>(path: string): Promise<T> {
  const r = await fetch(`https://api.jolpi.ca/ergast/f1/${path}`, {
    next: { revalidate: 3600 },
  });
  if (!r.ok) throw new Error(`Jolpica HTTP ${r.status}`);
  return await r.json() as T;
}

// Geçmiş bir yarışın puanını, bugünkü değil yarıştan ÖNCEKİ şampiyonadan hesapla.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const year = Number(params.get("year"));
    const sessionStart = Date.parse(params.get("date") ?? "");
    if (!Number.isInteger(year) || year < 2023 ||
        year > new Date().getUTCFullYear() || !Number.isFinite(sessionStart)) {
      return NextResponse.json({ok:false,error:"Geçersiz replay tarihi."}, {status:400});
    }
    const calendar = await fetchJolpica<Calendar>(`${year}/races/?limit=100`);
    const races = calendar.MRData?.RaceTable?.Races ?? [];
    // Session yarıştan önceki 96 saatlik hafta sonu içinde olmalı.
    const matched = races.map((race) => ({
      round: Number(race.round),
      delta: Date.parse(`${race.date}T${race.time ?? "12:00:00Z"}`) - sessionStart,
    })).filter((race) => Number.isInteger(race.round) && Number.isFinite(race.delta) &&
      race.delta >= -5 * 3600000 && race.delta < 96 * 3600000)
      .sort((a,b) => Math.abs(a.delta)-Math.abs(b.delta))[0];
    if (!matched) return NextResponse.json({ok:false,error:"Bu seansın yarış turu takvimde eşleştirilemedi."},{status:404});
    if (matched.round === 1) {
      return NextResponse.json({ok:true,year,round:1,standings:[],firstRound:true});
    }
    const result = await fetchJolpica<StandingsResponse>(`${year}/${matched.round - 1}/driverstandings/?limit=100`);
    const raw = result.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
    if (!raw.length) throw new Error("Önceki turun şampiyona puanları henüz bulunamadı.");
    const standings = raw.map((entry) => ({
      position: Number(entry.position) || 999,
      points: Number(entry.points) || 0,
      wins: Number(entry.wins) || 0,
      driverId: entry.Driver?.driverId ?? "",
      driverNumber: entry.Driver?.permanentNumber ? Number(entry.Driver.permanentNumber) : null,
      acronym: (entry.Driver?.code ?? "").toUpperCase(),
      givenName: entry.Driver?.givenName ?? "",
      familyName: entry.Driver?.familyName ?? "",
      fullName: [entry.Driver?.givenName, entry.Driver?.familyName].filter(Boolean).join(" "),
      constructor: entry.Constructors?.at(-1)?.name ?? "",
    }));
    return NextResponse.json({ok:true,year,round:matched.round,standings}, {
      headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"},
    });
  } catch (error) {
    console.error("REPLAY HISTORICAL CHAMPIONSHIP:", error);
    return NextResponse.json({ok:false,error:"Geçmiş puan tablosu şu an erişilebilir değil."},{status:503});
  }
}
