import Link from "next/link";

import Header from "@/components/Header";
import LiveAutoRefresh from "@/components/LiveAutoRefresh";
import RaceCountdown from "@/components/RaceCountdown";
import RaceHeroBackground from "@/components/RaceHeroBackground";

import {
  getRaceHeroImages,
} from "@/lib/race-image";

import {
  getCurrentRaceWeekend,
} from "@/lib/race-data";

import {
  getF1LiveStatus,
  formatF1SessionDayTR,
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

type IntelItem = {
  label: string;
  title: string;
  text: string;
};

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

function getQuickIntel(
  race:
    any,

  leader?:
    | DriverStanding
    | null
): IntelItem[] {
  const raceName =
    (
      race?.raceName ??
      ""
    ).toLowerCase();

  const circuit =
    (
      race?.circuitName ??
      ""
    ).toLowerCase();

  const leaderCode =
    leader?.code ??
    "LDR";

  if (
    raceName.includes(
      "singapore"
    ) ||
    circuit.includes(
      "marina"
    )
  ) {
    return [
      {
        label:
          "FİZİKSEL ETKİ",

        title:
          "Sıcaklık yarışın son bölümünü zorlaştırır",

        text:
          "Yüksek nem ve sıcaklık pilot konsantrasyonunu ve lastik kullanımını daha kritik hale getirir.",
      },

      {
        label:
          "RİSK KARAKTERİ",

        title:
          "Safety Car yarışı tersine çevirebilir",

        text:
          "Dar şehir pisti nedeniyle tek bir temas bile bütün pit stratejilerini değiştirebilir.",
      },

      {
        label:
          "PİLOT ODAĞI",

        title:
          "Duvarlardan uzak kalan kazanır",

        text:
          "Marina Bay hatayı çok hızlı cezalandırır. Kontrollü tempo uzun stintlerde büyük avantaj sağlayabilir.",
      },
    ];
  }

  return [
    {
      label:
        "PİST ANALİZİ",

      title:
        "Araç dengesi belirleyici olacak",

      text:
        "Tek tur performansı ile uzun stint temposu arasında doğru denge kuran takımlar avantaj yakalayabilir.",
    },

    {
      label:
        "STRATEJİ",

      title:
        "Pit penceresi kritik",

      text:
        "Lastik ömrü ve trafik durumu pit zamanlamasını yarış sonucunu değiştirecek kadar önemli hale getirebilir.",
    },

    {
      label:
        "PİLOT ODAĞI",

      title:
        `${leaderCode} referans noktası`,

      text:
        "Şampiyona liderinin temposu rakip takımlar için hafta sonu boyunca ana kıyas noktalarından biri olacak.",
    },
  ];
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function HomePage() {
  const race =
    await getCurrentRaceWeekend();

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

  const {
    data:
      nextEvent,
  } =
    await supabase
      .from(
        "events"
      )
      .select(`
        id,
        title,
        event_type,
        location_name,
        start_at,
        cover_image_url
      `)
      .eq(
        "is_published",
        true
      )
      .gte(
        "start_at",
        nowIso
      )
      .order(
        "start_at",
        {
          ascending:
            true,
        }
      )
      .limit(1)
      .maybeSingle();

  const {
    data:
      pastEvent,
  } =
    await supabase
      .from(
        "events"
      )
      .select(`
        id,
        title,
        event_type,
        location_name,
        start_at,
        cover_image_url
      `)
      .eq(
        "is_published",
        true
      )
      .lt(
        "start_at",
        nowIso
      )
      .order(
        "start_at",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  const boardMembers =
    (
      boardRows ??
      []
    ) as BoardMember[];

  const upcomingEvent =
    (
      nextEvent ??
      null
    ) as EventCard | null;

  const previousEvent =
    (
      pastEvent ??
      null
    ) as EventCard | null;

  const isLive =
    liveStatus.isLive;

  const currentSession =
    liveStatus.currentSession;

  const nextSession =
    liveStatus.nextSession;

  const weekendSchedule =
    liveStatus.sessions;

  const title =
    formatRaceTitle(
      race?.raceName
    );

  const quickIntel =
    getQuickIntel(
      race,

      driverStandings[
        0
      ] ??
        null
    );

  const ticker =
    race
      ? [
          [
            "SIRADAKİ",
            race.raceName,
          ],

          [
            "ROUND",
            `${race.round}`,
          ],

          [
            "PİST",
            race.circuitName,
          ],

          [
            "KONUM",
            `${race.city} · ${race.country}`,
          ],

          [
            "SEANS",

            isLive
              ? `● ${currentSession?.shortLabel ?? "CANLI"}`
              : nextSession
              ? `${nextSession.shortLabel} · ${formatF1SessionTimeTR(
                  nextSession.startTimestamp
                )}`
              : "BEKLENİYOR",
          ],

          [
            "ŞAMPİYONA",

            driverStandings[0]
              ? `${driverStandings[0].code} · ${driverStandings[0].points} P`
              : "GÜNCELLENİYOR",
          ],
        ]
      : [
          [
            "F1 MEDİPOL",
            "RACE HUB",
          ],

          [
            "PADDOCK",
            "TOPLULUK",
          ],

          [
            "MANAGER",
            "CAREER MODE",
          ],
        ];

  const marqueeMembers =
    boardMembers.length
      ? [
          ...boardMembers,
          ...boardMembers,
        ]
      : [];

  const nowTimestamp =
    Date.now();

  return (
    <>
      <LiveAutoRefresh />

      <Header />

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
              minmax(0,1.35fr)
              minmax(0,.825fr)
              minmax(0,.825fr);

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
             PREDICTION
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
             PADDOCK
             ================================================= */

          .paddock-line {
            padding:
              11px 0;

            border-bottom:
              1px solid
              var(--border);
          }

          .paddock-line b {
            display: block;

            font-size: 12px;
          }

          .paddock-line span {
            display: block;

            margin-top: 4px;

            color:
              var(--muted);

            font-size: 10px;
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
              grid-column:
                1 / -1;
            }

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
              grid-column:
                auto;
            }

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
              TICKER
              ================================================= */}

          <div className="ticker">
            <div className="ticker-track">
              {[
                ...ticker,
                ...ticker,
              ].map(
                (
                  item,
                  index
                ) => (
                  <div
                    className="tick"
                    key={
                      index
                    }
                  >
                    <b>
                      {
                        item[0]
                      }
                    </b>

                    <span>
                      {
                        item[1]
                      }
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

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
                    : "F1 MEDİPOL"}
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

                <div className="hero-sub">
                  F1 MEDİPOL · RACE WEEKEND
                </div>

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

                <div className="buttons">
                  <Link
                    href="/live"
                    className="red-btn"
                  >
                    YARIŞ MERKEZİNE GİT →
                  </Link>

                  <Link
                    href="/predict"
                    className="ghost-btn"
                  >
                    TAHMİN YAP
                  </Link>
                </div>
              </div>
            </div>

            {/* QUICK INTEL SIDE */}

            <aside className="intel">
              <div className="intel-head">
                <div>
                  <div className="eyebrow">
                    THIS WEEKEND
                  </div>

                  <h2>
                    Quick Intel
                  </h2>
                </div>

                <div className="intel-status">
                  AUTO
                </div>
              </div>

              <div className="intel-stage">
                <div className="intel-track">
                  {quickIntel.map(
                    (
                      item,
                      index
                    ) => (
                      <article
                        className="intel-slide"
                        key={
                          item.label
                        }
                      >
                        <div className="intel-number">
                          0
                          {index +
                            1}
                        </div>

                        <span className="intel-label">
                          {
                            item.label
                          }
                        </span>

                        <h3>
                          {
                            item.title
                          }
                        </h3>

                        <p>
                          {
                            item.text
                          }
                        </p>
                      </article>
                    )
                  )}
                </div>
              </div>

              <div className="intel-circuit-band">
                <div className="intel-circuit-copy">
                  <small>
                    CIRCUIT FOCUS
                  </small>

                  <strong>
                    {race
                      ?.circuitName ??
                      "Formula 1 Circuit"}
                  </strong>
                </div>

                <div className="intel-circuit-round">
                  R
                  {race?.round ??
                    "—"}
                </div>
              </div>
            </aside>
          </section>

          {/* =================================================
              THREE CARDS
              ================================================= */}

          <section className="feature-grid">

            {/* LIVE */}

            <article className="feature-card live">
              <div className="feature-top">
                <div className="feature-kicker">
                  {isLive
                    ? "LIVE TIMING"
                    : "RACE WEEKEND"}
                </div>

                <div className="feature-icon">
                  {isLive
                    ? "●"
                    : "◷"}
                </div>
              </div>

              <h3>
                Canlı Yarış Merkezi
              </h3>

              {isLive ? (
                <div className="live-active-box">
                  <div className="live-active-label">
                    <span className="live-dot" />

                    SESSION LIVE
                  </div>

                  <h4>
                    {currentSession
                      ?.label ??
                      "Formula 1 Session"}
                  </h4>

                  <p>
                    Takvim üzerinden canlı seans doğrulandı.
                    Yarış merkezinde gerçek zamanlı timing
                    kullanılabilir olduğunda veriler otomatik
                    olarak görüntülenecek.
                  </p>
                </div>
              ) : (
                <>
                  <p>
                    Bu hafta sonunun Formula 1 programını takip
                    et. Seans başladığında bu alan otomatik
                    olarak canlı duruma geçer.
                  </p>

                  <div className="weekend-head">
                    <strong>
                      HAFTA SONU PROGRAMI
                    </strong>

                    <span>
                      TÜRKİYE SAATİ
                    </span>
                  </div>

                  <div className="weekend-schedule">
                    {weekendSchedule.map(
                      (
                        session
                      ) => {
                        const done =
                          nowTimestamp >
                          session.endTimestamp;

                        const next =
                          nextSession
                            ?.key ===
                          session.key;

                        return (
                          <div
                            key={
                              session.key
                            }
                            className={`session-card ${
                              next
                                ? "next"
                                : done
                                ? "done"
                                : ""
                            }`}
                          >
                            <div className="session-card-top">
                              <div className="session-code">
                                {
                                  session.shortLabel
                                }
                              </div>

                              <div className="session-state">
                                {next
                                  ? "SIRADAKİ"
                                  : done
                                  ? "BİTTİ"
                                  : "YAKLAŞIYOR"}
                              </div>
                            </div>

                            <div className="session-name">
                              {
                                session.label
                              }
                            </div>

                            <div className="session-day">
                              {formatF1SessionDayTR(
                                session.startTimestamp
                              )}
                            </div>

                            <div className="session-time">
                              {formatF1SessionTimeTR(
                                session.startTimestamp
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
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

            {/* PREDICTION */}

            <Link
              href="/predict"
              className="feature-card"
            >
              <div className="feature-top">
                <div className="feature-kicker">
                  PREDICTION CENTER
                </div>

                <div className="feature-icon">
                  323
                </div>
              </div>

              <h3>
                Hafta Sonu Tahmini
              </h3>

              <p>
                Sadece ilk üçü değil; podyumu, yarışın
                gidişatını ve kritik detayları tahmin et.
              </p>

              <div className="prediction-overview">
                <div className="prediction-max">
                  <strong>
                    323
                  </strong>

                  <span>
                    MAKS.
                    <br />
                    PUAN
                  </span>
                </div>

                <div className="prediction-types">
                  <div className="prediction-type">
                    <span>
                      🏁 Podyum
                    </span>

                    <b>
                      110 P
                    </b>
                  </div>

                  <div className="prediction-type">
                    <span>
                      ⚠️ 12 Senaryo
                    </span>

                    <b>
                      133 P
                    </b>
                  </div>

                  <div className="prediction-type">
                    <span>
                      ⚡ 4 Özel Seçim
                    </span>

                    <b>
                      80 P
                    </b>
                  </div>
                </div>
              </div>

              <div className="prediction-specials">
                <span className="prediction-special">
                  En Hızlı Tur
                </span>

                <span className="prediction-special">
                  İlk DNF
                </span>

                <span className="prediction-special">
                  En Çok Sıra
                </span>

                <span className="prediction-special">
                  Kazanan Takım
                </span>
              </div>

              <div className="feature-footer">
                <span>
                  TAHMİN MERKEZİNE GİT
                </span>

                <div className="feature-arrow">
                  →
                </div>
              </div>
            </Link>

            {/* PADDOCK */}

            <Link
              href="/paddock"
              className="feature-card"
            >
              <div className="feature-top">
                <div className="feature-kicker">
                  PADDOCK
                </div>

                <div className="feature-icon">
                  F1
                </div>
              </div>

              <h3>
                Paddock Nabzı
              </h3>

              <p>
                Topluluğun yarış hafta sonundaki merkezi.
              </p>

              <div
                style={{
                  marginTop:
                    "14px",
                }}
              >
                <div className="paddock-line">
                  <b>
                    🏁 Yarış Hafta Sonu
                  </b>

                  <span>
                    Tahminler, yorumlar ve tartışmalar.
                  </span>
                </div>

                <div className="paddock-line">
                  <b>
                    🎮 Paddock Arcade
                  </b>

                  <span>
                    Manager, Quiz ve mini oyunlar.
                  </span>
                </div>

                <div className="paddock-line">
                  <b>
                    👥 Topluluk
                  </b>

                  <span>
                    Paylaş, takip et ve etkileşime geç.
                  </span>
                </div>
              </div>

              <div className="feature-footer">
                <span>
                  PADDOCK'A GİT
                </span>

                <div className="feature-arrow">
                  →
                </div>
              </div>
            </Link>
          </section>

          {/* =================================================
              CHAMPIONSHIP
              ================================================= */}

          <div className="section-head">
            <div className="section-title">
              <h2>
                Şampiyona & Form
              </h2>

              <p>
                Güncel Formula 1 puan durumu.
              </p>
            </div>
          </div>

          <section className="champ-layout">
            <div className="champ-card champ-switch">
              <input
                id="champ-drivers"
                type="radio"
                name="championship"
                defaultChecked
              />

              <input
                id="champ-teams"
                type="radio"
                name="championship"
              />

              <div className="champ-header">
                <div>
                  <div className="eyebrow">
                    CHAMPIONSHIP
                  </div>

                  <h3>
                    Güncel Puan Durumu
                  </h3>
                </div>

                <div className="champ-tabs">
                  <label htmlFor="champ-drivers">
                    PİLOTLAR
                  </label>

                  <label htmlFor="champ-teams">
                    TAKIMLAR
                  </label>
                </div>
              </div>

              <div className="champ-panels">
                <div className="drivers-panel">
                  {driverStandings
                    .slice(
                      0,
                      10
                    )
                    .map(
                      (
                        driver
                      ) => (
                        <div
                          className="standing-row"
                          key={
                            driver.code
                          }
                        >
                          <strong>
                            P
                            {
                              driver.position
                            }
                          </strong>

                          <span
                            className="team-line"
                            style={{
                              background:
                                teamColor(
                                  driver.team
                                ),
                            }}
                          />

                          <div>
                            <div className="standing-name">
                              {
                                driver.code
                              }{" "}
                              {
                                driver.name
                              }
                            </div>

                            <div className="standing-meta">
                              {
                                driver.team
                              }
                            </div>
                          </div>

                          <div className="points">
                            {
                              driver.points
                            }
                          </div>
                        </div>
                      )
                    )}
                </div>

                <div className="teams-panel">
                  {constructorStandings
                    .slice(
                      0,
                      10
                    )
                    .map(
                      (
                        team
                      ) => (
                        <div
                          className="standing-row"
                          key={
                            team.name
                          }
                        >
                          <strong>
                            P
                            {
                              team.position
                            }
                          </strong>

                          <span
                            className="team-line"
                            style={{
                              background:
                                teamColor(
                                  team.name
                                ),
                            }}
                          />

                          <div>
                            <div className="standing-name">
                              {
                                team.name
                              }
                            </div>

                            <div className="standing-meta">
                              {
                                team.wins
                              }{" "}
                              GALİBİYET
                            </div>
                          </div>

                          <div className="points">
                            {
                              team.points
                            }
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
            </div>

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

          <section className="events-duo">
            <Link
              href="/events"
              className="event-rect"
            >
              <div className="event-media">
                {upcomingEvent
                  ?.cover_image_url && (
                  <img
                    src={
                      upcomingEvent.cover_image_url
                    }
                    alt={
                      upcomingEvent.title
                    }
                  />
                )}
              </div>

              <div className="event-content">
                <span className="event-label">
                  YAKLAŞAN ETKİNLİK
                </span>

                <h3>
                  {upcomingEvent
                    ?.title ??
                    "Yaklaşan Etkinlik Yok"}
                </h3>

                <p>
                  {upcomingEvent
                    ? `${formatEventType(
                        upcomingEvent.event_type
                      )} · ${formatEventDate(
                        upcomingEvent.start_at
                      )}`
                    : "Yeni etkinlik yayınlandığında burada görünecek."}
                </p>

                <div className="event-go">
                  DETAYLARI GÖR →
                </div>
              </div>
            </Link>

            <Link
              href="/events"
              className="event-rect"
            >
              <div className="event-media">
                {previousEvent
                  ?.cover_image_url && (
                  <img
                    src={
                      previousEvent.cover_image_url
                    }
                    alt={
                      previousEvent.title
                    }
                  />
                )}
              </div>

              <div className="event-content">
                <span className="event-label">
                  GEÇMİŞ ETKİNLİK
                </span>

                <h3>
                  {previousEvent
                    ?.title ??
                    "Geçmiş Etkinlik Yok"}
                </h3>

                <p>
                  {previousEvent
                    ? `${formatEventType(
                        previousEvent.event_type
                      )} · ${formatEventDate(
                        previousEvent.start_at
                      )}`
                    : "Tamamlanan etkinlikler burada görüntülenecek."}
                </p>

                <div className="event-go">
                  ETKİNLİK ARŞİVİ →
                </div>
              </div>
            </Link>
          </section>

          {/* =================================================
              MANAGER
              ================================================= */}

          <div className="section-head">
            <div className="section-title">
              <h2>
                F1 Manager
              </h2>

              <p>
                Kendi Formula 1 kariyerini yönet.
              </p>
            </div>
          </div>

          <Link
            href="/arcade/manager"
            className="manager-banner"
          >
            <div className="eyebrow">
              MANAGER CAREER
            </div>

            <h2>
              Pit Wall senin.
              <br />
              Takımı sen yönet.
            </h2>

            <p>
              Pilot kontratlarından transfer pazarına,
              Ar-Ge yatırımlarından yarış stratejilerine
              kadar bütün kariyer sistemi burada.
            </p>

            <div className="features">
              <span>
                DRIVER MARKET
              </span>

              <span>
                R&D
              </span>

              <span>
                STRATEGY
              </span>

              <span>
                AI TEAMS
              </span>

              <span>
                LIVE RACE
              </span>

              <span>
                MULTI-SEASON
              </span>
            </div>
          </Link>
        </div>
      </main>
    </>
  );
}