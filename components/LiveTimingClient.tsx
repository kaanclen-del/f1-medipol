"use client";

import { useEffect, useState } from "react";

type LiveDriver = {
  driver_number: number;
  full_name?: string;
  broadcast_name?: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
  headshot_url?: string;

  position: number | null;

  interval:
    | number
    | string
    | null;

  gap_to_leader:
    | number
    | string
    | null;

  last_lap: number | null;

  lap_number: number | null;

  tyre: string | null;

  stint_number: number | null;
};

type LiveSession = {
  session_key?: number;
  session_name?: string;
  session_type?: string;
  location?: string;
  country_name?: string;
  date_start?: string;
  date_end?: string;
};

type LiveData = {
  live: boolean;
  updated_at?: string;
  session: LiveSession | null;
  drivers: LiveDriver[];
};

function formatLapTime(
  seconds: number | null
) {
  if (
    seconds === null ||
    !Number.isFinite(seconds)
  ) {
    return "—";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    seconds % 60;

  return `${minutes}:${remaining
    .toFixed(3)
    .padStart(6, "0")}`;
}

function formatInterval(
  driver: LiveDriver
) {
  if (driver.position === 1) {
    return "LEADER";
  }

  if (
    driver.interval !== null &&
    driver.interval !== undefined
  ) {
    if (
      typeof driver.interval ===
      "number"
    ) {
      return `+${driver.interval.toFixed(
        3
      )}`;
    }

    return String(driver.interval);
  }

  if (
    driver.gap_to_leader !== null &&
    driver.gap_to_leader !== undefined
  ) {
    if (
      typeof driver.gap_to_leader ===
      "number"
    ) {
      return `+${driver.gap_to_leader.toFixed(
        3
      )}`;
    }

    return String(
      driver.gap_to_leader
    );
  }

  return "—";
}

function tyreLetter(
  tyre: string | null
) {
  if (!tyre) {
    return "—";
  }

  const compound =
    tyre.toUpperCase();

  if (compound === "SOFT") {
    return "S";
  }

  if (compound === "MEDIUM") {
    return "M";
  }

  if (compound === "HARD") {
    return "H";
  }

  if (
    compound === "INTERMEDIATE"
  ) {
    return "I";
  }

  if (compound === "WET") {
    return "W";
  }

  return compound.slice(0, 1);
}

export default function LiveTimingClient() {
  const [data, setData] =
    useState<LiveData | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function loadLiveData() {
    try {
      const response =
        await fetch("/api/live", {
          cache: "no-store",
        });

      if (!response.ok) {
        return;
      }

      const result: LiveData =
        await response.json();

      setData(result);
    } catch {
      // Bağlantı geçici olarak koparsa
      // mevcut ekrandaki veri korunur.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLiveData();

    const timer = setInterval(() => {
      loadLiveData();
    }, 4000);

    return () =>
      clearInterval(timer);
  }, []);

  if (loading && !data) {
    return (
      <div
        style={{
          minHeight: "500px",
          display: "grid",
          placeItems: "center",
          color: "#929dab",
        }}
      >
        Canlı timing kontrol ediliyor...
      </div>
    );
  }

  if (!data?.live) {
    return (
      <div
        style={{
          minHeight: "500px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "40px",
        }}
      >
        <div>
          <div
            style={{
              width: "66px",
              height: "66px",
              borderRadius: "50%",
              margin: "0 auto 20px",
              border:
                "1px solid rgba(255,255,255,.10)",
              background:
                "rgba(255,255,255,.035)",
              display: "grid",
              placeItems: "center",
              fontSize: "27px",
            }}
          >
            ⏱
          </div>

          <h3
            style={{
              margin: "0 0 10px",
              fontSize: "24px",
            }}
          >
            Canlı timing şu anda
            kapalı
          </h3>

          <p
            style={{
              maxWidth: "450px",
              margin: "0 auto",
              color: "#929dab",
              lineHeight: 1.7,
              fontSize: "13px",
            }}
          >
            Formula 1 session&apos;ı
            başladığında timing otomatik
            olarak açılacak. Sistem canlı
            veriyi yaklaşık 4 saniyede bir
            kontrol ediyor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {data.drivers.map(
        (driver) => (
          <div
            key={
              driver.driver_number
            }
            style={{
              display: "grid",
              gridTemplateColumns:
                "55px minmax(170px,1fr) 120px 120px 90px",
              gap: "10px",
              alignItems: "center",
              padding: "12px 22px",
              borderBottom:
                "1px solid rgba(255,255,255,.055)",
            }}
          >
            <b
              style={{
                fontSize: "15px",
              }}
            >
              {driver.position
                ? `P${driver.position}`
                : "—"}
            </b>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "4px",
                  height: "40px",
                  borderRadius: "999px",
                  background:
                    driver.team_colour
                      ? `#${driver.team_colour}`
                      : "#666",
                }}
              />

              {driver.headshot_url ? (
                <img
                  src={
                    driver.headshot_url
                  }
                  alt={
                    driver.full_name ||
                    "F1 Driver"
                  }
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius:
                      "50%",
                    objectFit:
                      "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius:
                      "50%",
                    background:
                      "#2a313c",
                    display: "grid",
                    placeItems:
                      "center",
                    fontSize: "10px",
                    fontWeight: 900,
                  }}
                >
                  {driver.name_acronym ||
                    "F1"}
                </div>
              )}

              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: "14px",
                  }}
                >
                  {driver.full_name ||
                    driver.broadcast_name}
                </div>

                <div
                  style={{
                    color: "#8793a1",
                    fontSize: "10px",
                    marginTop: "3px",
                  }}
                >
                  {driver.team_name ||
                    "Formula 1"}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              {formatInterval(
                driver
              )}
            </span>

            <span
              style={{
                fontSize: "12px",
              }}
            >
              {formatLapTime(
                driver.last_lap
              )}
            </span>

            <span
              style={{
                fontSize: "12px",
                fontWeight: 1000,
              }}
            >
              {tyreLetter(
                driver.tyre
              )}
            </span>
          </div>
        )
      )}
    </div>
  );
}