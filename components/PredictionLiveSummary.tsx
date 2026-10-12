"use client";

import { useEffect, useMemo, useState } from "react";

type Picks = { P1: number | null; P2: number | null; P3: number | null };
type Props = {
  initialPrediction: Picks | null;
  drivers: { driver_number: number; full_name?: string; name_acronym?: string; broadcast_name?: string; team_colour?: string }[];
  season: number;
  round: number;
  predictionType: "race" | "sprint";
};

export default function PredictionLiveSummary({ initialPrediction, drivers, season, round, predictionType }: Props) {
  const [picks, setPicks] = useState<Picks>(initialPrediction ?? { P1: null, P2: null, P3: null });
  const [popular, setPopular] = useState<{ ready: boolean; total: number; podium: Record<string, Record<string, number>> } | null>(null);
  const lookup = useMemo(() => new Map(drivers.map((driver) => [driver.driver_number, driver])), [drivers]);

  useEffect(() => {
    const listener = (event: Event) => {
      const value = (event as CustomEvent<Picks>).detail;
      if (value) setPicks(value);
    };
    window.addEventListener("f1-prediction-change", listener);
    return () => window.removeEventListener("f1-prediction-change", listener);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/predict/community?season=${season}&round=${round}&type=${predictionType}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active && result) setPopular(result); })
      .catch(() => {});
    return () => { active = false; };
  }, [season, round, predictionType]);

  const getName = (number: number | null) => {
    if (number === null) return "Pilot bekleniyor";
    const driver = lookup.get(number);
    return driver?.full_name || driver?.broadcast_name || driver?.name_acronym || `#${number}`;
  };

  return (
    <div className="side-card prediction-live-summary" style={{ borderColor: "rgba(234,62,72,.32)", background: "linear-gradient(150deg,rgba(80,20,34,.42),var(--panel-2))" }}>
      <div className="side-eyebrow">ANLIK TAHMİN KARTIN</div>
      <h3>Seçtiğin Podyum</h3>
      {(["P1", "P2", "P3"] as const).map((slot) => {
        const number = picks[slot];
        const driver = number === null ? null : lookup.get(number);
        return (
          <div key={slot} className="score-row" style={{ minHeight: 52, gap: 7 }}>
            <b style={{ color: "#ff626c", minWidth: 27 }}>{slot}</b>
            <b style={{ flex: 1, color: "#f8f9fc", fontSize: 11 }}>{getName(number)}</b>
            <span style={{ width: 4, height: 23, borderRadius: 6, background: driver?.team_colour ? `#${driver.team_colour}` : "#4d5360" }} />
          </div>
        );
      })}
      <p className="score-status">Seçimlerin adımlar arasında korunur. Kaydet butonuna basmadan veritabanına gönderilmez.</p>
      {popular?.ready && popular.total >= 10 ? (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 13, marginTop: 14 }}>
          <div className="side-eyebrow">TOPLULUKTA EN POPÜLER P1</div>
          {Object.entries(popular.podium.P1 || {}).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([number,count]) => (
            <div key={number} className="score-row"><span>{getName(Number(number))}</span><b>%{Math.round(100 * count / popular.total)}</b></div>
          ))}
          <p className="score-status">{popular.total} kayıtlı tahminin toplu istatistiği</p>
        </div>
      ) : (
        <p className="score-status">Topluluk yüzdeleri en az 10 katılımcıdan sonra görünür.</p>
      )}
    </div>
  );
}
