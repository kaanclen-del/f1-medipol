import Link from "next/link";

import Header from "@/components/Header";
import HomeChampionshipLive from "@/components/HomeChampionshipLive";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import RaceCountdown from "@/components/RaceCountdown";
import RaceHeroBackground from "@/components/RaceHeroBackground";
import RotatingPredictionPrompt from "@/components/RotatingPredictionPrompt";
import DriverNewsCarousel from "@/components/DriverNewsCarousel";
import TrackInsightCarousel from "@/components/TrackInsightCarousel";
import { getTrackInsights } from "@/lib/f1-track-insights";
import { getUpcomingDriverNews } from "@/lib/f1-driver-news";

import {
  getRaceHeroImages,
} from "@/lib/race-image";

import {
  getCurrentRaceWeekend,
  getSeasonRaces,
  type RaceWeekend,
} from "@/lib/race-data";

import { createAdminClient } from "@/utils/supabase/admin";

import {
  getF1LiveStatus,
  formatF1SessionTimeTR,
} from "@/lib/f1-live-status";

import {
  createClient,
} from "@/utils/supabase/server";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
   ========================================================= */

type DriverStanding = {
  position: number;
  code: string;
  name: string;
  team: string;
  points: number;
  wins: number;
};

type ConstructorStanding = {
  position: number;
  name: string;
  points: number;
  wins: number;
};

type LastResult = {
  position: number;
  code: string;
  name: string;
  team: string;
};

type BoardMember = {
  id: string;
  name: string | null;
  role: string | null;
  image_url: string | null;
};

type EventCard = {
  id: string;
  title: string;

  event_type:
    | string
    | null;

  location_name:
    | string
    | null;

  start_at: string;

  cover_image_url:
    | string
    | null;
};

type WeeklyCommentary = {
  id: string;
  week_label: string;
  title: string;
  summary: string;
  content: string;
  image_url: string | null;
  published_at: string | null;
};

function formatCalendarDate(date: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric", month: "short", timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  } catch {
    return date;
  }
}

function formatSessionTimeTR(date: string, time?: string) {
  try {
    // Yarış verisindeki saat UTC'dir; ziyaretçiye Türkiye saatini gösteriyoruz.
    if (!time) {
      return `${new Intl.DateTimeFormat("tr-TR", {
        weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))} · Saat açıklanmadı`;
    }
    return new Intl.DateTimeFormat("tr-TR", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
    }).format(new Date(`${date}T${time}`));
  } catch {
    return `${date} · Saat açıklanmadı`;
  }
}

/* =========================================================
   TEAM COLOURS
   ========================================================= */

const TEAM_COLORS:
  Record<
    string,
    string
  > = {
  mclaren: "#ff8000",
  ferrari: "#e8002d",
  mercedes: "#27f4d2",

  "red bull":
    "#3671c6",

  "red bull racing":
    "#3671c6",

  red_bull:
    "#3671c6",

  "aston martin":
    "#229971",

  aston_martin:
    "#229971",

  alpine:
    "#0093cc",

  williams:
    "#64c4ff",

  haas:
    "#b6babd",

  rb:
    "#6692ff",

  "racing bulls":
    "#6692ff",

  audi:
    "#f50537",

  cadillac:
    "#d8d8d8",
};

function teamColor(
  team?:
    | string
    | null
) {
  if (!team) {
    return "#777";
  }

  const key =
    team
      .toLowerCase()
      .replaceAll(
        "-",
        " "
      )
      .replaceAll(
        "_",
        " "
      );

  return (
    TEAM_COLORS[
      key
    ] ??
    Object.entries(
      TEAM_COLORS
    ).find(
      (
        [name]
      ) =>
        key.includes(
          name
        )
    )?.[1] ??
    "#777"
  );
}

/* =========================================================
   CHAMPIONSHIP
   ========================================================= */

async function getDriverStandings():
  Promise<
    DriverStanding[]
  > {
  try {
    const response =
      await fetch(
        "https://api.jolpi.ca/ergast/f1/current/driverstandings.json",
        {
          next: {
            revalidate: 900,
          },
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data =
      await response.json();

    const rows =
      data?.MRData
        ?.StandingsTable
        ?.StandingsLists?.[0]
        ?.DriverStandings ??
      [];

    return rows.map(
      (
        row:
          any
      ) => ({
        position:
          Number(
            row.position
          ),

        code:
          row.Driver
            ?.code ??
          row.Driver
            ?.familyName
            ?.slice(
              0,
              3
            )
            ?.toUpperCase() ??
          "---",

        name:
          `${row.Driver?.givenName ?? ""} ${row.Driver?.familyName ?? ""}`.trim(),

        team:
          row.Constructors?.[0]
            ?.name ??
          "F1 Team",

        points:
          Number(
            row.points ??
            0
          ),

        wins:
          Number(
            row.wins ??
            0
          ),
      })
    );
  } catch {
    return [];
  }
}

async function getConstructorStandings():
  Promise<
    ConstructorStanding[]
  > {
  try {
    const response =
      await fetch(
        "https://api.jolpi.ca/ergast/f1/current/constructorstandings.json",
        {
          next: {
            revalidate: 900,
          },
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data =
      await response.json();

    const rows =
      data?.MRData
        ?.StandingsTable
        ?.StandingsLists?.[0]
        ?.ConstructorStandings ??
      [];

    return rows.map(
      (
        row:
          any
      ) => ({
        position:
          Number(
            row.position
          ),

        name:
          row.Constructor
            ?.name ??
          "F1 Team",

        points:
          Number(
            row.points ??
            0
          ),

        wins:
          Number(
            row.wins ??
            0
          ),
      })
    );
  } catch {
    return [];
  }
}

/* =========================================================
   LAST RACE
   ========================================================= */

async function getLastRace() {
  try {
    const response =
      await fetch(
        "https://api.jolpi.ca/ergast/f1/current/last/results.json",
        {
          next: {
            revalidate: 900,
          },
        }
      );

    if (
      !response.ok
    ) {
      return {
        raceName:
          null,

        results:
          [] as LastResult[],
      };
    }

    const data =
      await response.json();

    const race =
      data?.MRData
        ?.RaceTable
        ?.Races?.[0];

    const results:
      LastResult[] =
      (
        race?.Results ??
        []
      ).map(
        (
          row:
            any
        ) => ({
          position:
            Number(
              row.position
            ),

          code:
            row.Driver
              ?.code ??
            "---",

          name:
            `${row.Driver?.givenName ?? ""} ${row.Driver?.familyName ?? ""}`.trim(),

          team:
            row.Constructor
              ?.name ??
            "F1 Team",
        })
      );

    return {
      raceName:
        race?.raceName ??
        null,

      results,
    };
  } catch {
    return {
      raceName:
        null,

      results:
        [] as LastResult[],
    };
  }
}

/* =========================================================
   FORMATTERS
   ========================================================= */

function formatRaceTitle(
  name?:
    | string
    | null
) {
  if (!name) {
    return {
      top:
        "FORMULA 1",

      bottom:
        "MEDİPOL",
    };
  }

  const value =
    name.toUpperCase();

  if (
    value.endsWith(
      " GRAND PRIX"
    )
  ) {
    return {
      top:
        value.replace(
          " GRAND PRIX",
          ""
        ),

      bottom:
        "GRAND PRIX",
    };
  }

  if (
    value.endsWith(
      " GP"
    )
  ) {
    return {
      top:
        value.replace(
          " GP",
          ""
        ),

      bottom:
        "GRAND PRIX",
    };
  }

  return {
    top:
      value,

    bottom:
      "RACE WEEKEND",
  };
}

function formatEventDate(
  date:
    string
) {
  try {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        timeZone:
          "Europe/Istanbul",
      }
    ).format(
      new Date(
        date
      )
    );
  } catch {
    return date;
  }
}

function formatEventType(
  type?:
    | string
    | null
) {
  if (!type) {
    return "ETKİNLİK";
  }

  const map:
    Record<
      string,
      string
    > = {
    watch_party:
      "YARIŞ İZLEME",

    karting:
      "KARTING",

    talk:
      "SÖYLEŞİ",

    club:
      "KULÜP",

    other:
      "ETKİNLİK",

    panel:
      "PANEL",

    meetup:
      "BULUŞMA",

    workshop:
      "ATÖLYE",
  };

  return (
    map[
      type.toLowerCase()
    ] ??
    type.toUpperCase()
  );
}

/* =========================================================
   QUICK INTEL
   ========================================================= */

/* =========================================================
   PAGE
   ========================================================= */

export default async function HomePage() {
  const race =
    await getCurrentRaceWeekend();

  // Bir sonraki yarıştan başlayarak yalnızca tamamlanmamış GP'ler.
  const now = Date.now();
  const seasonYear = race?.raceDate
    ? Number(race.raceDate.slice(0, 4))
    : new Date().getUTCFullYear();
  const seasonRaces = await getSeasonRaces(seasonYear);
  const remainingRaces = seasonRaces.filter((item: RaceWeekend) => {
    const starts = Date.parse(`${item.raceDate}T${item.raceTime || "12:00:00Z"}`);
    if (!Number.isFinite(starts)) return false;
    if (starts >= now) return true;
    // Seans devam ediyor ve henüz resmî sonuçlar gelmediğinde aktif GP'yi göster.
    return Boolean(race && item.round === race.round && now < starts + 12 * 3600000);
  });

  const editorialAdmin = createAdminClient();
  const { data: raceTickerConfig } = await editorialAdmin.from("site_race_ticker")
    .select("message").eq("id", 1).maybeSingle();
  const tickerMessage = typeof raceTickerConfig?.message === "string" ? raceTickerConfig.message.trim() : "";
  const { data: commentaryRow, error: commentaryError } = await editorialAdmin
    .from("weekly_commentaries")
    .select("id,week_label,title,summary,content,image_url,published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (commentaryError) {
    // SQL tablo kurulumu tamamlanmamışsa ana sayfa çalışmaya devam eder.
    console.warn("WEEKLY COMMENTARY FETCH:", commentaryError.message);
  }
  const weeklyCommentary = (commentaryRow ?? null) as WeeklyCommentary | null;

  /*
    CANLI SEANS:
    OpenF1 yerine takvim.
  */

  const liveStatus =
    await getF1LiveStatus(
      race
    );

  const [
    heroImages,
    driverStandings,
    constructorStandings,
    lastRace,
    pilotNews,
    trackInsights,
  ] =
    await Promise.all([
      race
        ? getRaceHeroImages({
            raceName:
              race.raceName,

            circuitName:
              race.circuitName,

            city:
              race.city,

            country:
              race.country,
          })
        : Promise.resolve(
            []
          ),

      getDriverStandings(),

      getConstructorStandings(),

      getLastRace(),
      getUpcomingDriverNews(
        race ? { raceName: race.raceName, city: race.city, raceDate: race.raceDate } : null
      ),
      getTrackInsights(race),
    ]);

  const supabase =
    await createClient();

  const {
    data:
      boardRows,
  } =
    await supabase
      .from(
        "board_members"
      )
      .select(`
        id,
        name,
        role,
        image_url,
        sort_order
      `)
      .eq(
        "is_published",
        true
      )
      .order(
        "sort_order",
        {
          ascending:
            true,
        }
      )
      .limit(12);

  const nowIso =
    new Date()
      .toISOString();

  // Ana sayfa etkinlikleri: önce yaklaşanlar (erken tarihten geçe),
  // sonra geçmiş etkinlikler (en yeniden eskiye). Tek bir dikey liste.
  const eventFields = "id,title,event_type,location_name,start_at,cover_image_url";
  const [upcomingEventRows, pastEventRows] = await Promise.all([
    supabase.from("events").select(eventFields)
      .eq("is_published", true).gte("start_at", nowIso)
      .order("start_at", { ascending: true }).limit(12),
    supabase.from("events").select(eventFields)
      .eq("is_published", true).lt("start_at", nowIso)
      .order("start_at", { ascending: false }).limit(12),
  ]);
  if (upcomingEventRows.error) console.warn("HOME UPCOMING EVENTS:", upcomingEventRows.error.message);
  if (pastEventRows.error) console.warn("HOME PAST EVENTS:", pastEventRows.error.message);
  const homeEvents: { event: EventCard; upcoming: boolean }[] = [
    ...((upcomingEventRows.data ?? []) as EventCard[]).map((event) => ({ event, upcoming: true })),
    ...((pastEventRows.data ?? []) as EventCard[]).map((event) => ({ event, upcoming: false })),
  ].slice(0, 16);

  // G6.14.2 — Admin panelindeki kaydedilmiş etkinlik kadrajlarını ana sayfaya uygula.
  // Bu tablo ayrı tutulduğu için events sorgusundan otomatik gelmez.
  const eventThumbnailPositions = new Map<string, { x: number; y: number }>();
  if (homeEvents.length > 0) {
    const { data: thumbnailRows, error: thumbnailError } = await editorialAdmin
      .from("event_thumbnail_settings")
      .select("event_id,position_x,position_y")
      .in("event_id", homeEvents.map(({ event }) => event.id));
    if (thumbnailError) {
      console.warn("HOME EVENT THUMBNAILS:", thumbnailError.message);
    }
    for (const row of thumbnailRows ?? []) {
      const x = Number(row.position_x);
      const y = Number(row.position_y);
      if (
        typeof row.event_id === "string" &&
        Number.isFinite(x) && x >= 0 && x <= 100 &&
        Number.isFinite(y) && y >= 0 && y <= 100
      ) {
        eventThumbnailPositions.set(row.event_id, { x, y });
      }
    }
  }

  const boardMembers =
    (
      boardRows ??
      []
    ) as BoardMember[];


  const isLive =
    liveStatus.isLive;

  const currentSession =
    liveStatus.currentSession;

  const nextSession =
    liveStatus.nextSession;

  const title =
    formatRaceTitle(
      race?.raceName
    );

  const marqueeMembers =
    boardMembers.length
      ? [
          ...boardMembers,
          ...boardMembers,
        ]
      : [];

  return (
    <>
      <LiveAutoRefresh />

      <Header />

      {(tickerMessage || race) && (
        <div className="f1-next-race-strip" aria-label="F1 SOCIAL kayan duyuru şeridi">
          <div className="f1-next-race-track">
            {[0, 1].map((copy) => (
              <div className="f1-next-race-group" key={copy} aria-hidden={copy === 1}>
                {Array.from({ length: 20 }, (_, index) => (
                  <span className="f1-next-race-item" key={index}>
                    <b>● SOCIAL</b><span aria-hidden="true">◆</span>
                    {tickerMessage ? <strong>{tickerMessage}</strong> : <strong>YAKLAŞAN YARIŞ: {race?.raceName}</strong>}
                    {!tickerMessage && race && <><span aria-hidden="true">◆</span><span>{formatSessionTimeTR(race.raceDate, race.raceTime)} (TSİ)</span></>}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`
        .f1-next-race-strip {
          height: 27px; margin-top: 8px; width: 100%; overflow: hidden;
          position: relative; z-index: 5; display: flex; align-items: center;
          color: #fff; font-family: inherit; border-block: 1px solid rgba(255,255,255,.12);
          background: rgba(148, 17, 34, .44);
        }
        :root[data-site-theme="dark"] .f1-next-race-strip,
        :root:not([data-site-theme]) .f1-next-race-strip { background: rgba(38, 43, 53, .78); }
        :root[data-site-theme="light"] .f1-next-race-strip {
          background: rgba(188, 35, 52, .28); color: #fff;
          border-color: rgba(255,255,255,.22);
        }
        .f1-next-race-track { display: flex; width: max-content; flex: 0 0 auto; white-space: nowrap; animation: f1-next-race-scroll 85s linear infinite; will-change: transform; }
        .f1-next-race-group { display: flex; width: max-content; min-width: 100vw; flex: 0 0 auto; align-items: center; justify-content: space-around; }
        .f1-next-race-item { display: flex; flex: 0 0 auto; align-items: center; gap: 13px; padding: 0 18px; font-size: 10px; letter-spacing: .04em; height: 27px; white-space: nowrap; }
        .f1-next-race-item strong { font-weight: 850; }
        .f1-next-race-item b { font-size: 9px; font-weight: 850; }
        @keyframes f1-next-race-scroll { to { transform: translateX(-50%); } }
        @media(max-width:700px) { .f1-next-race-strip { height: 25px; margin-top: 7px; } .f1-next-race-item { height: 25px; font-size: 9px; } }
        @media(prefers-reduced-motion:reduce) { .f1-next-race-track { animation: none; } }
      `}</style>

      <main className="home">
        <style>{`
          /* =================================================
             BASE THEME
             ================================================= */

          .home {
            --bg-a: #11141b;
            --bg-b: #080a0e;

            --panel: #1b1f27;
            --panel-deep: #11151b;

            --text: #f7f8fa;
            --muted: #909ba8;

            --border:
              rgba(255,255,255,.09);

            --soft:
              rgba(255,255,255,.035);

            --accent: #ff4038;

            /*
              HERO kendi tema yüzeyine sahip.
              Böylece sayfa teması değişse bile
              fotoğraf + Quick Intel tek parça kalıyor.
            */

            --hero-main-bg:
              #0d1117;

            --hero-intel-bg:
              #11161d;

            --hero-muted:
              #949eaa;

            --hero-border:
              rgba(255,255,255,.095);

            --hero-shade-a:
              rgba(8,11,15,.98);

            --hero-shade-b:
              rgba(12,16,22,.80);

            --hero-shade-c:
              rgba(17,22,29,.28);

            --hero-bottom-shade:
              rgba(7,9,13,.96);

            position: relative;

            min-height: 100vh;

            overflow: hidden;

            color:
              var(--text);

            background:
              radial-gradient(
                circle at 88% 3%,
                rgba(186,18,27,.18),
                transparent 27%
              ),
              radial-gradient(
                circle at 8% 54%,
                rgba(48,79,128,.13),
                transparent 31%
              ),
              linear-gradient(
                145deg,
                var(--bg-a),
                var(--bg-b) 55%
              );
          }

          /* =================================================
             RED THEME
             ================================================= */

          :root[data-site-theme="red"]
          .home {
            --bg-a: #d70608;
            --bg-b: #190509;

            --panel: #281316;
            --panel-deep: #160c0e;

            --text: #fff;
            --muted: #d5b8ba;

            --border:
              rgba(255,255,255,.15);

            --soft:
              rgba(255,255,255,.055);

            --accent:
              #ff5148;

            --hero-main-bg:
              #1b070a;

            --hero-intel-bg:
              #260b10;

            --hero-muted:
              #d2afb3;

            --hero-border:
              rgba(255,255,255,.13);

            --hero-shade-a:
              rgba(25,4,7,.98);

            --hero-shade-b:
              rgba(40,7,11,.86);

            --hero-shade-c:
              rgba(38,8,12,.39);

            --hero-bottom-shade:
              rgba(22,4,7,.97);

            background:
              radial-gradient(
                circle at 87% 8%,
                rgba(255,115,100,.38),
                transparent 29%
              ),
              linear-gradient(
                135deg,
                #d8070a,
                #a80008 35%,
                #42060b 68%,
                #13080a
              );
          }

          /* =================================================
             LIGHT THEME
             ================================================= */

          :root[data-site-theme="light"]
          .home {
            --bg-a: #fff;
            --bg-b: #e9edf2;

            --panel: #fff;
            --panel-deep: #f1f3f6;

            --text: #14181e;
            --muted: #65707c;

            --border:
              rgba(18,23,30,.14);

            --soft:
              rgba(18,23,30,.035);

            --accent:
              #e10600;

            /*
              Light temada sayfa açık kalıyor,
              ancak Hero komple premium koyu blok.
            */

            --hero-main-bg:
              #10151c;

            --hero-intel-bg:
              #171d25;

            --hero-muted:
              #9ba5b0;

            --hero-border:
              rgba(255,255,255,.10);

            --hero-shade-a:
              rgba(8,11,16,.98);

            --hero-shade-b:
              rgba(14,18,24,.82);

            --hero-shade-c:
              rgba(20,25,32,.33);

            --hero-bottom-shade:
              rgba(8,10,14,.96);

            background:
              radial-gradient(
                circle at 87% 5%,
                rgba(225,6,0,.11),
                transparent 25%
              ),
              linear-gradient(
                145deg,
                #fff,
                #edf0f4 58%,
                #e6eaf0
              );
          }

          .home * {
            box-sizing:
              border-box;
          }

          /* =================================================
             BACKGROUND FX
             ================================================= */

          .ambient-grid {
            position: fixed;

            inset: 0;

            pointer-events:
              none;

            opacity: .4;

            background:
              repeating-linear-gradient(
                0deg,
                transparent 0 72px,
                rgba(255,255,255,.015) 73px
              );
          }

          .racing-line {
            position: fixed;

            left: -35vw;

            width: 48vw;
            height: 2px;

            pointer-events:
              none;

            transform:
              rotate(-6deg);

            background:
              linear-gradient(
                90deg,
                transparent,
                var(--accent),
                rgba(255,255,255,.28),
                transparent
              );

            animation:
              racingLine 15s
              linear infinite;
          }

          .racing-line.one {
            top: 31%;
            opacity: .42;
          }

          .racing-line.two {
            top: 61%;
            opacity: .26;

            animation-delay:
              -5s;
          }

          .racing-line.three {
            top: 84%;
            opacity: .30;

            animation-delay:
              -9s;
          }

          @keyframes racingLine {
            from {
              translate:
                0 0;
            }

            to {
              translate:
                185vw 0;
            }
          }

          /* =================================================
             WRAP
             ================================================= */

          .wrap {
            position: relative;

            z-index: 2;

            width:
              min(
                1420px,
                calc(100% - 36px)
              );

            margin:
              0 auto;

            padding:
              14px 0 95px;
          }

          /* =================================================
             TICKER
             ================================================= */

          .ticker {
            overflow: hidden;

            margin-bottom: 14px;

            border:
              1px solid
              var(--border);

            border-radius:
              12px;

            background:
              var(--soft);
          }

          .ticker-track {
            display: flex;

            width:
              max-content;

            padding:
              11px 0;

            animation:
              tickerMove 35s
              linear infinite;
          }

          .tick {
            display: flex;

            align-items: center;

            gap: 11px;

            padding:
              0 29px;

            border-right:
              1px solid
              var(--border);

            white-space:
              nowrap;

            font-size: 12px;
          }

          .tick b {
            font-size: 9px;

            letter-spacing:
              .09em;
          }

          .tick span {
            color:
              var(--muted);
          }

          @keyframes tickerMove {
            to {
              transform:
                translateX(-50%);
            }
          }

          /* =================================================
             HERO SHELL
             ================================================= */

          .hero {
            display: grid;

            grid-template-columns:
              minmax(0,1.55fr)
              minmax(390px,.65fr);

            min-height: 505px;

            overflow: hidden;

            color: #fff;

            border:
              1px solid
              var(--hero-border);

            border-radius:
              22px;

            background:
              var(--hero-intel-bg);

            box-shadow:
              0 22px 60px
              rgba(0,0,0,.12);
          }

          :root[data-site-theme="light"]
          .hero {
            box-shadow:
              0 18px 45px
              rgba(13,18,24,.13);
          }

          /* =================================================
             HERO MAIN
             ================================================= */

          .hero-main {
            position: relative;

            isolation:
              isolate;

            overflow: hidden;

            display: flex;

            align-items: center;

            padding:
              31px
              clamp(
                34px,
                4vw,
                54px
              );

            background:
              var(--hero-main-bg);
          }

          /*
            FOTOĞRAFIN SAĞ KENARINI
            QUICK INTEL'E YUMUŞAK BAĞLAR.
          */

          .hero-main::after {
            content: "";

            position: absolute;

            z-index: 2;

            top: 0;
            right: 0;
            bottom: 0;

            width: 170px;

            pointer-events: none;

            background:
              linear-gradient(
                90deg,
                transparent,
                var(--hero-intel-bg)
              );
          }

          .hero-shade {
            position: absolute;

            inset: 0;

            z-index: 1;

            background:
              linear-gradient(
                90deg,
                var(--hero-shade-a),
                var(--hero-shade-b) 45%,
                var(--hero-shade-c)
              ),
              linear-gradient(
                0deg,
                var(--hero-bottom-shade),
                transparent 72%
              );
          }

          .hero-copy {
            position: relative;

            z-index: 4;

            width: 100%;

            max-width: 820px;

            color: #fff;
          }

          .eyebrow {
            color:
              var(--accent);

            font-size: 10px;

            font-weight: 1000;

            letter-spacing:
              .14em;

            text-transform:
              uppercase;
          }

          .pills {
            display: flex;

            gap: 7px;

            margin-top: 12px;

            flex-wrap: wrap;
          }

          .pill {
            padding:
              7px 10px;

            border:
              1px solid
              rgba(255,255,255,.14);

            border-radius:
              999px;

            background:
              rgba(255,255,255,.055);

            color: #fff;

            font-size: 9px;

            font-weight: 900;
          }

          .hero h1 {
            margin:
              18px 0 0;

            max-width: 760px;

            color: #fff;

            font-size:
              clamp(
                48px,
                5.25vw,
                78px
              );

            line-height: .87;

            letter-spacing:
              -.058em;

            font-style:
              italic;

            font-weight: 1000;
          }

          .hero-title-top {
            display: block;

            white-space:
              nowrap;

            color: #fff;
          }

          .hero-title-bottom {
            display: block;

            width:
              fit-content;

            max-width: 100%;

            padding-right:
              .08em;

            white-space:
              nowrap;

            font-size:
              .84em;

            background:
              linear-gradient(
                100deg,
                #ff5148,
                #e10600
              );

            -webkit-background-clip:
              text;

            background-clip:
              text;

            color:
              transparent;
          }

          .hero-sub {
            margin-top: 16px;

            color: #fff;

            font-size: 11px;

            font-weight: 850;

            letter-spacing:
              .20em;
          }

          .race-signature {
            width:
              min(
                590px,
                100%
              );

            display: flex;

            align-items: center;

            gap: 11px;

            margin-top: 14px;

            padding:
              10px 0;

            color: #fff;

            border-top:
              1px solid
              rgba(255,255,255,.13);

            border-bottom:
              1px solid
              rgba(255,255,255,.08);

            font-size: 9px;
          }

          .race-signature i {
            width: 4px;
            height: 4px;

            flex:
              0 0 4px;

            border-radius: 50%;

            background:
              #ff443c;
          }

          .hero-countdown {
            width: 590px;

            max-width: 100%;

            margin-top: 16px;

            padding:
              15px 18px 17px;

            color: #fff;
          }

          .hero-countdown-label {
            margin-bottom: 11px;

            color: #ff625a;

            font-size: 8px;

            font-weight: 1000;

            letter-spacing:
              .14em;
          }

          .countdown-scale {
            transform:
              scale(1.08);

            transform-origin:
              left center;

            padding-right:
              38px;
          }

          .buttons {
            display: flex;

            gap: 9px;

            margin-top: 16px;

            flex-wrap: wrap;
          }

          .red-btn,
          .ghost-btn {
            min-height: 43px;

            padding:
              0 16px;

            display:
              inline-flex;

            align-items: center;

            border-radius:
              8px;

            font-size: 9px;

            font-weight: 1000;
          }

          .red-btn {
            color: #fff;

            background:
              linear-gradient(
                135deg,
                #c90000,
                #ff443c
              );
          }

          .ghost-btn {
            color: #fff;

            border:
              1px solid
              rgba(255,255,255,.14);

            background:
              rgba(255,255,255,.055);
          }

          /* =================================================
             QUICK INTEL
             ================================================= */

          .intel {
            display: flex;

            flex-direction:
              column;

            padding: 27px;

            color: #fff;

            border-left:
              1px solid
              var(--hero-border);

            background:
              linear-gradient(
                145deg,
                var(--hero-intel-bg),
                var(--hero-main-bg)
              );
          }

          .intel-head {
            display: flex;

            justify-content:
              space-between;

            gap: 12px;
          }

          .intel h2 {
            margin:
              5px 0 0;

            color: #fff;

            font-size: 30px;
          }

          .intel-status {
            height: 31px;

            padding:
              0 10px;

            display: flex;

            align-items: center;

            border:
              1px solid
              var(--hero-border);

            border-radius:
              999px;

            color:
              var(--hero-muted);

            background:
              rgba(255,255,255,.015);

            font-size: 8px;

            font-weight: 1000;
          }

          .intel-stage {
            height: 285px;

            margin-top: 23px;

            overflow: hidden;

            border:
              1px solid
              var(--hero-border);

            border-radius:
              15px;

            background:
              rgba(255,255,255,.025);
          }

          .intel-track {
            width: 300%;
            height: 100%;

            display: flex;

            animation:
              intelSlide 15s
              cubic-bezier(.7,0,.2,1)
              infinite;
          }

          .intel-slide {
            flex:
              0 0 33.333333%;

            padding:
              25px;
          }

          @keyframes intelSlide {
            0%,
            27% {
              transform:
                translateX(0);
            }

            33%,
            60% {
              transform:
                translateX(-33.333333%);
            }

            66%,
            93% {
              transform:
                translateX(-66.666666%);
            }

            100% {
              transform:
                translateX(0);
            }
          }

          .intel-number {
            color:
              var(--accent);

            font-size: 40px;

            font-weight: 1000;

            font-style:
              italic;
          }

          .intel-label {
            color:
              var(--accent);

            font-size: 8px;

            font-weight: 1000;
          }

          .intel-slide h3 {
            margin:
              25px 0 9px;

            color: #fff;

            font-size: 23px;
          }

          .intel-slide p {
            color:
              var(--hero-muted);

            font-size: 11px;

            line-height: 1.65;
          }

          .intel-circuit-band {
            margin-top: auto;

            padding-top: 18px;

            display: flex;

            justify-content:
              space-between;

            align-items: center;

            gap: 12px;
          }

          .intel-circuit-copy {
            min-width: 0;
          }

          .intel-circuit-copy small {
            display: block;

            color:
              var(--hero-muted);

            font-size: 7px;
          }

          .intel-circuit-copy strong {
            display: block;

            margin-top: 4px;

            overflow: hidden;

            color: #fff;

            white-space: nowrap;

            text-overflow:
              ellipsis;

            font-size: 11px;
          }

          .intel-circuit-round {
            width: 51px;
            height: 51px;

            flex:
              0 0 51px;

            display: grid;

            place-items:
              center;

            border:
              1px solid
              var(--hero-border);

            border-radius:
              13px;

            color:
              var(--accent);

            background:
              rgba(255,255,255,.018);

            font-weight: 1000;
          }

          /* =================================================
             THREE CARDS
             ================================================= */

          .feature-grid {
            display: grid;

            grid-template-columns:
              minmax(0,1.12fr)
              minmax(0,.88fr);

            gap: 14px;

            margin-top: 14px;
          }

          .feature-card {
            position: relative;

            min-height: 420px;

            overflow: hidden;

            padding:
              27px 27px 84px;

            color:
              var(--text);

            border:
              1px solid
              var(--border);

            border-radius:
              17px;

            background:
              linear-gradient(
                155deg,
                var(--panel),
                var(--panel-deep)
              );
          }

          .feature-top {
            display: flex;

            justify-content:
              space-between;

            align-items: center;
          }

          .feature-kicker {
            color:
              var(--accent);

            font-size: 11px;

            font-weight: 1000;

            letter-spacing:
              .13em;
          }

          .feature-icon {
            width: 44px;
            height: 44px;

            display: grid;

            place-items:
              center;

            border:
              1px solid
              var(--border);

            border-radius:
              11px;

            background:
              var(--soft);

            font-weight: 1000;
          }

          .feature-card h3 {
            margin:
              18px 0 10px;

            font-size: 30px;

            line-height: 1;
          }

          .feature-card p {
            color:
              var(--muted);

            font-size: 13px;

            line-height: 1.65;
          }

          /* =================================================
             LIVE CARD
             ================================================= */

          .live-active-box {
            position: relative;

            min-height: 185px;

            margin-top: 20px;

            padding: 21px;

            display: flex;

            flex-direction:
              column;

            justify-content:
              center;

            overflow: hidden;

            border:
              1px solid
              rgba(69,220,132,.22);

            border-radius:
              14px;

            background:
              linear-gradient(
                135deg,
                rgba(69,220,132,.09),
                var(--soft)
              );
          }

          .live-active-label {
            display: flex;

            align-items: center;

            gap: 9px;

            color: #55df92;

            font-size: 10px;

            font-weight: 1000;

            letter-spacing:
              .08em;
          }

          .live-dot {
            width: 9px;
            height: 9px;

            border-radius: 50%;

            background: #45dc84;

            box-shadow:
              0 0 0 5px
              rgba(69,220,132,.08);
          }

          .live-active-box h4 {
            margin:
              14px 0 6px;

            font-size: 26px;
          }

          .live-active-box p {
            margin: 0;

            font-size: 12px;
          }

          .weekend-head {
            margin-top: 18px;

            padding-top: 14px;

            display: flex;

            justify-content:
              space-between;

            border-top:
              1px solid
              var(--border);
          }

          .weekend-head strong {
            font-size: 11px;
          }

          .weekend-head span {
            color:
              var(--muted);

            font-size: 9px;
          }

          .weekend-schedule {
            display: flex;

            gap: 10px;

            margin-top: 11px;

            padding-bottom: 11px;

            overflow-x: auto;

            scroll-snap-type:
              x proximity;

            scrollbar-width:
              thin;

            scrollbar-color:
              rgba(255,72,64,.4)
              transparent;
          }

          .session-card {
            min-width: 184px;

            min-height: 150px;

            flex:
              0 0 184px;

            scroll-snap-align:
              start;

            padding: 15px;

            display: flex;

            flex-direction:
              column;

            border:
              1px solid
              var(--border);

            border-radius:
              12px;

            background:
              var(--soft);
          }

          .session-card.next {
            border-color:
              rgba(255,71,63,.42);

            background:
              linear-gradient(
                145deg,
                rgba(225,6,0,.13),
                var(--soft)
              );
          }

          .session-card.done {
            opacity: .55;
          }

          .session-card-top {
            display: flex;

            align-items: center;

            justify-content:
              space-between;
          }

          .session-code {
            min-width: 45px;

            height: 29px;

            padding:
              0 8px;

            display: inline-flex;

            align-items: center;

            justify-content:
              center;

            border:
              1px solid
              var(--border);

            border-radius:
              7px;

            font-size: 10px;

            font-weight: 1000;
          }

          .session-card.next
          .session-code {
            color: #fff;

            border-color:
              transparent;

            background:
              linear-gradient(
                135deg,
                #bd0000,
                #ff423a
              );
          }

          .session-state {
            color:
              var(--muted);

            font-size: 8px;

            font-weight: 1000;
          }

          .session-card.next
          .session-state {
            color:
              #ff5a53;
          }

          .session-name {
            margin-top: 17px;

            font-size: 16px;

            font-weight: 1000;
          }

          .session-day {
            margin-top: 6px;

            color:
              var(--muted);

            font-size: 10px;
          }

          .session-time {
            margin-top: auto;

            padding-top: 13px;

            font-size: 20px;

            font-weight: 1000;
          }

          /* =================================================
             PREDICTION — BÜYÜK, DÖNÜŞÜMLÜ SENARYO KARTI
             ================================================= */

          .prediction-card { text-decoration: none; cursor: pointer; }
          .prediction-card:hover { border-color: color-mix(in srgb,var(--accent),transparent 48%); }
          .prediction-card .feature-kicker { font-size: 12px; }
          .prediction-card h3 {
            margin: 16px 0 9px;
            font-size: clamp(32px,3vw,43px);
            line-height: 1.09;
            font-weight: 950;
            letter-spacing: -.045em;
          }
          .prediction-card .prediction-intro {
            max-width: 530px;
            margin: 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.55;
          }
          .prediction-top-points {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
            font-size: 25px;
            font-weight: 1000;
            line-height: 1;
            color: #f1cc64;
          }
          .prediction-top-points span {
            font-size: 8px;
            font-weight: 900;
            letter-spacing: .08em;
            color: var(--muted);
          }
          .prediction-spotlight {
            position: relative;
            min-height: 236px;
            margin-top: 20px;
            overflow: hidden;
            isolation: isolate;
            border: 1px solid color-mix(in srgb,var(--accent),transparent 71%);
            border-radius: 15px;
            background: linear-gradient(136deg,rgba(225,6,0,.17),rgba(225,6,0,.045) 48%,rgba(255,255,255,.025) 100%);
          }
          .prediction-spotlight::before {
            content: "?";
            position: absolute;
            z-index: -1;
            right: -5px;
            bottom: -52px;
            color: color-mix(in srgb,var(--accent),transparent 93%);
            font-size: 260px;
            font-weight: 1000;
            line-height: 1;
            pointer-events: none;
          }
          .prediction-spotlight::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 3px;
            background: linear-gradient(90deg,var(--accent),rgba(255,255,255,.2),transparent);
            opacity: .9;
          }
          .prediction-spotlight-inner { padding: 24px 25px 22px; }
          .prediction-spotlight-question { animation: predictionQuestionIn .52s cubic-bezier(.2,.75,.2,1) both; }
          @keyframes predictionQuestionIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .prediction-spotlight-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .prediction-spotlight-category {
            color: var(--accent);
            font-size: 10px;
            font-weight: 1000;
            letter-spacing: .11em;
          }
          .prediction-spotlight-counter {
            color: var(--muted);
            font-size: 10px;
            font-weight: 850;
            font-variant-numeric: tabular-nums;
          }
          .prediction-spotlight-question h4 {
            max-width: 460px;
            min-height: 69px;
            margin: 18px 0 11px;
            color: var(--text);
            font-size: clamp(25px,2.4vw,34px);
            line-height: 1.18;
            font-weight: 950;
            letter-spacing: -.035em;
          }
          .prediction-spotlight-question p {
            max-width: 440px;
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.5;
          }
          .prediction-spotlight-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 14px;
            margin-top: 19px;
            padding-top: 14px;
            border-top: 1px solid var(--border);
          }
          .prediction-spotlight-choice {
            color: var(--text);
            font-size: 12px;
            font-weight: 1000;
            letter-spacing: .05em;
          }
          .prediction-spotlight-choice em { font-style: normal; color: var(--accent); }
          .prediction-spotlight-hint {
            color: var(--muted);
            font-size: 10px;
            font-weight: 800;
          }
          .prediction-summary-line {
            display: flex;
            flex-wrap: wrap;
            gap: 9px 19px;
            margin: 20px 0 2px;
            color: var(--muted);
            font-size: 10px;
            font-weight: 950;
            letter-spacing: .04em;
          }
          .prediction-card .feature-footer { font-size: 11px; }
          @media (prefers-reduced-motion: reduce) {
            .prediction-spotlight-question { animation: none; }
          }
          @media (max-width: 740px) {
            .prediction-spotlight { min-height: 220px; }
            .prediction-spotlight-inner { padding: 20px; }
            .prediction-spotlight-question h4 { font-size: clamp(24px,6vw,30px); min-height: 0; }
            .prediction-card h3 { font-size: clamp(31px,7.3vw,41px); }
          }

          /* =================================================
             PREDICTION — LEGACY STYLES (HARİCİ ALANLAR İÇİN)
             ================================================= */

          .prediction-overview {
            display: grid;

            grid-template-columns:
              82px
              minmax(0,1fr);

            gap: 9px;

            margin-top: 17px;
          }

          .prediction-max {
            display: flex;

            flex-direction:
              column;

            align-items: center;

            justify-content:
              center;

            border:
              1px solid
              rgba(240,202,90,.20);

            border-radius:
              11px;

            background:
              rgba(240,202,90,.05);
          }

          .prediction-max strong {
            color: #f0ca5a;

            font-size: 27px;
          }

          .prediction-max span {
            color:
              var(--muted);

            font-size: 7px;

            text-align: center;
          }

          .prediction-types {
            display: grid;

            gap: 6px;
          }

          .prediction-type {
            min-height: 31px;

            padding:
              0 10px;

            display: flex;

            align-items: center;

            justify-content:
              space-between;

            border:
              1px solid
              var(--border);

            border-radius:
              8px;

            background:
              var(--soft);

            font-size: 9px;
          }

          .prediction-type span {
            color:
              var(--muted);
          }

          .prediction-specials {
            display: flex;

            flex-wrap: wrap;

            gap: 5px;

            margin-top: 9px;
          }

          .prediction-special {
            min-height: 24px;

            padding:
              0 7px;

            display:
              inline-flex;

            align-items: center;

            border:
              1px solid
              var(--border);

            border-radius:
              999px;

            color:
              var(--muted);

            background:
              var(--soft);

            font-size: 7px;
          }

          /* =================================================
             PADDOCK — YATAY ŞERİT
             ================================================= */

          .paddock-wide {
            position: relative;
            isolation: isolate;
            overflow: hidden;
            display: grid;
            grid-template-columns: minmax(220px,.75fr) minmax(0,1.7fr);
            gap: 27px;
            align-items: center;
            margin-top: 14px;
            padding: 27px 29px;
            border: 1px solid var(--border);
            border-radius: 17px;
            background: linear-gradient(105deg,var(--panel),var(--panel-deep));
          }
          .paddock-wide::before {
            content: "";
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 3px;
            background: linear-gradient(180deg,var(--accent),transparent 96%);
          }
          .paddock-wide::after {
            content: "";
            z-index: -1;
            position: absolute;
            width: 360px; height: 270px;
            left: -130px; top: -185px;
            pointer-events: none;
            border-radius: 50%;
            background: var(--accent);
            opacity: .08;
            filter: blur(85px);
          }
          .paddock-wide-kicker {
            display: flex; align-items: center; gap: 9px;
            color: var(--accent);
            font-size: 9px; font-weight: 950; letter-spacing: .12em;
          }
          .paddock-wide-pulse {
            height: 7px; width: 7px; flex: 0 0 7px;
            border-radius: 50%; background: var(--accent);
            box-shadow: 0 0 15px var(--accent);
          }
          .paddock-wide-intro h3 {
            margin: 10px 0 6px;
            color: var(--text);
            font-size: clamp(25px,2.55vw,35px);
            letter-spacing: -.04em;
            line-height: 1.1;
          }
          .paddock-wide-intro p {
            max-width: 32ch;
            margin: 0;
            color: var(--muted);
            font-size: 11px; line-height: 1.5;
          }
          .paddock-wide-cta {
            display: inline-flex; align-items: center; gap: 15px;
            margin-top: 18px;
            color: var(--accent);
            font-size: 10px; font-weight: 950;
            text-decoration: none;
          }
          .paddock-wide-cta:hover { gap: 19px; }
          .paddock-wide-links {
            display: grid;
            grid-template-columns: repeat(3,minmax(0,1fr));
            gap: 10px;
          }
          .paddock-wide-tile {
            position: relative;
            display: flex; flex-direction: column;
            min-height: 145px;
            padding: 17px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--soft);
            color: var(--text);
            text-decoration: none;
            transition: background .18s ease,border-color .18s ease,transform .18s ease;
          }
          .paddock-wide-tile:hover,.paddock-wide-tile:focus-visible {
            border-color: var(--accent);
            background: rgba(225,6,0,.07);
            transform: translateY(-2px);
          }
          .paddock-wide-tile-icon {
            display: grid; place-items: center;
            width: 34px; height: 34px;
            margin-bottom: 13px;
            border-radius: 9px;
            background: var(--panel);
            font-size: 17px;
          }
          .paddock-wide-tile strong { font-size: 12px; font-weight: 900; }
          .paddock-wide-tile small {
            margin-top: 6px; padding-right: 7px;
            color: var(--muted);
            font-size: 9px; line-height: 1.45;
          }
          .paddock-wide-tile-arrow {
            position: absolute; top: 17px; right: 15px;
            color: var(--accent); font-size: 16px;
          }


          /* =================================================
             FEATURE FOOTER
             ================================================= */

          .feature-footer {
            position: absolute;

            left: 27px;
            right: 27px;
            bottom: 20px;

            padding-top: 14px;

            display: flex;

            align-items: center;

            justify-content:
              space-between;

            color:
              var(--accent);

            border-top:
              1px solid
              var(--border);

            font-size: 9px;

            font-weight: 1000;
          }

          .feature-arrow {
            width: 33px;
            height: 33px;

            display: grid;

            place-items:
              center;

            border:
              1px solid
              var(--border);

            border-radius: 50%;
          }

          /* =================================================
             SECTION HEADERS
             ================================================= */

          .section-head {
            margin:
              42px 0 15px;

            display: flex;

            align-items:
              flex-end;

            justify-content:
              space-between;
          }

          .section-title {
            padding-left: 15px;

            border-left:
              4px solid
              var(--accent);
          }

          .section-title h2 {
            margin: 0;

            font-size: 33px;
          }

          .section-title p {
            margin:
              5px 0 0;

            color:
              var(--muted);

            font-size: 11px;
          }

          .section-link {
            padding:
              10px 13px;

            border:
              1px solid
              var(--border);

            border-radius:
              8px;

            color:
              var(--text);

            background:
              var(--soft);

            font-size: 9px;

            font-weight: 900;
          }

          /* =================================================
             CHAMPIONSHIP
             ================================================= */

          .champ-layout {
            display: grid;

            grid-template-columns:
              minmax(0,1.25fr)
              minmax(320px,.75fr);

            gap: 14px;
          }

          .champ-card,
          .last-race-card {
            padding: 23px;

            border:
              1px solid
              var(--border);

            border-radius:
              17px;

            background:
              linear-gradient(
                155deg,
                var(--panel),
                var(--panel-deep)
              );
          }

          .champ-switch {
            position: relative;
          }

          .champ-switch input {
            position: absolute;

            opacity: 0;
          }

          .champ-header {
            display: flex;

            justify-content:
              space-between;

            align-items: center;

            margin-bottom: 16px;
          }

          .champ-tabs {
            display: flex;

            gap: 5px;
          }

          .champ-tabs label {
            padding:
              10px 14px;

            border-radius: 7px;

            color:
              var(--muted);

            font-size: 9px;

            font-weight: 1000;

            cursor: pointer;
          }

          #champ-drivers:checked
          ~ .champ-header
          label[for="champ-drivers"],
          #champ-teams:checked
          ~ .champ-header
          label[for="champ-teams"] {
            color: #fff;

            background:
              #d6282c;
          }

          .drivers-panel,
          .teams-panel {
            display: none;
          }

          #champ-drivers:checked
          ~ .champ-panels
          .drivers-panel {
            display: block;
          }

          #champ-teams:checked
          ~ .champ-panels
          .teams-panel {
            display: block;
          }

          .standing-row {
            min-height: 55px;

            display: grid;

            grid-template-columns:
              38px
              5px
              1fr
              78px;

            gap: 11px;

            align-items: center;

            border-bottom:
              1px solid
              var(--border);
          }

          .team-line {
            height: 27px;

            border-radius:
              4px;
          }

          .standing-name,
          .result-driver {
            font-size: 12px;

            font-weight: 1000;
          }

          .standing-meta,
          .result-team {
            color:
              var(--muted);

            font-size: 9px;
          }

          .points {
            text-align: right;

            font-weight: 1000;
          }

          .result-row {
            min-height: 49px;

            display: grid;

            grid-template-columns:
              36px
              5px
              1fr;

            gap: 10px;

            align-items: center;

            border-bottom:
              1px solid
              var(--border);
          }

          /* =================================================
             BOARD
             ================================================= */

          .board-marquee {
            overflow: hidden;

            padding:
              18px 14px;

            border:
              1px solid
              var(--border);

            border-radius:
              18px;
          }

          .board-track {
            display: flex;

            gap: 18px;

            width:
              max-content;

            animation:
              boardMove 46s
              linear infinite;
          }

          @keyframes boardMove {
            to {
              transform:
                translateX(-50%);
            }
          }

          .board-card {
            width: 255px;

            aspect-ratio:
              3 / 4.5;

            flex:
              0 0 255px;

            overflow: hidden;

            border-radius:
              18px;
          }

          .board-card img {
            width: 100%;
            height: 100%;

            object-fit: cover;
          }

          /* =================================================
             EVENTS
             ================================================= */

          .events-duo {
            display: grid;

            grid-template-columns:
              1fr 1fr;

            gap: 14px;
          }

          .event-rect {
            display: grid;

            grid-template-columns:
              .42fr 1fr;

            min-height: 215px;

            overflow: hidden;

            color:
              var(--text);

            border:
              1px solid
              var(--border);

            border-radius:
              16px;

            background:
              var(--panel);
          }

          .event-media img {
            width: 100%;
            height: 100%;

            object-fit: cover;
          }

          .event-content {
            padding: 23px;

            display: flex;

            flex-direction:
              column;

            justify-content:
              center;
          }

          .event-label,
          .event-go {
            color:
              var(--accent);

            font-size: 9px;

            font-weight: 1000;
          }

          .event-content p {
            color:
              var(--muted);

            font-size: 10px;
          }

          /* =================================================
             MANAGER
             ================================================= */

          .manager-banner {
            position: relative;

            display: block;

            min-height: 320px;

            margin-top: 14px;

            padding: 36px;

            overflow: hidden;

            color: #fff;

            border-radius:
              18px;

            background:
              radial-gradient(
                circle at 88% 14%,
                rgba(255,29,24,.30),
                transparent 32%
              ),
              linear-gradient(
                125deg,
                #351014,
                #191b21 58%,
                #101318
              );
          }

          .manager-banner h2 {
            font-size:
              clamp(
                37px,
                4vw,
                55px
              );
          }

          .manager-banner p {
            max-width: 650px;

            color: #a8b0ba;
          }

          .features {
            display: flex;

            flex-wrap: wrap;

            gap: 7px;
          }

          .features span {
            padding:
              7px 9px;

            border:
              1px solid
              rgba(255,255,255,.09);

            border-radius:
              7px;

            font-size: 8px;
          }

          /* =================================================
             ETKİNLİK LİSTESİ · İKİ OYUN · HERO PROGRAMI
             ================================================= */

          .events-stack { display:grid; gap:10px; margin-top:14px; }
          .event-list-row { display:grid; grid-template-columns: 54px 150px minmax(0,1fr) 35px;
            gap:22px; align-items:center; min-height:126px; padding:12px 24px 12px 18px;
            border:1px solid var(--border); border-radius:15px; background:var(--panel);
            color:var(--text); text-decoration:none; transition:border-color .2s,transform .2s,background .2s; }
          .event-list-row:hover { border-color:var(--accent);
            background:color-mix(in srgb,var(--panel),var(--accent) 5%); }
          .event-list-index { color:var(--accent); font-size:27px; font-weight:950;
            font-variant-numeric:tabular-nums; opacity:.85; }
          .event-list-cover { position:relative; height:99px; min-width:0; overflow:hidden; display:flex; align-items:center; justify-content:center;
            border-radius:10px; background:linear-gradient(145deg,#510e15,#151820); color:#fff;
            border:1px solid var(--border); font-weight:950; font-size:23px; }
          .event-list-cover img { position:absolute; inset:0; display:block; width:100%; height:100%;
            max-width:none; max-height:none; object-fit:cover; }
          .event-list-info { min-width:0; }
          .event-list-meta { display:flex; align-items:center; gap:9px; color:var(--accent);
            font-size:10px; font-weight:900; letter-spacing:.05em; }
          .event-list-meta i { font-style:normal; color:var(--muted); }
          .event-list-info h3 { margin:7px 0 4px; color:var(--text); font-size:clamp(18px,2vw,24px);
            line-height:1.2; overflow-wrap:anywhere; }
          .event-list-info p { margin:0; color:var(--muted); font-size:12px; }
          .event-list-arrow { display:grid; place-items:center; width:34px; height:34px;
            color:var(--accent); border:1px solid var(--border); border-radius:50%; font-size:19px; }
          .events-stack-empty { padding:30px 25px; border:1px solid var(--border); border-radius:14px;
            background:var(--panel); color:var(--muted); font-size:13px; }

          .arcade-home-grid { margin-top:16px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
          .arcade-home-card { position:relative; min-height:250px; overflow:hidden;
            display:flex; flex-direction:column; justify-content:flex-end; padding:30px;
            color:#fff!important; text-decoration:none; border:1px solid rgba(255,255,255,.10);
            border-radius:22px; transition:transform .22s ease,border-color .22s ease, box-shadow .22s ease;
            box-shadow:0 22px 46px rgba(0,0,0,.26); isolation:isolate; }
          .arcade-home-card::before { content:""; position:absolute; inset:-20% auto auto -8%; width:58%; height:70%; border-radius:999px;
            background:radial-gradient(circle,rgba(255,255,255,.13),transparent 68%); filter:blur(10px); opacity:.85; z-index:-1; }
          .arcade-home-card::after { content:""; position:absolute; inset:0; z-index:-1;
            background:linear-gradient(130deg, rgba(255,255,255,.05), transparent 28%, transparent 65%, rgba(255,255,255,.04)),
                       repeating-linear-gradient(115deg, rgba(255,255,255,.04) 0 2px, transparent 2px 18px);
            opacity:.32; pointer-events:none; }
          .arcade-home-card:hover { transform:translateY(-4px); border-color:rgba(255,100,92,.55); box-shadow:0 28px 64px rgba(0,0,0,.34); }
          .arcade-home-manager { background:radial-gradient(circle at 100% 0%,rgba(255,75,70,.34),transparent 45%),radial-gradient(circle at 14% 85%,rgba(255,145,110,.16),transparent 42%),linear-gradient(130deg,#311018,#171c28 78%); }
          .arcade-home-whatif { background:radial-gradient(circle at 88% 15%,rgba(240,190,85,.22),transparent 42%),radial-gradient(circle at 0% 100%,rgba(117,88,255,.15),transparent 40%),linear-gradient(120deg,#1f1728,#131a26 78%); }
          .arcade-home-kartrush { background:radial-gradient(circle at 84% 18%,rgba(76,197,255,.23),transparent 45%),radial-gradient(circle at 12% 82%,rgba(255,87,87,.18),transparent 42%),linear-gradient(130deg,#101d31,#121821 76%); }
          .arcade-home-timing { background:radial-gradient(circle at 86% 12%,rgba(100,255,208,.20),transparent 42%),radial-gradient(circle at 0% 100%,rgba(255,124,72,.16),transparent 42%),linear-gradient(135deg,#10231e,#131a25 78%); }
          .arcade-home-card h3 { margin:0 0 10px; color:#fff!important; font-size:clamp(28px,3vw,39px); line-height:1.08; letter-spacing:-.04em; }
          .arcade-home-card p { max-width:46ch; color:#d1d5df; line-height:1.65; font-size:14px; margin:0; }

          .intel-weekend-program { margin-top:auto; padding:16px 16px 10px;
            border:1px solid var(--hero-border); border-radius:13px;
            background:rgba(255,255,255,.028); color:#fff; }
          .intel-program-header { display:flex; justify-content:space-between; align-items:center;
            gap:8px; padding-bottom:9px; }
          .intel-program-header span { font-size:9px; font-weight:950; letter-spacing:.08em; color:var(--accent); }
          .intel-program-header small { font-size:8px; font-weight:850; color:var(--hero-muted); }
          .intel-program-row { display:flex; align-items:center; justify-content:space-between; gap:10px;
            padding:11px 0; border-top:1px solid var(--hero-border); }
          .intel-program-row strong { font-size:12px; font-weight:850; }
          .intel-program-row time { color:var(--hero-muted); font-size:10px; text-align:right; }
          .intel-program-empty { padding:17px 0; color:var(--hero-muted); font-size:11px; }
          @media(max-width:1050px){ .intel-weekend-program {margin-top:15px;} }
          @media(max-width:740px){
            .arcade-home-grid{grid-template-columns:1fr;}
            .arcade-home-card{min-height:275px;padding:26px;}
            .event-list-row { grid-template-columns:35px 82px minmax(0,1fr) 19px; gap:10px;
              padding:11px; min-height:104px; }
            .event-list-cover { height:78px; }
            .event-list-index { font-size:19px; }
            .event-list-info h3 { font-size:16px; }
            .event-list-info p { font-size:10px; }
            .event-list-meta { font-size:8px; flex-wrap:wrap; }
            .event-list-arrow { border:0; width:19px; height:30px; }
          }

          /* =================================================
             HAFTALIK YORUM / KALAN YARIŞLAR
             ================================================= */

          .intel-weekly-note {
            display: grid; gap: 5px; margin-top: 13px; padding: 15px 17px;
            border: 1px solid rgba(255,72,64,.27); border-radius: 13px;
            background: linear-gradient(110deg,rgba(225,6,0,.13),rgba(255,255,255,.018));
            color: #fff; text-decoration: none; transition: border-color .2s;
          }
          .intel-weekly-note:hover { border-color: var(--accent); }
          .intel-weekly-note span { color: var(--accent); font-size: 8px; font-weight: 900; letter-spacing: .07em; }
          .intel-weekly-note strong { color: #fff; font-size: 17px; }
          .intel-weekly-note small { color: var(--hero-muted); font-size: 10px; line-height: 1.4;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .intel-weekly-note em { margin-top: 5px; font-size: 9px; font-style: normal; font-weight: 900; color: var(--accent); }
          /* Yarış kartı: başlık önde, satıra dokununca gerçek seans takvimi açılır. */
          .feature-card.live { padding-top: 24px; }
          .live-titleline { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
          .feature-card.live .live-titleline h3 {
            margin: 0; font-size: clamp(32px,3.2vw,43px); font-weight: 950;
            letter-spacing: -.045em; line-height: 1.12;
          }
          .live-titleline .feature-icon { flex: 0 0 40px; width: 40px; height: 40px; }
          .remaining-head { margin-top: 19px; padding-bottom: 10px; border-bottom: 1px solid var(--border);
            display: flex; justify-content: space-between; align-items: center; gap: 10px; }
          .remaining-head strong { font-size: 10px; letter-spacing: .08em; }
          .remaining-head span { color: var(--accent); font-size: 9px; font-weight: 900; }
          .remaining-list { max-height: 326px; overflow-y: auto; scrollbar-width: thin;
            scrollbar-color: rgba(255,72,64,.4) transparent; margin-top: 4px; }
          .remaining-detail { border-bottom: 1px solid var(--border); }
          .remaining-detail[open] { background: linear-gradient(90deg,rgba(225,6,0,.055),transparent 92%); }
          .remaining-row { display: grid; grid-template-columns: 39px minmax(0,1fr) auto 15px;
            gap: 10px; align-items: center; min-height: 61px; padding: 0 10px;
            cursor: pointer; list-style: none; transition: background .18s; }
          .remaining-row::-webkit-details-marker { display: none; }
          .remaining-row:hover, .remaining-row:focus-visible { background: rgba(225,6,0,.09); outline: none; }
          .remaining-row:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
          .remaining-detail.next > .remaining-row { background: linear-gradient(90deg,rgba(225,6,0,.11),transparent 85%); }
          .remaining-round { font-weight: 950; font-size: 10px; color: var(--accent); }
          .remaining-name { min-width: 0; }
          .remaining-name strong { font-size: 12px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .remaining-name small { display: block; margin-top: 3px; color: var(--muted); font-size: 9px; }
          .remaining-row time { color: var(--muted); font-size: 10px; font-weight: 800; white-space: nowrap; }
          .remaining-expand { color: var(--accent); display: inline-block; font-size: 18px;
            line-height: 1; transition: transform .18s; }
          .remaining-detail[open] .remaining-expand { transform: rotate(180deg); }
          .remaining-sessions { padding: 2px 16px 15px 59px; }
          .remaining-session-heading { display: flex; justify-content: space-between; gap: 8px;
            border-bottom: 1px solid var(--border); padding: 9px 0; }
          .remaining-session-heading span { color: var(--muted); font-size: 8px; font-weight: 900; letter-spacing: .08em; }
          .remaining-session-heading span:last-child { color: var(--accent); }
          .remaining-session { display: flex; justify-content: space-between; gap: 12px;
            align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
          .remaining-session:last-child { border-bottom: none; }
          .remaining-session strong { color: var(--text); font-size: 10px; font-weight: 800; }
          .remaining-session time { color: var(--muted); font-size: 10px; white-space: nowrap; }
          .remaining-session.race-session strong, .remaining-session.race-session time { color: var(--accent); font-weight: 950; }
          .remaining-empty { padding: 40px 10px; font-size: 12px; color: var(--muted); }

          .weekly-editorial { margin-top: 14px; overflow: hidden; border-radius: 18px;
            border: 1px solid var(--border); background: linear-gradient(145deg,var(--panel),var(--panel-deep)); }
          .weekly-editorial-head { display: flex; align-items: baseline; flex-wrap: wrap;
            column-gap: 17px; row-gap: 7px; padding: 19px 27px; border-bottom: 1px solid var(--border);
            background: linear-gradient(90deg,rgba(225,6,0,.1),transparent); }
          .weekly-editorial-head span { color: var(--accent); font-size: 9px; font-weight: 1000; letter-spacing: .13em; }
          .weekly-editorial-head strong { color: var(--text); font-size: 21px; font-weight: 950; }
          .weekly-editorial-head small { margin-left: auto; color: var(--muted); font-size: 9px; letter-spacing: .1em; }
          .weekly-editorial-body { display: grid; grid-template-columns: minmax(0,1.3fr) minmax(210px,.7fr);
            gap: 30px; padding: 30px; align-items: start; }
          .weekly-editorial-body:not(:has(.weekly-image)) { grid-template-columns: 1fr; }
          .weekly-edition { font-size: 10px; font-weight: 900; color: var(--accent); letter-spacing: .11em; }
          .weekly-editorial-copy h2 { margin: 9px 0 13px; font-size: clamp(25px,3vw,38px); line-height: 1.15; }
          .weekly-lead { font-size: 15px; font-weight: 650; color: var(--text); line-height: 1.6; }
          .weekly-longtext { margin-top: 19px; max-width: 83ch; white-space: pre-line;
            line-height: 1.9; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
          .weekly-author { padding-top: 19px; margin-top: 23px; border-top: 1px solid var(--border);
            color: var(--accent); letter-spacing: .08em; font-size: 9px; font-weight: 950; }
          .weekly-image { width: 100%; overflow: hidden; border-radius: 12px; border: 1px solid var(--border); background: #11151c; }
          .weekly-image img { width: 100%; max-height: 510px; object-fit: cover; display: block; }
          .weekly-empty { display: flex; align-items: center; gap: 17px; padding: 40px 30px; }
          .weekly-empty > span { font-size: 40px; color: var(--accent); }
          .weekly-empty strong { display: block; font-size: 17px; }
          .weekly-empty p { color: var(--muted); font-size: 12px; }

          @media (max-width: 740px) {
            .weekly-editorial-body { grid-template-columns: 1fr; padding: 21px; }
            .weekly-editorial-head { padding: 18px 21px; }
            .weekly-editorial-head small { margin-left: 0; }
            .weekly-editorial-body:not(:has(.weekly-image)) { grid-template-columns: 1fr; }
            .remaining-name strong { font-size: 11px; }
            .remaining-sessions { padding-left: 14px; }
            .remaining-session { flex-wrap: wrap; gap: 4px; }
            .remaining-session time { white-space: normal; }
            .feature-card.live .live-titleline h3 { font-size: 34px; }
          }


          /* 2026 Ana sayfa: yarış bilgileri ve sade analiz kartı */
          .hero-race-brief {
            display: flex; align-items: center; gap: 14px;
            margin-top: 23px; max-width: 620px;
            padding: 15px 18px; border-radius: 13px;
            border: 1px solid rgba(255,255,255,.14);
            background: linear-gradient(110deg,rgba(255,65,57,.13),rgba(8,12,18,.56));
            box-shadow: 0 14px 28px rgba(0,0,0,.12);
            backdrop-filter: blur(12px);
          }
          .hero-brief-mark { font-size: 25px; line-height: 1; color: var(--accent); }
          .hero-brief-copy { flex: 1 1 auto; min-width: 120px; }
          .hero-brief-side { flex: 1 1 0; min-width: 115px; text-align: left;
            padding-left: 16px; border-left: 1px solid rgba(255,255,255,.12); }
          .hero-brief-copy span, .hero-brief-side span {
            display: block; margin-bottom: 5px; color: var(--hero-muted);
            font-weight: 900; letter-spacing: .10em; font-size: 9px;
          }
          .hero-brief-copy strong, .hero-brief-side strong {
            color: #fff; font-size: clamp(12px, 1.1vw, 15px); line-height: 1.45;
          }
          .intel-stage { height: 258px; }
          .intel-slide { padding: 29px 24px; display: flex; flex-direction: column;
            justify-content: center; gap: 13px; background: none !important; }
          .intel-slide::after, .intel-slide::before { display: none !important; content: none !important; }
          .intel-slide h3 { margin: 0; max-width: 23ch; font-size: clamp(23px,2.1vw,30px);
            line-height: 1.18; letter-spacing: -.035em; }
          .intel-slide p { max-width: 36ch; margin: 0; font-size: 12px; line-height: 1.65; }
          .feature-card.live .live-titleline h3 { font-size: clamp(25px, 2.4vw, 33px); letter-spacing: -.035em; }
          .prediction-card > h3 { font-size: clamp(27px, 2.5vw, 35px); }
          @media (max-width: 740px) {
            .hero-race-brief { flex-wrap: wrap; gap: 10px; padding: 13px 14px; }
            .hero-brief-side { flex: 1 1 100%; text-align: left; padding: 10px 0 0;
              border-left: 0; border-top: 1px solid rgba(255,255,255,.12); }
            .feature-card.live .live-titleline h3 { font-size: 27px; }
          }

          /* Sağ sütunda kompakt pilot haberleri + haftalık yorum */
          .intel { gap: 12px; padding: 24px; min-width: 0; }
          .intel-head h2 { margin: 0; font-size: clamp(21px, 1.75vw, 25px); line-height: 1.15; }
          .pilot-news-card {
            position: relative; min-height: 176px; padding: 16px 17px;
            border: 1px solid rgba(255,72,64,.25); border-radius: 13px;
            background: linear-gradient(120deg,rgba(225,6,0,.075),rgba(255,255,255,.025));
            color: #fff;
          }
          .pilot-news-topline { display:flex; align-items:center; justify-content:space-between; gap:8px; }
          .pilot-news-topline > span:first-child { color:var(--accent); font-size: 8px; font-weight:950; letter-spacing:.07em; }
          .pilot-news-counter { color:var(--hero-muted); font-size:9px; white-space:nowrap; }
          .pilot-news-content { margin-top: 17px; animation: pilotNewsFade .45s ease both; }
          @keyframes pilotNewsFade { from { opacity:.45; transform:translateY(5px); } to {opacity:1; transform:none;} }
          .pilot-news-title { color:#fff !important; text-decoration:none; display:-webkit-box;
            -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
            font-size: 16px; font-weight:850; line-height:1.32; }
          .pilot-news-title:hover { color:var(--accent) !important; }
          .pilot-news-meta { margin-top: 10px; display:flex; align-items:center; justify-content:space-between; gap:8px;
            color:var(--hero-muted); font-size: 9px; }
          .pilot-news-meta a, .pilot-news-empty a { color:var(--accent) !important; text-decoration:none; font-weight:950;
            font-size:9px; white-space:nowrap; }
          .pilot-news-empty { margin-top: 17px; }
          .pilot-news-empty strong { font-size: 15px; font-weight:900; }
          .pilot-news-empty p { margin: 7px 0 10px; font-size:10px; color:var(--hero-muted); line-height:1.55; }
          .pilot-news-controls { position:absolute; right:12px; bottom:9px; display:flex; gap:5px; }
          .pilot-news-controls button { color:#fff; background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.12);
            width:26px; height:23px; border-radius:6px; cursor:pointer; font-size:18px; }
          .pilot-news-controls button:hover { border-color:var(--accent); }
          .pilot-news-card:has(.pilot-news-controls) .pilot-news-meta { padding-right:57px; }
          .intel-weekly-note { margin-top:0; min-height:118px; justify-content:center; padding: 14px 17px; }
          .intel-weekly-note strong { font-size: 15px; }
          @media (prefers-reduced-motion: reduce) { .pilot-news-content { animation:none; } }
          @media (max-width:740px) { .intel { padding:19px; } .pilot-news-card { min-height:160px; } }

          /* G6.14.5: Kaydırılabilir etkinlik listesi geri geldi.
             Offscreen kartları geç çizerek uzun listelerde kaydırma yükünü azalt. */
          .events-stack {
            max-height: 534px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            align-content: start;
            overscroll-behavior-y: contain;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,80,75,.55) rgba(255,255,255,.04);
          }
          .events-stack:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
          .events-stack::-webkit-scrollbar { width: 7px; }
          .events-stack::-webkit-scrollbar-thumb { background: rgba(255,80,75,.46); border-radius: 20px; }
          .events-stack::-webkit-scrollbar-track { background: rgba(255,255,255,.035); border-radius: 20px; }
          .events-stack .event-list-row {
            content-visibility: auto;
            contain-intrinsic-size: auto 126px;
          }
          @media (max-width: 740px) {
            .events-stack { max-height: 450px; padding-right: 4px; }
            .events-stack .event-list-row { contain-intrinsic-size: auto 104px; }
          }

          /* Pist hakkında kısa ve dönüşümlü bilgi kartı. */
          .track-insight-card {
            position:relative; margin-top:auto; padding: 15px 17px 36px;
            border: 1px solid var(--hero-border); border-radius: 13px;
            background: linear-gradient(130deg,rgba(255,255,255,.04),rgba(225,6,0,.045));
            color: #fff; min-height: 145px;
          }
          .track-insight-text { animation: pilotNewsFade .36s ease both; }
          .track-insight-text strong { display:block; font-size: 15px; line-height:1.35; font-weight:900; }
          .track-insight-text p { margin:8px 0 0; font-size:11px; line-height:1.55; color:var(--hero-muted); }
          .track-insight-source { display:inline-block; margin-top:8px; font-size:9px; font-weight:900; color:var(--accent)!important; text-decoration:none; }
          .track-insight-actions { position:absolute; bottom:11px; left:17px; right:17px; display:flex; align-items:center; justify-content:space-between; }
          .track-insight-count { font-size:9px; color:var(--hero-muted); font-weight:850; }
          .track-insight-buttons { display:flex; gap:5px; }
          .track-insight-buttons button { width:26px; height:24px; cursor:pointer; color:#fff;
            border:1px solid rgba(255,255,255,.16); border-radius:6px; background:rgba(255,255,255,.04); }
          .track-insight-buttons button:hover { border-color:var(--accent); }
          @media(prefers-reduced-motion:reduce){ .track-insight-text{animation:none;} }
          @media(max-width:740px){ .track-insight-card{margin-top:8px;min-height:128px;} }

          /* Son duzenleme: sag kart metinleri ayni soldan baslar. */
          .intel .intel-weekly-note {
            justify-content: stretch;
            justify-items: start;
            grid-template-columns: minmax(0, 1fr);
            align-content: center;
            text-align: left;
          }
          .intel .intel-weekly-note > * { max-width: 100%; }
          @media (min-width: 1051px) {
            .intel {
              display: grid;
              grid-template-rows: auto minmax(170px, 1.1fr) minmax(110px, .72fr) minmax(150px, 1fr);
              align-content: stretch;
              gap: 12px;
            }
            .intel .pilot-news-card,
            .intel .intel-weekly-note,
            .intel .track-insight-card {
              min-width: 0;
              min-height: 0;
              width: 100%;
              height: 100%;
              margin: 0;
              box-sizing: border-box;
            }
            .intel .pilot-news-card { padding-bottom: 36px; overflow: hidden; }
            .intel .intel-weekly-note { align-self: stretch; }
          }
          /* Takvim: ilk 4-5 satir gorunur, kalanlar kutuda kaydirilir.
             Bir onceki sinirsiz yukseklik kartlari gereksiz uzatiyordu. */
          /* Iki komsu kart, icerikleri farkli olsa da ayni alt hizada biter. */
          .feature-grid { align-items: stretch; }
          .feature-card.live {
            display: flex;
            flex-direction: column;
            min-height: 0;
            padding-bottom: 20px;
          }
          .feature-card.live .remaining-head { flex: 0 0 auto; }
          .feature-card.live .remaining-list {
            flex: 0 1 auto;
            max-height: 305px;
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
          }
          .feature-card.live .feature-footer {
            position: static;
            flex: 0 0 auto;
            margin-top: auto;
          }
          .remaining-name strong { font-size: 13px; }
          @media (max-width: 740px) {
            .feature-card.live { min-height: 0; }
            .feature-card.live .feature-footer { margin-top: 12px; }
            .feature-card.live .remaining-list { max-height: 305px; }
          }

          /* Son duzenleme: sol kart dort yarisi gosterir; sag kart
             kompakt kalir. Sol karti boslukla uzatmiyoruz. */
          .feature-card.live .remaining-list {
            max-height: 248px;
            flex: 0 1 auto;
          }
          .feature-card.live .feature-footer {
            margin-top: 10px;
          }
          .prediction-card {
            min-height: 0;
            padding: 21px 23px 66px;
          }
          .prediction-card > h3 {
            margin: 10px 0 0;
            font-size: clamp(26px, 2.3vw, 33px);
            line-height: 1.13;
          }
          .prediction-card .prediction-spotlight {
            min-height: 190px;
            margin-top: 15px;
          }
          .prediction-card .prediction-spotlight-inner {
            padding: 18px 20px 16px;
          }
          .prediction-card .prediction-spotlight-question h4 {
            min-height: 0;
            margin: 12px 0 6px;
            font-size: clamp(23px, 2.15vw, 29px);
            line-height: 1.15;
          }
          .prediction-card .prediction-spotlight-question p {
            font-size: 11px;
            line-height: 1.4;
          }
          .prediction-card .prediction-spotlight-bottom {
            margin-top: 13px;
            padding-top: 11px;
          }
          .prediction-card .prediction-summary-line {
            margin: 12px 0 0;
          }
          .prediction-card .feature-footer {
            bottom: 17px;
            left: 23px;
            right: 23px;
          }
          @media (max-width: 740px) {
            .feature-card.live .remaining-list { max-height: 248px; }
            .prediction-card { padding: 21px 20px 68px; }
            .prediction-card .prediction-spotlight { min-height: 195px; }
            .prediction-card .prediction-spotlight-question h4 { font-size: 25px; }
            .prediction-card .feature-footer { left: 20px; right: 20px; }
          }

          /* =================================================
             RESPONSIVE
             ================================================= */

          @media(
            max-width: 1050px
          ) {
            .hero {
              grid-template-columns:
                1fr;
            }

            /*
              Desktop'ta sağa doğru olan geçiş,
              tek sütunda aşağıya doğru akar.
            */

            .hero-main::after {
              top: auto;
              left: 0;
              right: 0;
              bottom: 0;

              width: auto;
              height: 110px;

              background:
                linear-gradient(
                  180deg,
                  transparent,
                  var(--hero-intel-bg)
                );
            }

            .intel {
              border-left: 0;

              border-top:
                1px solid
                var(--hero-border);
            }

            .feature-grid {
              grid-template-columns:
                1fr 1fr;
            }

            .feature-card.live {
              grid-column: auto;
            }
            .paddock-wide {
              grid-template-columns: 1fr;
            }
            .paddock-wide-intro p { max-width: none; }

            .champ-layout {
              grid-template-columns:
                1fr;
            }

            .events-duo {
              grid-template-columns:
                1fr;
            }
          }

          @media(
            max-width: 740px
          ) {
            .wrap {
              width:
                calc(100% - 20px);
            }

            .feature-grid {
              grid-template-columns:
                1fr;
            }

            .feature-card.live {
              grid-column: auto;
            }
            .paddock-wide { padding: 22px 20px; gap: 18px; }
            .paddock-wide-links { grid-template-columns: 1fr; }
            .paddock-wide-tile { min-height: 86px; padding: 13px 14px 13px 59px; justify-content: center; }
            .paddock-wide-tile-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); margin: 0; }
            .paddock-wide-tile small { margin-top: 3px; }

            .hero-main {
              padding:
                27px 24px;
            }

            .intel {
              padding:
                24px;
            }

            .hero h1 {
              font-size:
                clamp(
                  43px,
                  13vw,
                  67px
                );
            }

            .race-signature {
              flex-wrap: wrap;
            }

            .section-head {
              align-items:
                flex-start;

              flex-direction:
                column;

              gap: 12px;
            }

            .board-card {
              width: 205px;

              flex-basis:
                205px;
            }

            .event-rect {
              grid-template-columns:
                1fr;
            }
          }
        `}</style>

        <div className="ambient-grid" />

        <div className="racing-line one" />

        <div className="racing-line two" />

        <div className="racing-line three" />

        <div className="wrap">

          {/* =================================================
              HERO
              ================================================= */}

          <section className="hero">

            {/* HERO PHOTO SIDE */}

            <div className="hero-main">
              <RaceHeroBackground
                images={
                  heroImages
                }
              />

              <div className="hero-shade" />

              <div className="hero-copy">
                <div className="eyebrow">
                  {race
                    ? `ROUND ${race.round} · ${race.circuitName}`
                    : "SOCIAL"}
                </div>

                <div className="pills">
                  <span className="pill">
                    NEXT RACE
                  </span>

                  {race?.sprint && (
                    <span className="pill">
                      SPRINT WEEKEND
                    </span>
                  )}

                  {isLive && (
                    <span
                      className="pill"
                      style={{
                        color:
                          "#69e69d",
                      }}
                    >
                      ●{" "}
                      {currentSession
                        ?.shortLabel ??
                        "LIVE"}
                    </span>
                  )}
                </div>

                <h1>
                  <span className="hero-title-top">
                    {
                      title.top
                    }
                  </span>

                  <span className="hero-title-bottom">
                    {
                      title.bottom
                    }
                  </span>
                </h1>

                {race && (
                  <div className="race-signature">
                    <span>
                      {race.city.toUpperCase()}
                      ,{" "}
                      {race.country.toUpperCase()}
                    </span>

                    <i />

                    <span>
                      {
                        race.circuitName
                      }
                    </span>

                    <i />

                    <strong>
                      ROUND{" "}
                      {
                        race.round
                      }
                    </strong>
                  </div>
                )}

                {race && (
                  <div className="hero-countdown">
                    <div className="hero-countdown-label">
                      LIGHTS OUT IN
                    </div>

                    <div className="countdown-scale">
                      <RaceCountdown
                        raceDate={
                          race.raceDate
                        }
                        raceTime={
                          race.raceTime
                        }
                      />
                    </div>
                  </div>
                )}

                {race && (
                  <div className="hero-race-brief" aria-label="Grand Prix hızlı yarış bilgileri">
                    <div className="hero-brief-mark" aria-hidden="true">✦</div>
                    <div className="hero-brief-copy">
                      <span>YARIŞ BAŞLANGICI</span>
                      <strong>{formatSessionTimeTR(race.raceDate, race.raceTime)}</strong>
                    </div>
                    <div className="hero-brief-side">
                      <span>SIRADAKİ SEANS</span>
                      <strong>{isLive ? (currentSession?.shortLabel ?? "Canlı") : nextSession ? `${nextSession.shortLabel} · ${formatF1SessionTimeTR(nextSession.startTimestamp)}` : "Program bekleniyor"}</strong>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* QUICK INTEL SIDE */}

            <aside className="intel">
              <div className="intel-head">
                <h2>Yarışa Başlarken</h2>
              </div>

              <DriverNewsCarousel
                items={pilotNews}
                raceName={race?.raceName ?? "Gelecek Grand Prix"}
              />

              <a href="#haftalik-yorum" className="intel-weekly-note">
                <span>HAFTALIK MAGAZİN</span>
                <strong>İdil Boyalı'dan Haftalık Yorum</strong>
                <small>{weeklyCommentary?.summary || "Haftanın yarış değerlendirmesi burada yayınlanacak."}</small>
                <em>YORUMU OKU →</em>
              </a>

              <TrackInsightCarousel items={trackInsights} raceName={race?.raceName ?? "Formula 1"} />

            </aside>
          </section>

          {/* =================================================
              PRIMARY FEATURES — TWO CARDS
              ================================================= */}

          <section className="feature-grid">

            {/* LIVE */}

            <article className="feature-card live">
              <div className="live-titleline">
                <h3>Canlı Yarış Merkezi</h3>
                <div className="feature-icon" aria-hidden="true">{isLive ? "●" : "◷"}</div>
              </div>

              <div className="remaining-head">
                <strong>KALAN YARIŞ TAKVİMİ</strong>
                <span>{remainingRaces.length} GRAND PRIX</span>
              </div>

              {remainingRaces.length > 0 ? (
                <div className="remaining-list">
                  {remainingRaces.map((item, index) => (
                    <details className={`remaining-detail ${index === 0 ? "next" : ""}`} key={`${seasonYear}-${item.round}`}>
                      <summary className="remaining-row">
                        <span className="remaining-round">R{String(item.round).padStart(2, "0")}</span>
                        <span className="remaining-name">
                          <strong>{item.raceName.replace(/ Grand Prix$/i, " GP")}</strong>
                          <small>{item.city} · {item.country}</small>
                        </span>
                        <time dateTime={item.raceDate}>{formatCalendarDate(item.raceDate)}</time>
                        <span className="remaining-expand" aria-hidden="true">⌄</span>
                      </summary>
                      <div className="remaining-sessions">
                        <div className="remaining-session-heading">
                          <span>HAFTA SONU PROGRAMI</span>
                          <span>TÜRKİYE SAATİ</span>
                        </div>
                        {(item.sessions ?? []).map((session) => (
                          <div className={`remaining-session ${session.name === "Yarış" ? "race-session" : ""}`} key={`${session.name}-${session.date}`}>
                            <strong>{session.name}</strong>
                            <time dateTime={session.time ? `${session.date}T${session.time}` : session.date}>
                              {formatSessionTimeTR(session.date, session.time)}
                            </time>
                          </div>
                        ))}
                        {!item.sessions?.length && (
                          <div className="remaining-session">Seans programı henüz açıklanmadı.</div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="remaining-empty">
                  Bu sezon için yaklaşan başka Grand Prix bulunmuyor.
                </div>
              )}

              <Link
                href="/live"
                className="feature-footer"
              >
                <span>
                  {isLive
                    ? "CANLI MERKEZE GİT"
                    : "YARIŞ MERKEZİNE GİT"}
                </span>

                <div className="feature-arrow">
                  →
                </div>
              </Link>
            </article>

            {/* PREDICTION — DÖNÜŞÜMLÜ SENARYO SORULARI */}

            <Link href="/predict" className="feature-card prediction-card">
              <div className="feature-top">
                <div className="feature-kicker">PREDICTION CENTER</div>
                <div className="prediction-top-points">323 <span>MAKS. PUAN</span></div>
              </div>

              <h3>Hafta Sonu Tahmini</h3>
              <RotatingPredictionPrompt />

              <div className="prediction-summary-line">
                <span>🏆 PODYUM</span>
                <span>⚑ 12 SENARYO</span>
                <span>⚡ 4 ÖZEL SEÇİM</span>
              </div>

              <div className="feature-footer">
                <span>TAHMİNLERİNİ YAP →</span>
                <div className="feature-arrow" aria-hidden="true">→</div>
              </div>
            </Link>

          </section>

          {/* =================================================
              PADDOCK — YATAY TOPLULUK ALANI
              ================================================= */}

          <section className="paddock-wide" aria-label="Paddock topluluğu">
            <div className="paddock-wide-intro">
              <div className="paddock-wide-kicker">
                <span className="paddock-wide-pulse" aria-hidden="true" />
                SOCIAL PADDOCK
              </div>
              <h3>Paddock Nabzı</h3>
              <p>Yarış heyecanının toplulukla buluştuğu yer.</p>
              <Link href="/paddock" className="paddock-wide-cta">
                PADDOCK'A GİT <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="paddock-wide-links">
              <Link href="/paddock" className="paddock-wide-tile">
                <span className="paddock-wide-tile-icon" aria-hidden="true">🏁</span>
                <strong>Yarış Hafta Sonu</strong>
                <small>Tahminler, yorumlar ve tartışmalar.</small>
                <span className="paddock-wide-tile-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link href="/arcade" className="paddock-wide-tile">
                <span className="paddock-wide-tile-icon" aria-hidden="true">🏎️</span>
                <strong>Paddock Arcade</strong>
                <small>Manager, Quiz ve mini oyunlar.</small>
                <span className="paddock-wide-tile-arrow" aria-hidden="true">↗</span>
              </Link>
              <Link href="/paddock" className="paddock-wide-tile">
                <span className="paddock-wide-tile-icon" aria-hidden="true">👥</span>
                <strong>Topluluk</strong>
                <small>Paylaş, takip et ve etkileşime geç.</small>
                <span className="paddock-wide-tile-arrow" aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>

          {/* =================================================
              HAFTALIK YORUM — ADMİN PANELİNDEN YÖNETİLİR
              ================================================= */}

          <section className="weekly-editorial" id="haftalik-yorum">
            <div className="weekly-editorial-head">
              <strong>İdil Boyalı'dan Haftalık Yorum</strong>
              <small>HAFTALIK MAGAZİN</small>
            </div>
            {weeklyCommentary ? (
              <article className="weekly-editorial-body">
                <div className="weekly-editorial-copy">
                  <div className="weekly-edition">{weeklyCommentary.week_label || "HAFTALIK DEĞERLENDİRME"}</div>
                  <h2>{weeklyCommentary.title}</h2>
                  {weeklyCommentary.summary && <p className="weekly-lead">{weeklyCommentary.summary}</p>}
                  <div className="weekly-longtext">{weeklyCommentary.content}</div>
                  <div className="weekly-author">İDİL BOYALI · SOCIAL YÖNETİM EKİBİ</div>
                </div>
                {weeklyCommentary.image_url && (
                  <div className="weekly-image">
                    <img src={weeklyCommentary.image_url} alt={`${weeklyCommentary.title} — haftalık yorum görseli`} loading="lazy" />
                  </div>
                )}
              </article>
            ) : (
              <div className="weekly-empty">
                <span>✦</span>
                <div><strong>Bu haftanın yorumu hazırlanıyor.</strong>
                <p>Yeni analiz, yönetim panelinden yayımlandığında burada görünecek.</p></div>
              </div>
            )}
          </section>

          {/* =================================================
              CHAMPIONSHIP
              ================================================= */}

          <div className="section-head">
            <div className="section-title">
              <h2>Şampiyona Form Tablosu</h2>
            </div>
          </div>

          <section className="champ-layout">
            <HomeChampionshipLive initialDrivers={driverStandings.map((driver) => ({ ...driver, color: teamColor(driver.team) }))} initialTeams={constructorStandings.map((team) => ({ ...team, color: teamColor(team.name) }))} currentRound={race?.round ?? 0} />
            <div className="last-race-card">
              <div className="eyebrow">
                LAST RACE
              </div>

              <h3>
                {lastRace.raceName ??
                  "Son Yarış"}
              </h3>

              {lastRace.results
                .slice(
                  0,
                  7
                )
                .map(
                  (
                    result
                  ) => (
                    <div
                      className="result-row"
                      key={`${result.position}-${result.code}`}
                    >
                      <strong>
                        P
                        {
                          result.position
                        }
                      </strong>

                      <span
                        className="team-line"
                        style={{
                          background:
                            teamColor(
                              result.team
                            ),
                        }}
                      />

                      <div>
                        <div className="result-driver">
                          {
                            result.code
                          }{" "}
                          {
                            result.name
                          }
                        </div>

                        <div className="result-team">
                          {
                            result.team
                          }
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          </section>

          {/* =================================================
              BOARD
              ================================================= */}

          <div className="section-head">
            <div className="section-title">
              <h2>
                Yönetim Kurulu · 2026/27
              </h2>

              <p>
                Kulübün yönetim ekibi.
              </p>
            </div>

            <Link
              href="/board"
              className="section-link"
            >
              TÜMÜNÜ GÖR →
            </Link>
          </div>

          {marqueeMembers.length >
          0 && (
            <div className="board-marquee">
              <div className="board-track">
                {marqueeMembers.map(
                  (
                    member,
                    index
                  ) => (
                    <Link
                      href="/board"
                      className="board-card"
                      key={`${member.id}-${index}`}
                    >
                      {member.image_url ? (
                        <img
                          src={
                            member.image_url
                          }
                          alt={
                            member.name ??
                            "Yönetim Kurulu"
                          }
                        />
                      ) : (
                        <div>
                          F1
                        </div>
                      )}
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          {/* =================================================
              EVENTS
              ================================================= */}

          <div className="section-head">
            <div className="section-title">
              <h2>
                Etkinlikler
              </h2>

              <p>
                Kulüp etkinlikleri.
              </p>
            </div>

            <Link
              href="/events"
              className="section-link"
            >
              TÜM ETKİNLİKLER →
            </Link>
          </div>

          <section className="events-stack" tabIndex={0} aria-label="Kulüp etkinlikleri. Daha fazla etkinlik için listeyi kaydırın">
            {homeEvents.length ? homeEvents.map(({ event, upcoming }, index) => (
              <Link href="/events" className="event-list-row" key={event.id}>
                <div className="event-list-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="event-list-cover">
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt={`${event.title} etkinlik görseli`}
                      loading="lazy"
                      decoding="async"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `${eventThumbnailPositions.get(event.id)?.x ?? 50}% ${eventThumbnailPositions.get(event.id)?.y ?? 50}%`,
                      }}
                    />
                  ) : <span>F1</span>}
                </div>
                <div className="event-list-info">
                  <span className="event-list-meta">
                    {upcoming ? "YAKLAŞAN ETKİNLİK" : "GEÇMİŞ ETKİNLİK"}
                    <i aria-hidden="true">·</i>
                    {formatEventType(event.event_type)}
                  </span>
                  <h3>{event.title}</h3>
                  <p>{formatEventDate(event.start_at)}{event.location_name ? ` · ${event.location_name}` : ""}</p>
                </div>
                <span className="event-list-arrow" aria-hidden="true">↗</span>
              </Link>
            )) : (
              <div className="events-stack-empty">Henüz yayımlanmış etkinlik bulunmuyor. Yeni etkinlikler burada sıralanacak.</div>
            )}
          </section>


          {/* =================================================
              ARCADE — İKİ EŞİT OYUN KARTI
              ================================================= */}

          <div className="section-head">
            <div className="section-title">
              <h2>F1 Arcade</h2>
              <p>F1 SOCIAL arcade alanında dört farklı deneyime hemen gir.</p>
            </div>
          </div>

          <section className="arcade-home-grid" aria-label="F1 Arcade oyunları">
            <Link href="/arcade/manager" className="arcade-home-card arcade-home-manager">
              <h3>F1 Manager</h3>
              <p>Takımını yönet, pilot transferlerini planla ve çok sezonlu kariyer yapısında pit wall kararlarını sen ver.</p>
            </Link>
            <Link href="/arcade/what-if" className="arcade-home-card arcade-home-whatif">
              <h3>What If</h3>
              <p>Alternatif finiş sıraları kur, şampiyona puanlarını anında hesapla ve farklı senaryoları karşılaştır.</p>
            </Link>
            <Link href="/arcade/kart-rush" className="arcade-home-card arcade-home-kartrush">
              <h3>Kart Rush 3D</h3>
              <p>3D pistte sür, rakiplerine karşı yarış ve kulübün arcade bölümündeki hızlı aksiyon deneyimine gir.</p>
            </Link>
            <Link href="/arcade/gokart-zamanlama" className="arcade-home-card arcade-home-timing">
              <h3>Go-Kart Zamanlama</h3>
              <p>Gerçek karting turlarını kaydet, sürücü ve takım sıralamalarını takip et, seans sonuçlarını kolayca yönet.</p>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
