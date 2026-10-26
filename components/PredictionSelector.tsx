"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import type { OpenF1Driver } from "@/lib/openf1";

import {
  BULLETIN_MAX_POINTS,
  PODIUM_MAX_POINTS,
  RACE_BULLETIN_QUESTIONS,
  RACE_MAX_POINTS,
  RACE_SPECIAL_PICKS,
  SPECIAL_MAX_POINTS,
  type RaceBulletinAnswers,
  type RaceSpecialPicks,
} from "@/lib/prediction-scoring";

import { createClient } from "@/utils/supabase/client";

type PodiumSlot = "P1" | "P2" | "P3";
type Stage = "podium" | "bulletin" | "special" | "review";

type SelectedPrediction = {
  P1: number | null;
  P2: number | null;
  P3: number | null;
};

export type PredictionCommunityStats = {
  ready: boolean;
  total: number;
  podium: Record<PodiumSlot, Record<string, number>>;
  bulletin: Record<string, { yes: number; no: number; total: number }>;
  specials: Record<string, { total: number; choices: Record<string, number> }>;
};

type Props = {
  drivers: OpenF1Driver[];
  season: number;
  round: number;
  raceName: string;
  predictionType?: "race" | "sprint";
  initialPrediction?: SelectedPrediction | null;
  initialBulletin?: RaceBulletinAnswers;
  initialSpecialPicks?: RaceSpecialPicks;
  lockAt?: string | null;
};

const EMPTY_PREDICTION: SelectedPrediction = {
  P1: null,
  P2: null,
  P3: null,
};

const PODIUM_SLOTS: { key: PodiumSlot; points: string; label: string }[] = [
  { key: "P1", points: "+50", label: "WINNER" },
  { key: "P2", points: "+35", label: "SECOND PLACE" },
  { key: "P3", points: "+25", label: "THIRD PLACE" },
];

function driverName(driver: OpenF1Driver) {
  return (
    driver.full_name ||
    driver.broadcast_name ||
    driver.name_acronym ||
    `#${driver.driver_number}`
  );
}

function teamColor(driver: OpenF1Driver) {
  const color = driver.team_colour?.replace("#", "").trim();
  return color && /^[0-9a-fA-F]{6}$/.test(color)
    ? `#${color}`
    : "#ff2638";
}

export default function PredictionSelector({
  drivers,
  season,
  round,
  raceName,
  predictionType = "race",
  initialPrediction = null,
  initialBulletin = {},
  initialSpecialPicks = {},
  lockAt = null,
}: Props) {
  const [supabase] = useState(() => createClient());

  const [activeSlot, setActiveSlot] = useState<PodiumSlot>("P1");
  const [selected, setSelected] = useState<SelectedPrediction>(
    initialPrediction ?? EMPTY_PREDICTION
  );
  const [bulletin, setBulletin] =
    useState<RaceBulletinAnswers>(initialBulletin);
  const [specialPicks, setSpecialPicks] =
    useState<RaceSpecialPicks>(initialSpecialPicks);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(
    initialPrediction ? "Kayıtlı tahminin yüklendi." : ""
  );
  const [locked, setLocked] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage>("podium");
  const [community, setCommunity] =
    useState<PredictionCommunityStats | null>(null);
  const [communityRevision, setCommunityRevision] = useState(0);

  const isRace = predictionType === "race";

  const stages: { id: Stage; title: string; subtitle: string }[] = isRace
    ? [
        { id: "podium", title: "Podyum", subtitle: "İlk üç pilot" },
        { id: "bulletin", title: "Senaryolar", subtitle: "12 soru" },
        { id: "special", title: "Özel seçimler", subtitle: "4 tahmin" },
        { id: "review", title: "Son kontrol", subtitle: "Paketi kaydet" },
      ]
    : [
        { id: "podium", title: "Sprint podyumu", subtitle: "İlk üç pilot" },
        { id: "review", title: "Son kontrol", subtitle: "Tahmini kaydet" },
      ];

  const currentStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === currentStage)
  );

  useEffect(() => {
    let cancelled = false;

    const request =
      `/api/predict/community?season=${season}` +
      `&round=${round}&type=${predictionType}`;

    fetch(request, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PredictionCommunityStats | null) => {
        if (!cancelled && data) setCommunity(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [season, round, predictionType, communityRevision]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("f1-prediction-change", { detail: selected })
    );
  }, [selected]);

  useEffect(() => {
    const checkLock = () => {
      if (!lockAt) {
        setLocked(false);
        return;
      }

      const time = new Date(lockAt).getTime();
      setLocked(!Number.isNaN(time) && Date.now() >= time);
    };

    checkLock();
    const timer = window.setInterval(checkLock, 1000);

    return () => window.clearInterval(timer);
  }, [lockAt]);

  const teams = useMemo(
    () =>
      Array.from(
        new Set(
          drivers
            .map((driver) => driver.team_name?.trim())
            .filter((team): team is string => Boolean(team))
        )
      ).sort(),
    [drivers]
  );

  const getDriver = (number: number | null) => {
    if (number === null) return null;
    return drivers.find((driver) => driver.driver_number === number) ?? null;
  };

  const pct = (count: number, total: number) =>
    total > 0 ? Math.round((count * 100) / total) : 0;

  const communityPodium = (slot: PodiumSlot, number: number) => {
    if (!community?.ready) return null;
    return pct(community.podium[slot]?.[String(number)] ?? 0, community.total);
  };

  function navigateStage(stage: Stage) {
    setCurrentStage(stage);
    setMessage("");
    window.scrollTo({ top: 160, behavior: "smooth" });
  }

  function selectDriver(driverNumber: number) {
    if (locked) return;

    const next = { ...selected };

    (Object.keys(next) as PodiumSlot[]).forEach((slot) => {
      if (slot !== activeSlot && next[slot] === driverNumber) {
        next[slot] = null;
      }
    });

    next[activeSlot] = driverNumber;
    setSelected(next);
    setMessage("");

    if (activeSlot === "P1") setActiveSlot("P2");
    else if (activeSlot === "P2") setActiveSlot("P3");
  }

  function answerQuestion(
    key: keyof RaceBulletinAnswers,
    value: "yes" | "no"
  ) {
    if (locked) return;

    setBulletin((current) => ({
      ...current,
      [key]: current[key] === value ? undefined : value,
    }));
  }

  const answeredCount = RACE_BULLETIN_QUESTIONS.filter(
    (item) => bulletin[item.key] === "yes" || bulletin[item.key] === "no"
  ).length;

  const specialCount = RACE_SPECIAL_PICKS.filter((item) => {
    const value = specialPicks[item.key];
    return value !== null && value !== undefined && value !== "";
  }).length;

  async function savePrediction() {
    if (locked) {
      setMessage("Tahmin süresi sona erdi.");
      return;
    }

    if (!selected.P1 || !selected.P2 || !selected.P3) {
      setMessage("Kaydetmeden önce P1, P2 ve P3 pilotlarını seçmelisin.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        season,
        round,
        race_name: raceName,
        prediction_type: predictionType,
        p1_driver_number: selected.P1,
        p2_driver_number: selected.P2,
        p3_driver_number: selected.P3,
        points: 0,
        podium_points: 0,
        bulletin_points: 0,
        special_points: 0,
        score_breakdown: {},
        updated_at: new Date().toISOString(),
      };

      if (isRace) {
        payload.race_bulletin = bulletin;
        payload.special_picks = specialPicks;
      }

      const { error } = await supabase
        .from("predictions")
        .upsert(payload, {
          onConflict: "user_id,season,round,prediction_type",
        });

      if (error) {
        setMessage(`Tahmin kaydedilemedi: ${error.message}`);
        return;
      }

      setMessage(
        isRace
          ? `Yarış tahmin paketin kaydedildi. ${answeredCount}/12 senaryo ve ${specialCount}/4 özel seçim işaretlendi.`
          : "Sprint podyum tahminin kaydedildi."
      );

      setCommunityRevision((revision) => revision + 1);
    } catch (error) {
      console.error("PREDICTION SAVE ERROR:", error);
      setMessage("Beklenmeyen bir hata oluştu. Lütfen tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="prediction-system">
      <style>{`
        .prediction-system {
          --arcade-bg: #08090c;
          --arcade-panel: #101217;
          --arcade-panel-2: #171a21;
          --arcade-line: rgba(255,255,255,.11);
          --arcade-red: #ff2638;
          --arcade-red-dark: #c70c21;
          --arcade-cyan: #58e7ff;
          --arcade-green: #58f0a8;
          --arcade-text: #f6f7fa;
          --arcade-muted: #9ba1ad;
          width: 100%;
          min-width: 0;
          color: var(--arcade-text);
          font-family: inherit;
          isolation: isolate;
        }

        .prediction-system,
        .prediction-system * {
          box-sizing: border-box;
        }

        .prediction-system button,
        .prediction-system select {
          font: inherit;
        }

        .prediction-system button:focus-visible,
        .prediction-system select:focus-visible {
          outline: 2px solid var(--arcade-cyan);
          outline-offset: 3px;
        }

        .prediction-system .race-control-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 24px;
          align-items: end;
          margin-bottom: 16px;
          padding: clamp(22px,4vw,38px);
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 19px;
          background:
            linear-gradient(115deg,rgba(255,38,56,.16),transparent 48%),
            repeating-linear-gradient(135deg,rgba(255,255,255,.018) 0 1px,transparent 1px 9px),
            linear-gradient(135deg,#181a21,#090a0e 72%);
          box-shadow: 0 18px 45px rgba(0,0,0,.2);
        }

        .prediction-system .race-control-hero::before {
          position: absolute;
          z-index: -1;
          top: -80px;
          right: 12%;
          width: 260px;
          height: 260px;
          border: 1px solid rgba(255,38,56,.16);
          border-radius: 50%;
          box-shadow: 0 0 0 28px rgba(255,38,56,.025),0 0 0 56px rgba(255,38,56,.02);
          content: "";
        }

        .prediction-system .race-control-hero::after {
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: var(--arcade-red);
          box-shadow: 0 0 24px rgba(255,38,56,.45);
          content: "";
        }

        .prediction-system .race-control-kicker {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          color: #ff7180;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .17em;
          text-transform: uppercase;
        }

        .prediction-system .race-control-light {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--arcade-red);
          box-shadow: 0 0 12px rgba(255,38,56,.8);
          animation: raceLightPulse 1.8s ease-in-out infinite;
        }

        .prediction-system .race-control-hero h2 {
          margin: 13px 0 8px;
          color: white;
          font-size: clamp(27px,5vw,48px);
          font-weight: 1000;
          line-height: 1;
          letter-spacing: -.055em;
          overflow-wrap: anywhere;
        }

        .prediction-system .race-control-hero p {
          margin: 0;
          color: #a4a9b4;
          font-size: 12px;
          line-height: 1.65;
        }

        .prediction-system .race-control-round {
          min-width: 110px;
          padding: 13px 17px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 12px;
          background: rgba(0,0,0,.28);
          text-align: center;
        }

        .prediction-system .race-control-round small {
          display: block;
          color: #8e95a2;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .prediction-system .race-control-round strong {
          display: block;
          margin-top: 4px;
          color: white;
          font-size: 38px;
          font-weight: 1000;
          line-height: 1;
          letter-spacing: -.07em;
        }

        .prediction-system .race-control-round span {
          display: block;
          margin-top: 7px;
          color: #ff6374;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .prediction-system .race-control-metrics {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 10px;
          margin-bottom: 22px;
        }

        .prediction-system .race-metric {
          min-width: 0;
          padding: 14px 16px;
          border: 1px solid var(--arcade-line);
          border-radius: 12px;
          background: linear-gradient(145deg,#15171e,#0d0e12);
        }

        .prediction-system .race-metric span {
          display: block;
          color: #969ca8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .11em;
        }

        .prediction-system .race-metric strong {
          display: block;
          margin-top: 7px;
          color: white;
          font-size: clamp(18px,2.6vw,26px);
          font-weight: 1000;
          letter-spacing: -.04em;
        }

        .prediction-system .race-metric strong em {
          color: var(--arcade-red);
          font-size: 10px;
          font-style: normal;
          letter-spacing: 0;
        }

        .prediction-system .prediction-lock {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          padding: 16px 18px;
          border: 1px solid rgba(255,38,56,.45);
          border-radius: 12px;
          background: rgba(255,38,56,.08);
        }

        .prediction-system .lock-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 10px;
          background: rgba(255,38,56,.14);
          color: var(--arcade-red);
          font-size: 20px;
        }

        .prediction-system .prediction-lock b {
          display: block;
          color: #ff7c8c;
          font-size: 11px;
          letter-spacing: .13em;
        }

        .prediction-system .prediction-lock span {
          display: block;
          margin-top: 4px;
          color: var(--arcade-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .prediction-system .prediction-wizard {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          margin: 0 0 22px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          background:
            linear-gradient(105deg,rgba(255,38,56,.08),transparent 45%),
            linear-gradient(135deg,#17191f,#0c0d11 75%);
          box-shadow: 0 12px 35px rgba(0,0,0,.16);
        }

        .prediction-system .prediction-wizard::after {
          position: absolute;
          top: 0;
          right: 0;
          width: 110px;
          height: 3px;
          content: "";
          background: var(--arcade-red);
          box-shadow: 0 0 20px var(--arcade-red);
        }

        .prediction-system .prediction-wizard-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          color: var(--arcade-muted);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .13em;
        }

        .prediction-system .prediction-wizard-top span:first-child {
          color: #ff596b;
        }

        .prediction-system .prediction-wizard-progress {
          height: 4px;
          margin-bottom: 16px;
          overflow: hidden;
          border-radius: 20px;
          background: #30323a;
        }

        .prediction-system .prediction-wizard-progress > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#c70c21,var(--arcade-red),#ff8490);
          box-shadow: 0 0 14px rgba(255,38,56,.55);
          transition: width .25s ease;
        }

        .prediction-system .prediction-wizard-steps {
          display: grid;
          grid-template-columns: repeat(var(--step-count),minmax(0,1fr));
          gap: 8px;
        }

        .prediction-system .prediction-wizard-step {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 10px;
          padding: 11px;
          border: 1px solid transparent;
          border-radius: 10px;
          color: var(--arcade-muted);
          background: rgba(255,255,255,.018);
          text-align: left;
          cursor: pointer;
          transition: border-color .2s,background .2s,color .2s;
        }

        .prediction-system .prediction-wizard-step:hover {
          border-color: var(--arcade-line);
          background: rgba(255,255,255,.04);
        }

        .prediction-system .prediction-wizard-step.active {
          border-color: rgba(255,38,56,.55);
          color: white;
          background: rgba(255,38,56,.09);
          box-shadow: inset 0 0 18px rgba(255,38,56,.035);
        }

        .prediction-system .prediction-step-number {
          display: grid;
          place-items: center;
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          border: 1px solid #3a3d47;
          border-radius: 8px;
          color: #b8bdc7;
          background: #202229;
          font-size: 11px;
          font-weight: 1000;
        }

        .prediction-system .prediction-wizard-step.active .prediction-step-number {
          border-color: var(--arcade-red);
          color: white;
          background: var(--arcade-red);
          box-shadow: 0 0 16px rgba(255,38,56,.22);
        }

        .prediction-system .prediction-wizard-step strong {
          display: block;
          overflow: hidden;
          color: inherit;
          font-size: 11px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .prediction-system .prediction-wizard-step small {
          display: block;
          margin-top: 4px;
          color: #858b97;
          font-size: 9px;
        }

        .prediction-system .podium-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 12px;
        }

        .prediction-system .podium-card {
          position: relative;
          min-width: 0;
          min-height: 230px;
          overflow: hidden;
          padding: 18px;
          border: 1px solid var(--arcade-line);
          border-radius: 14px;
          color: var(--arcade-text);
          background:
            radial-gradient(ellipse at 100% 0,rgba(255,255,255,.055),transparent 55%),
            linear-gradient(150deg,#1b1d24,#101116);
          text-align: left;
          cursor: pointer;
          transition: transform .2s,border-color .2s,box-shadow .2s;
        }

        .prediction-system .podium-card::before {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 3px;
          content: "";
          background: #343640;
        }

        .prediction-system .podium-card::after {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 2px;
          content: "";
          background: #343640;
        }

        .prediction-system .podium-card:hover:not(:disabled) {
          transform: translateY(-3px);
          border-color: rgba(255,38,56,.55);
        }

        .prediction-system .podium-card.active {
          border-color: rgba(255,38,56,.8);
          background:
            radial-gradient(ellipse at 50% 0,rgba(255,38,56,.14),transparent 70%),
            linear-gradient(150deg,#21161c,#101116);
          box-shadow: 0 0 0 1px rgba(255,38,56,.1),0 0 26px rgba(255,38,56,.07);
        }

        .prediction-system .podium-card.active::before,
        .prediction-system .podium-card.active::after {
          background: linear-gradient(90deg,transparent,var(--arcade-red),transparent);
          box-shadow: 0 0 12px var(--arcade-red);
        }

        .prediction-system .podium-card:disabled {
          cursor: not-allowed;
          opacity: .78;
        }

        .prediction-system .podium-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .prediction-system .podium-position {
          color: white;
          font-size: 42px;
          font-weight: 1000;
          line-height: .95;
          letter-spacing: -.07em;
        }

        .prediction-system .podium-points {
          margin-top: 8px;
          color: #ff6878;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .1em;
        }

        .prediction-system .podium-badge {
          padding: 6px 8px;
          border: 1px solid rgba(255,38,56,.35);
          border-radius: 5px;
          color: #ff6878;
          background: rgba(255,38,56,.07);
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .06em;
        }

        .prediction-system .podium-driver {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          margin-top: 27px;
        }

        .prediction-system .podium-driver img,
        .prediction-system .podium-avatar {
          width: 66px;
          height: 66px;
          flex: 0 0 66px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 11px;
          object-fit: cover;
          object-position: center top;
          background: #252730;
        }

        .prediction-system .podium-avatar {
          display: grid;
          place-items: center;
          color: var(--arcade-red);
          font-size: 14px;
          font-weight: 1000;
        }

        .prediction-system .team-bar {
          width: 4px;
          height: 43px;
          flex: 0 0 4px;
          border-radius: 10px;
          box-shadow: 0 0 10px currentColor;
        }

        .prediction-system .driver-title {
          overflow-wrap: anywhere;
          color: white;
          font-size: 13px;
          font-weight: 1000;
          line-height: 1.25;
        }

        .prediction-system .driver-team {
          margin-top: 5px;
          color: var(--arcade-muted);
          font-size: 10px;
          line-height: 1.4;
        }

        .prediction-system .empty-podium {
          display: grid;
          min-height: 105px;
          place-items: center;
          color: #9298a4;
          font-size: 11px;
          text-align: center;
        }

        .prediction-system .empty-podium::before {
          display: block;
          margin-bottom: 7px;
          color: var(--arcade-red);
          content: "+";
          font-size: 26px;
          font-weight: 300;
        }

        .prediction-system .prediction-section {
          margin-top: 28px;
          padding-top: 25px;
          border-top: 1px solid var(--arcade-line);
        }

        .prediction-system .prediction-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .prediction-system .prediction-heading small {
          color: #ff6575;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .17em;
        }

        .prediction-system .prediction-heading h3 {
          margin: 6px 0 0;
          color: white;
          font-size: clamp(21px,3vw,27px);
          font-weight: 1000;
          letter-spacing: -.04em;
        }

        .prediction-system .prediction-progress {
          color: var(--arcade-muted);
          font-size: 10px;
          font-weight: 900;
          text-align: right;
        }

        .prediction-system .driver-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 9px;
        }

        .prediction-system .driver-button {
          display: flex;
          align-items: center;
          min-width: 0;
          min-height: 76px;
          gap: 11px;
          padding: 11px;
          border: 1px solid var(--arcade-line);
          border-radius: 11px;
          color: var(--arcade-text);
          background: linear-gradient(135deg,#191b22,#101116);
          text-align: left;
          cursor: pointer;
          transition: border-color .18s,background .18s,transform .18s;
        }

        .prediction-system .driver-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(255,38,56,.6);
          background: #21181d;
        }

        .prediction-system .driver-button.selected {
          border-color: rgba(255,38,56,.75);
          background: rgba(255,38,56,.075);
          box-shadow: inset 0 0 18px rgba(255,38,56,.035);
        }

        .prediction-system .driver-button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .prediction-system .driver-button img,
        .prediction-system .driver-small-avatar {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          object-fit: cover;
          object-position: center top;
          background: #252730;
        }

        .prediction-system .driver-small-avatar {
          display: grid;
          place-items: center;
          color: #ff6878;
          font-size: 10px;
          font-weight: 1000;
        }

        .prediction-system .driver-button-name {
          overflow: hidden;
          color: white;
          font-size: 11px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .prediction-system .driver-button-team {
          overflow: hidden;
          margin-top: 4px;
          color: var(--arcade-muted);
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .prediction-system .community-mini {
          display: grid;
          gap: 6px;
          margin-top: 10px;
        }

        .prediction-system .community-mini-label {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: #a8adb7;
          font-size: 9px;
        }

        .prediction-system .community-mini-label b {
          color: #ff6878;
        }

        .prediction-system .community-track {
          height: 4px;
          overflow: hidden;
          border-radius: 20px;
          background: #343640;
        }

        .prediction-system .community-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#c70c21,var(--arcade-red),#ff8995);
          box-shadow: 0 0 10px rgba(255,38,56,.4);
        }

        .prediction-system .community-footnote {
          margin: 16px 0 0;
          padding: 13px 15px;
          border: 1px solid var(--arcade-line);
          border-radius: 10px;
          color: var(--arcade-muted);
          background: rgba(12,13,18,.8);
          font-size: 11px;
          line-height: 1.6;
        }

        .prediction-system .bulletin-grid,
        .prediction-system .special-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 12px;
        }

        .prediction-system .bulletin-card {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 185px;
          padding: 17px;
          border: 1px solid var(--arcade-line);
          border-radius: 12px;
          background:
            linear-gradient(120deg,rgba(255,38,56,.035),transparent 60%),
            #121319;
        }

        .prediction-system .bulletin-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .prediction-system .bulletin-icon {
          font-size: 23px;
        }

        .prediction-system .bulletin-point {
          color: #ff6878;
          font-size: 10px;
          font-weight: 1000;
        }

        .prediction-system .bulletin-group {
          margin-top: 11px;
          color: #a2a7b1;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .prediction-system .bulletin-card h4 {
          margin: 7px 0;
          color: white;
          font-size: 14px;
          font-weight: 900;
          line-height: 1.4;
        }

        .prediction-system .bulletin-card p {
          margin: 0 0 12px;
          color: var(--arcade-muted);
          font-size: 11px;
          line-height: 1.55;
        }

        .prediction-system .yes-no {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
        }

        .prediction-system .yes-no button {
          min-height: 38px;
          border: 1px solid #383a44;
          border-radius: 8px;
          color: #a4a9b4;
          background: #1b1d24;
          font-size: 10px;
          font-weight: 1000;
          cursor: pointer;
          transition: .18s;
        }

        .prediction-system .yes-no button.yes-active {
          border-color: rgba(81,240,168,.6);
          color: var(--arcade-green);
          background: rgba(81,240,168,.08);
          box-shadow: inset 0 0 12px rgba(81,240,168,.04);
        }

        .prediction-system .yes-no button.no-active {
          border-color: rgba(255,38,56,.65);
          color: #ff8190;
          background: rgba(255,38,56,.08);
        }

        .prediction-system .yes-no button:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        .prediction-system .community-yesno {
          display: grid;
          gap: 7px;
          margin-top: 11px;
        }

        .prediction-system .community-duo {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: #a9adb7;
          font-size: 9px;
        }

        .prediction-system .community-duo b {
          color: white;
        }

        .prediction-system .special-card {
          min-width: 0;
          padding: 18px;
          border: 1px solid var(--arcade-line);
          border-radius: 12px;
          background: linear-gradient(145deg,#191b22,#101116);
        }

        .prediction-system .special-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .prediction-system .special-head strong {
          color: white;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.5;
        }

        .prediction-system .special-points {
          flex: 0 0 auto;
          color: #ff6878;
          font-size: 10px;
          font-weight: 1000;
        }

        .prediction-system .special-card select {
          width: 100%;
          min-height: 45px;
          margin-top: 17px;
          padding: 0 12px;
          border: 1px solid #3a3d47;
          border-radius: 8px;
          color: white;
          background: #0b0c10;
          outline: none;
        }

        .prediction-system .special-card select option {
          color: white;
          background: #101116;
        }

        .prediction-system .prediction-review {
          padding: clamp(18px,4vw,28px);
          border: 1px solid rgba(255,38,56,.3);
          border-radius: 15px;
          background:
            radial-gradient(ellipse at 100% 0,rgba(255,38,56,.08),transparent 60%),
            linear-gradient(145deg,#191a21,#0d0e12);
        }

        .prediction-system .eyebrow {
          color: #ff6878;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .17em;
        }

        .prediction-system .prediction-review h3 {
          margin: 9px 0;
          color: white;
          font-size: clamp(24px,4vw,32px);
          font-weight: 1000;
          letter-spacing: -.05em;
        }

        .prediction-system .prediction-review > p {
          color: var(--arcade-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .prediction-system .prediction-review-picks {
          display: grid;
          gap: 8px;
          margin: 22px 0;
        }

        .prediction-system .prediction-review-picks > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 15px;
          border: 1px solid var(--arcade-line);
          border-radius: 9px;
          background: rgba(5,6,9,.5);
        }

        .prediction-system .prediction-review-picks span {
          flex: 0 0 auto;
          color: #ff6878;
          font-size: 10px;
          font-weight: 1000;
        }

        .prediction-system .prediction-review-picks strong {
          color: white;
          font-size: 12px;
          text-align: right;
        }

        .prediction-system .save-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 24px;
          padding: 17px;
          border: 1px solid rgba(255,38,56,.3);
          border-radius: 11px;
          background: rgba(255,38,56,.055);
        }

        .prediction-system .save-summary strong {
          display: block;
          color: white;
          font-size: 14px;
          font-weight: 1000;
        }

        .prediction-system .save-summary span {
          display: block;
          margin-top: 6px;
          color: var(--arcade-muted);
          font-size: 10px;
          line-height: 1.6;
        }

        .prediction-system .save-button {
          min-width: 205px;
          min-height: 48px;
          padding: 0 18px;
          border: 1px solid rgba(255,38,56,.8);
          border-radius: 8px;
          color: white;
          background: linear-gradient(110deg,#c70c21,#ff2638);
          box-shadow: 0 6px 20px rgba(255,38,56,.15);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .06em;
          cursor: pointer;
          transition: transform .18s,box-shadow .18s;
        }

        .prediction-system .save-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 9px 25px rgba(255,38,56,.25);
        }

        .prediction-system .save-button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .prediction-system .prediction-wizard-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 22px;
        }

        .prediction-system .prediction-wizard-controls button {
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid #3a3d47;
          border-radius: 8px;
          color: #d1d3da;
          background: #191b22;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .05em;
          cursor: pointer;
          transition: .18s;
        }

        .prediction-system .prediction-wizard-controls button:hover:not(:disabled) {
          border-color: var(--arcade-red);
          color: white;
        }

        .prediction-system .prediction-wizard-controls button.next {
          border-color: var(--arcade-red);
          color: white;
          background: var(--arcade-red);
          box-shadow: 0 5px 18px rgba(255,38,56,.12);
        }

        .prediction-system .prediction-wizard-controls button:disabled {
          cursor: not-allowed;
          opacity: .35;
        }

        .prediction-system .prediction-message {
          margin-top: 13px;
          padding: 13px 15px;
          border: 1px solid rgba(255,38,56,.25);
          border-radius: 9px;
          color: #e0e1e7;
          background: rgba(255,38,56,.045);
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        @keyframes raceLightPulse {
          0%,100% { opacity: 1; box-shadow: 0 0 12px rgba(255,38,56,.8); }
          50% { opacity: .45; box-shadow: 0 0 4px rgba(255,38,56,.35); }
        }

        @media (max-width: 900px) {
          .prediction-system .podium-card {
            min-height: 200px;
            padding: 13px;
          }

          .prediction-system .podium-position {
            font-size: 35px;
          }

          .prediction-system .podium-driver {
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 21px;
          }

          .prediction-system .podium-driver img,
          .prediction-system .podium-avatar {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .prediction-system .driver-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .prediction-system .prediction-wizard-step {
            gap: 7px;
            padding: 9px 7px;
          }

          .prediction-system .prediction-wizard-step strong {
            font-size: 10px;
          }
        }

        @media (max-width: 620px) {
          .prediction-system .race-control-hero {
            grid-template-columns: minmax(0,1fr) auto;
            gap: 12px;
            padding: 22px 17px;
          }

          .prediction-system .race-control-round {
            min-width: 74px;
            padding: 10px;
          }

          .prediction-system .race-control-round strong {
            font-size: 30px;
          }

          .prediction-system .race-control-metrics {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 8px;
          }

          .prediction-system .race-metric {
            padding: 12px;
          }

          .prediction-system .prediction-wizard {
            padding: 14px;
            border-radius: 12px;
          }

          .prediction-system .prediction-wizard-top {
            font-size: 9px;
          }

          .prediction-system .prediction-wizard-steps {
            gap: 5px;
          }

          .prediction-system .prediction-wizard-step {
            flex-direction: column;
            justify-content: center;
            gap: 6px;
            padding: 8px 3px;
            text-align: center;
          }

          .prediction-system .prediction-wizard-step strong {
            font-size: 9px;
          }

          .prediction-system .prediction-wizard-step small {
            display: none;
          }

          .prediction-system .prediction-step-number {
            width: 25px;
            height: 25px;
            flex-basis: 25px;
            border-radius: 7px;
          }

          .prediction-system .podium-grid {
            gap: 7px;
          }

          .prediction-system .podium-card {
            min-height: 160px;
            padding: 9px;
            border-radius: 10px;
          }

          .prediction-system .podium-position {
            font-size: 28px;
          }

          .prediction-system .podium-points {
            font-size: 8px;
            letter-spacing: 0;
          }

          .prediction-system .podium-badge {
            padding: 4px;
            font-size: 7px;
          }

          .prediction-system .podium-driver {
            gap: 5px;
            margin-top: 18px;
          }

          .prediction-system .podium-driver img,
          .prediction-system .podium-avatar,
          .prediction-system .team-bar {
            display: none;
          }

          .prediction-system .driver-title {
            font-size: 10px;
          }

          .prediction-system .driver-team {
            font-size: 8px;
          }

          .prediction-system .bulletin-grid,
          .prediction-system .special-grid {
            grid-template-columns: 1fr;
          }

          .prediction-system .prediction-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .prediction-system .prediction-progress {
            text-align: left;
          }

          .prediction-system .save-summary {
            align-items: stretch;
            flex-direction: column;
            gap: 14px;
          }

          .prediction-system .save-button {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 390px) {
          .prediction-system .race-control-hero {
            grid-template-columns: 1fr;
          }

          .prediction-system .race-control-round {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            text-align: left;
          }

          .prediction-system .race-control-round strong {
            margin: 0;
            font-size: 26px;
          }

          .prediction-system .race-control-round span {
            margin: 0;
          }

          .prediction-system .driver-grid {
            grid-template-columns: 1fr;
          }

          .prediction-system .prediction-review-picks > div {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .prediction-system .prediction-review-picks strong {
            text-align: left;
          }

          .prediction-system .prediction-wizard-controls button {
            padding: 0 12px;
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .prediction-system *,
          .prediction-system *::before,
          .prediction-system *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {locked && (
        <div className="prediction-lock" role="status">
          <div className="lock-icon" aria-hidden="true">⌑</div>
          <div>
            <b>TAHMİNLER KİLİTLENDİ</b>
            <span>Seans başladı. Kayıtlı tahminler artık değiştirilemez.</span>
          </div>
        </div>
      )}

      <section className="race-control-hero">
        <div>
          <div className="race-control-kicker">
            <span className="race-control-light" />
            F1 SOCIAL / RACE CONTROL
            <span>·</span>
            {isRace ? "GRAND PRIX" : "SPRINT"}
          </div>
          <h2>{raceName || "Yarış tahmini"}</h2>
          <p>
            {season} SEZONU · TAHMİN MERKEZİ ·
            {" "}{locked ? "TAHMİN SÜRESİ DOLDU" : "SEÇİMLERİNİ HAZIRLA"}
          </p>
        </div>

        <div className="race-control-round">
          <small>ROUND</small>
          <strong>{String(round).padStart(2, "0")}</strong>
          <span>{locked ? "LOCKED" : "PREDICT"}</span>
        </div>
      </section>

      <div className="race-control-metrics">
        <div className="race-metric">
          <span>PODYUM SEÇİMİ</span>
          <strong>{[selected.P1, selected.P2, selected.P3].filter(Boolean).length}<em> / 3</em></strong>
        </div>
        <div className="race-metric">
          <span>SENARYOLAR</span>
          <strong>{isRace ? answeredCount : "—"}<em>{isRace ? " / 12" : " SPRINT"}</em></strong>
        </div>
        <div className="race-metric">
          <span>ÖZEL TAHMİNLER</span>
          <strong>{isRace ? specialCount : "—"}<em>{isRace ? " / 4" : " SPRINT"}</em></strong>
        </div>
        <div className="race-metric">
          <span>MAKSİMUM PUAN</span>
          <strong>{isRace ? RACE_MAX_POINTS : PODIUM_MAX_POINTS}<em> PTS</em></strong>
        </div>
      </div>

      <div className="prediction-wizard">
        <div className="prediction-wizard-top">
          <span>F1 SOCIAL / TAHMİN KONTROLÜ · {isRace ? "GRAND PRIX" : "SPRINT"}</span>
          <span>ADIM {currentStageIndex + 1} / {stages.length}</span>
        </div>

        <div className="prediction-wizard-progress">
          <span
            style={{
              width: `${((currentStageIndex + 1) / stages.length) * 100}%`,
            }}
          />
        </div>

        <div
          className="prediction-wizard-steps"
          style={{ "--step-count": stages.length } as CSSProperties}
        >
          {stages.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              className={`prediction-wizard-step ${
                stage.id === currentStage ? "active" : ""
              }`}
              onClick={() => navigateStage(stage.id)}
            >
              <span className="prediction-step-number">{index + 1}</span>
              <span>
                <strong>{stage.title}</strong>
                <small>{stage.subtitle}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      {currentStage === "podium" && (
        <>
          <div className="podium-grid">
            {PODIUM_SLOTS.map((slot) => {
              const driver = getDriver(selected[slot.key]);
              const active = activeSlot === slot.key && !locked;
              const share = driver
                ? communityPodium(slot.key, driver.driver_number)
                : null;

              return (
                <button
                  key={slot.key}
                  type="button"
                  className={`podium-card ${active ? "active" : ""}`}
                  disabled={locked}
                  onClick={() => setActiveSlot(slot.key)}
                >
                  <div className="podium-top">
                    <div>
                      <div className="podium-position">{slot.key}</div>
                      <div className="podium-points">{slot.points} PUAN</div>
                    </div>

                    <span className="podium-badge">
                      {active ? "SEÇİM AKTİF" : slot.label}
                    </span>
                  </div>

                  {driver ? (
                    <div className="podium-driver">
                      {driver.headshot_url ? (
                        <img src={driver.headshot_url} alt={driverName(driver)} />
                      ) : (
                        <div className="podium-avatar">
                          {driver.name_acronym || "F1"}
                        </div>
                      )}

                      <span
                        className="team-bar"
                        style={
                          {
                            background: teamColor(driver),
                            color: teamColor(driver),
                          } as CSSProperties
                        }
                      />

                      <div style={{ minWidth: 0 }}>
                        <div className="driver-title">{driverName(driver)}</div>
                        <div className="driver-team">{driver.team_name || "Formula 1"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-podium">Pilot seçmek için aşağıya dokun</div>
                  )}

                  {share !== null && (
                    <div className="community-mini">
                      <div className="community-mini-label">
                        <span>Topluluk tercihi</span>
                        <b>%{share}</b>
                      </div>
                      <div className="community-track">
                        <i style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <section className="prediction-section">
            <div className="prediction-heading">
              <div>
                <small>PİLOT SEÇİMİ / DRIVER PICK</small>
                <h3>{activeSlot} için pilot seç</h3>
              </div>
              <div className="prediction-progress">
                PODIUM · {PODIUM_MAX_POINTS} PUAN
              </div>
            </div>

            <div className="driver-grid">
              {drivers.map((driver) => {
                const chosen =
                  selected.P1 === driver.driver_number ||
                  selected.P2 === driver.driver_number ||
                  selected.P3 === driver.driver_number;

                const share = communityPodium(activeSlot, driver.driver_number);

                return (
                  <button
                    key={driver.driver_number}
                    type="button"
                    className={`driver-button ${chosen ? "selected" : ""}`}
                    disabled={locked}
                    onClick={() => selectDriver(driver.driver_number)}
                  >
                    {driver.headshot_url ? (
                      <img src={driver.headshot_url} alt="" />
                    ) : (
                      <div className="driver-small-avatar">
                        {driver.name_acronym || "F1"}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="driver-button-name">{driverName(driver)}</div>
                      <div className="driver-button-team">
                        {driver.team_name || "Formula 1"}
                      </div>

                      {share !== null && (
                        <div className="community-mini-label" style={{ marginTop: 7 }}>
                          <span>{activeSlot} topluluk oranı</span>
                          <b>%{share}</b>
                        </div>
                      )}
                    </div>

                    {chosen && (
                      <span
                        aria-label="Bu pilot seçilmiş"
                        style={{ color: "var(--arcade-red)", fontWeight: 1000 }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="community-footnote">
            {community?.ready
              ? `Topluluk tercihleri ${community.total} kayıtlı tahmin üzerinden hesaplanıyor.`
              : "Topluluk oranları, yeterli sayıda tahmin kaydedildikten sonra görünür."}
          </div>
        </>
      )}

      {isRace && currentStage === "bulletin" && (
        <section className="prediction-section">
          <div className="prediction-heading">
            <div>
              <small>RACE BULLETIN / YARIŞ SENARYOSU</small>
              <h3>Yarış senaryoları</h3>
            </div>
            <div className="prediction-progress">
              {answeredCount}/12 · MAKS. {BULLETIN_MAX_POINTS} PUAN
            </div>
          </div>

          <div className="bulletin-grid">
            {RACE_BULLETIN_QUESTIONS.map((question) => {
              const value = bulletin[question.key];
              const stat = community?.bulletin[question.key];
              const showCommunity = Boolean(
                community?.ready && stat && stat.total >= 10
              );

              return (
                <article className="bulletin-card" key={question.key}>
                  <div className="bulletin-card-top">
                    <span className="bulletin-icon">{question.icon}</span>
                    <span className="bulletin-point">+{question.points} P</span>
                  </div>

                  <div className="bulletin-group">{question.group}</div>
                  <h4>{question.label}</h4>
                  <p>{question.hint}</p>

                  <div className="yes-no">
                    <button
                      type="button"
                      disabled={locked}
                      className={value === "yes" ? "yes-active" : ""}
                      onClick={() => answerQuestion(question.key, "yes")}
                    >
                      EVET
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      className={value === "no" ? "no-active" : ""}
                      onClick={() => answerQuestion(question.key, "no")}
                    >
                      HAYIR
                    </button>
                  </div>

                  {showCommunity && stat && (
                    <div className="community-yesno">
                      <div className="community-duo">
                        <span>
                          EVET <b>%{pct(stat.yes, stat.total)}</b>
                        </span>
                        <span>
                          HAYIR <b>%{pct(stat.no, stat.total)}</b>
                        </span>
                      </div>
                      <div className="community-track">
                        <i style={{ width: `${pct(stat.yes, stat.total)}%` }} />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {isRace && currentStage === "special" && (
        <section className="prediction-section">
          <div className="prediction-heading">
            <div>
              <small>SPECIAL PICKS / EKSTRA PUAN</small>
              <h3>Özel tahminler</h3>
            </div>
            <div className="prediction-progress">
              {specialCount}/4 · MAKS. {SPECIAL_MAX_POINTS} PUAN
            </div>
          </div>

          <div className="special-grid">
            <div className="special-card">
              <div className="special-head">
                <strong>⚡ En hızlı turu kim atar?</strong>
                <span className="special-points">+20 P</span>
              </div>
              <select
                disabled={locked}
                value={specialPicks.fastestLap ?? ""}
                onChange={(event) =>
                  setSpecialPicks((current) => ({
                    ...current,
                    fastestLap: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              >
                <option value="">Pilot seç</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_number} value={driver.driver_number}>
                    {driver.name_acronym || driverName(driver)} · {driverName(driver)}
                  </option>
                ))}
              </select>
            </div>

            <div className="special-card">
              <div className="special-head">
                <strong>💥 İlk DNF kim olur?</strong>
                <span className="special-points">+25 P</span>
              </div>
              <select
                disabled={locked}
                value={specialPicks.firstDnf ?? ""}
                onChange={(event) => {
                  const value = event.target.value;

                  setSpecialPicks((current) => ({
                    ...current,
                    firstDnf:
                      value === "NONE"
                        ? "NONE"
                        : value
                          ? Number(value)
                          : null,
                  }));
                }}
              >
                <option value="">Pilot seç</option>
                <option value="NONE">DNF olmayacak</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_number} value={driver.driver_number}>
                    {driver.name_acronym || driverName(driver)} · {driverName(driver)}
                  </option>
                ))}
              </select>
            </div>

            <div className="special-card">
              <div className="special-head">
                <strong>📈 En çok sıra kazanan pilot</strong>
                <span className="special-points">+20 P</span>
              </div>
              <select
                disabled={locked}
                value={specialPicks.mostGained ?? ""}
                onChange={(event) =>
                  setSpecialPicks((current) => ({
                    ...current,
                    mostGained: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              >
                <option value="">Pilot seç</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_number} value={driver.driver_number}>
                    {driver.name_acronym || driverName(driver)} · {driverName(driver)}
                  </option>
                ))}
              </select>
            </div>

            <div className="special-card">
              <div className="special-head">
                <strong>🏆 Kazanan takım</strong>
                <span className="special-points">+15 P</span>
              </div>
              <select
                disabled={locked}
                value={specialPicks.winningTeam ?? ""}
                onChange={(event) =>
                  setSpecialPicks((current) => ({
                    ...current,
                    winningTeam: event.target.value || null,
                  }))
                }
              >
                <option value="">Takım seç</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {community?.ready && (
            <div className="community-footnote">
              <b style={{ color: "white" }}>Topluluğun favorileri</b>
              {RACE_SPECIAL_PICKS.map((pick) => {
                const stat = community.specials[pick.key];
                if (!stat || stat.total < 10) return null;

                const top = Object.entries(stat.choices).sort(
                  (a, b) => b[1] - a[1]
                )[0];

                if (!top) return null;

                const driver = getDriver(Number(top[0]));
                const label =
                  pick.key === "winningTeam"
                    ? top[0]
                    : top[0] === "NONE"
                      ? "DNF yok"
                      : driver
                        ? driverName(driver)
                        : `#${top[0]}`;

                return (
                  <div key={pick.key} style={{ marginTop: 8 }}>
                    {pick.label}: <strong style={{ color: "white" }}>{label}</strong>
                    {" "}({top[1]}/{stat.total})
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {currentStage === "review" && (
        <div className="prediction-review">
          <div className="eyebrow">SON KONTROL / TAHMİN ÖZETİ</div>
          <h3>Her şey hazır mı?</h3>
          <p>Seçimlerini kontrol et, ardından tahmin paketini hesabına kaydet.</p>

          <div className="prediction-review-picks">
            {PODIUM_SLOTS.map(({ key }) => {
              const driver = getDriver(selected[key]);

              return (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{driver ? driverName(driver) : "Henüz seçilmedi"}</strong>
                </div>
              );
            })}

            {isRace && (
              <div>
                <span>EK SEÇİMLER</span>
                <strong>{answeredCount}/12 senaryo · {specialCount}/4 özel seçim</strong>
              </div>
            )}
          </div>

          <div className="save-summary">
            <div>
              <strong>
                {isRace
                  ? `Maksimum ${RACE_MAX_POINTS} puan`
                  : `${PODIUM_MAX_POINTS} puanlık sprint tahmini`}
              </strong>
              <span>
                {isRace
                  ? `${PODIUM_MAX_POINTS} podyum + ${BULLETIN_MAX_POINTS} senaryo + ${SPECIAL_MAX_POINTS} özel seçim`
                  : "P1, P2 ve P3 tahminlerini tek pakette kaydet."}
              </span>
            </div>

            <button
              type="button"
              className="save-button"
              disabled={saving || locked}
              onClick={savePrediction}
            >
              {saving
                ? "KAYDEDİLİYOR..."
                : locked
                  ? "TAHMİNLER KİLİTLİ"
                  : "TAHMİN PAKETİNİ KAYDET →"}
            </button>
          </div>
        </div>
      )}

      <div className="prediction-wizard-controls">
        <button
          type="button"
          disabled={currentStageIndex === 0}
          onClick={() => navigateStage(stages[currentStageIndex - 1].id)}
        >
          ← GERİ
        </button>

        {currentStageIndex < stages.length - 1 && (
          <button
            type="button"
            className="next"
            onClick={() => navigateStage(stages[currentStageIndex + 1].id)}
          >
            DEVAM ET →
          </button>
        )}
      </div>

      {message && (
        <div className="prediction-message" role="status" aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );
}