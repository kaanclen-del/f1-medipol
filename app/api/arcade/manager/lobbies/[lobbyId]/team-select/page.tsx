"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import Header from "@/components/Header";

const teams = [
  { id: "mclaren", name: "McLaren", code: "MCL" },
  { id: "ferrari", name: "Ferrari", code: "FER" },
  { id: "red-bull", name: "Red Bull Racing", code: "RBR" },
  { id: "mercedes", name: "Mercedes", code: "MER" },
  { id: "aston-martin", name: "Aston Martin", code: "AMR" },
  { id: "alpine", name: "Alpine", code: "ALP" },
  { id: "williams", name: "Williams", code: "WIL" },
  { id: "haas", name: "Haas", code: "HAS" },
  { id: "racing-bulls", name: "Racing Bulls", code: "RB" },
  { id: "audi", name: "Audi", code: "AUD" },
  { id: "cadillac", name: "Cadillac", code: "CAD" },
];

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "member";
  team_key: string | null;

  profile: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type TeamSelectionData = {
  lobby: {
    id: string;
    created_by: string;
    name: string;
    status: string;
  };

  members: Member[];

  currentUserId: string;

  currentMember: {
    id: string;
    user_id: string;
    role: "owner" | "member";
    team_key: string | null;
  };

  isOwner: boolean;
};

export default function TeamSelectPage({
  params,
}: {
  params: Promise<{
    lobbyId: string;
  }>;
}) {
  const { lobbyId } = use(params);

  const [data, setData] =
    useState<TeamSelectionData | null>(null);

  const [selectedTeam, setSelectedTeam] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function loadData(
    silent = false
  ) {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetch(
        `/api/arcade/manager/lobbies/${lobbyId}/team-selection`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Takım seçimi yüklenemedi."
        );

        return;
      }

      setData(result);

      if (
        !selectedTeam &&
        result.currentMember?.team_key
      ) {
        setSelectedTeam(
          result.currentMember.team_key
        );
      }
    } catch {
      setMessage(
        "Takım seçimi yüklenirken hata oluştu."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData();

    const interval =
      window.setInterval(() => {
        loadData(true);
      }, 2500);

    return () =>
      window.clearInterval(interval);
  }, [lobbyId]);

  async function saveTeam() {
    if (!selectedTeam) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/arcade/manager/lobbies/${lobbyId}/team-selection`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            teamKey: selectedTeam,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Takım kaydedilemedi."
        );

        return;
      }

      setMessage(
        "Takım seçimin kaydedildi."
      );

      await loadData(true);
    } catch {
      setMessage(
        "Takım kaydedilirken bağlantı hatası oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight: "100vh",
            background: "#070707",
            color: "white",
            padding: "100px 24px",
          }}
        >
          Takım seçimi yükleniyor...
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header />

        <main
          style={{
            minHeight: "100vh",
            background: "#070707",
            color: "white",
            padding: "100px 24px",
          }}
        >
          {message || "Lobi bulunamadı."}
        </main>
      </>
    );
  }

  const selected =
    teams.find(
      (team) =>
        team.id === selectedTeam
    ) ?? null;

  const confirmedTeam =
    data.currentMember?.team_key;

  const selectedCount =
    data.members.filter(
      (member) => member.team_key
    ).length;

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: "100vh",

          background:
            "radial-gradient(circle at 50% -10%, rgba(210,38,61,.18), transparent 35%), #070707",

          color: "white",

          padding:
            "55px 24px 100px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              marginBottom: "35px",
            }}
          >
            <div
              style={{
                color: "#d2263d",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              MANAGER MODE · TEAM SELECTION
            </div>

            <h1
              style={{
                margin: 0,
                fontSize:
                  "clamp(40px, 6vw, 68px)",
                letterSpacing: "-3px",
              }}
            >
              Takımını Seç
            </h1>

            <p
              style={{
                color: "#818892",
                lineHeight: 1.7,
              }}
            >
              {data.lobby.name} ·{" "}
              {selectedCount}/
              {data.members.length} oyuncu
              takımını seçti.
            </p>
          </div>

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",

              gap: "14px",
            }}
          >
            {teams.map((team) => {
              const owner =
                data.members.find(
                  (member) =>
                    member.team_key ===
                    team.id
                );

              const takenByOther =
                owner &&
                owner.user_id !==
                  data.currentUserId;

              const active =
                selectedTeam === team.id;

              const confirmed =
                confirmedTeam === team.id;

              const ownerName =
                owner?.profile
                  ?.display_name ||
                owner?.profile
                  ?.username ||
                "Oyuncu";

              return (
                <button
                  key={team.id}
                  type="button"

                  disabled={
                    !!takenByOther
                  }

                  onClick={() => {
                    if (
                      !takenByOther
                    ) {
                      setSelectedTeam(
                        team.id
                      );

                      setMessage("");
                    }
                  }}

                  style={{
                    textAlign: "left",
                    minHeight: "165px",
                    padding: "22px",

                    borderRadius: "18px",

                    border: active
                      ? "1px solid #d2263d"
                      : confirmed
                      ? "1px solid rgba(91,215,134,.45)"
                      : "1px solid rgba(255,255,255,.075)",

                    background:
                      takenByOther
                        ? "rgba(255,255,255,.015)"
                        : active
                        ? "linear-gradient(145deg, rgba(210,38,61,.22), rgba(210,38,61,.035))"
                        : "rgba(255,255,255,.025)",

                    color: "white",

                    cursor:
                      takenByOther
                        ? "not-allowed"
                        : "pointer",

                    opacity:
                      takenByOther
                        ? 0.38
                        : 1,
                  }}
                >
                  <div
                    style={{
                      color: active
                        ? "#ff5369"
                        : "#626a74",

                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "2px",
                    }}
                  >
                    {team.code}
                  </div>

                  <div
                    style={{
                      marginTop: "48px",
                      fontSize: "21px",
                      fontWeight: 900,
                    }}
                  >
                    {team.name}
                  </div>

                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    {takenByOther
                      ? `${ownerName} TARAFINDAN SEÇİLDİ`
                      : confirmed
                      ? "✓ SENİN TAKIMIN"
                      : active
                      ? "SEÇİLDİ"
                      : "TAKIMI SEÇ"}
                  </div>
                </button>
              );
            })}
          </div>

          <section
            style={{
              marginTop: "24px",

              border:
                "1px solid rgba(255,255,255,.08)",

              borderRadius: "18px",

              padding: "22px",

              background:
                "rgba(255,255,255,.025)",

              display: "flex",

              justifyContent:
                "space-between",

              alignItems: "center",

              gap: "20px",

              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#676e78",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "1.5px",
                }}
              >
                SEÇİLEN TAKIM
              </div>

              <div
                style={{
                  marginTop: "7px",
                  fontSize: "22px",
                  fontWeight: 900,
                }}
              >
                {selected
                  ? selected.name
                  : "Henüz takım seçmedin"}
              </div>
            </div>

            <button
              type="button"

              disabled={
                !selectedTeam ||
                saving
              }

              onClick={saveTeam}

              style={{
                minWidth: "230px",
                minHeight: "52px",

                border: 0,

                borderRadius: "12px",

                background:
                  selectedTeam
                    ? "#d2263d"
                    : "rgba(255,255,255,.06)",

                color:
                  selectedTeam
                    ? "white"
                    : "#545b65",

                fontWeight: 900,

                cursor:
                  selectedTeam
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {saving
                ? "Kaydediliyor..."
                : confirmedTeam ===
                  selectedTeam
                ? "Takım Kaydedildi"
                : "Takımı Onayla"}
            </button>
          </section>

          {message && (
            <div
              style={{
                marginTop: "16px",

                padding:
                  "14px 16px",

                borderRadius:
                  "12px",

                background:
                  "rgba(210,38,61,.08)",

                border:
                  "1px solid rgba(210,38,61,.22)",

                color: "#ff9cab",
              }}
            >
              {message}
            </div>
          )}
        </div>
      </main>
    </>
  );
}