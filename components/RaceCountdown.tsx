"use client";

import { useEffect, useState } from "react";

type Props = {
  raceDate: string;
  raceTime?: string;
};

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calculateCountdown(
  raceDate: string,
  raceTime?: string
): Countdown {
  const target = new Date(
    `${raceDate}T${raceTime || "12:00:00Z"}`
  ).getTime();

  const now = Date.now();
  const difference = Math.max(0, target - now);

  return {
    days: Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ),

    hours: Math.floor(
      (difference / (1000 * 60 * 60)) % 24
    ),

    minutes: Math.floor(
      (difference / (1000 * 60)) % 60
    ),

    seconds: Math.floor(
      (difference / 1000) % 60
    ),
  };
}

export default function RaceCountdown({
  raceDate,
  raceTime,
}: Props) {
  const [countdown, setCountdown] =
    useState<Countdown>(() =>
      calculateCountdown(raceDate, raceTime)
    );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(
        calculateCountdown(
          raceDate,
          raceTime
        )
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [raceDate, raceTime]);

  const values = [
    [countdown.days, "GÜN"],
    [countdown.hours, "SAAT"],
    [countdown.minutes, "DAK"],
    [countdown.seconds, "SN"],
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        margin: "28px 0",
        flexWrap: "wrap",
      }}
    >
      {values.map(([value, label]) => (
        <div
          key={label}
          style={{
            width: "88px",
            padding: "13px",
            textAlign: "center",
            borderRadius: "12px",
            border:
              "1px solid rgba(255,255,255,.10)",
            background:
              "rgba(8,12,18,.48)",
            backdropFilter: "blur(8px)",
          }}
        >
          <b
            style={{
              display: "block",
              fontSize: "25px",
            }}
          >
            {String(value).padStart(2, "0")}
          </b>

          <small
            style={{
              color: "#8995a4",
              fontSize: "9px",
            }}
          >
            {label}
          </small>
        </div>
      ))}
    </div>
  );
}