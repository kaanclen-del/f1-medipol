"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  OpenF1Driver,
} from "@/lib/openf1";

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

import {
  createClient,
} from "@/utils/supabase/client";

type PodiumSlot =
  | "P1"
  | "P2"
  | "P3";

type SelectedPrediction = {
  P1:
    | number
    | null;

  P2:
    | number
    | null;

  P3:
    | number
    | null;
};

type Props = {
  drivers:
    OpenF1Driver[];

  season:
    number;

  round:
    number;

  raceName:
    string;

  predictionType?:
    | "race"
    | "sprint";

  initialPrediction?:
    SelectedPrediction |
    null;

  initialBulletin?:
    RaceBulletinAnswers;

  initialSpecialPicks?:
    RaceSpecialPicks;

  lockAt?:
    string |
    null;
};

function driverName(
  driver:
    OpenF1Driver
) {
  return (
    driver.full_name ||
    driver.broadcast_name ||
    driver.name_acronym ||
    `#${driver.driver_number}`
  );
}

export default function PredictionSelector({
  drivers,

  season,
  round,
  raceName,

  predictionType =
    "race",

  initialPrediction =
    null,

  initialBulletin =
    {},

  initialSpecialPicks =
    {},

  lockAt =
    null,
}: Props) {
  const [
    supabase,
  ] =
    useState(
      () =>
        createClient()
    );

  const [
    activeSlot,
    setActiveSlot,
  ] =
    useState<PodiumSlot>(
      "P1"
    );

  const [
    selected,
    setSelected,
  ] =
    useState<SelectedPrediction>(
      initialPrediction ??
        {
          P1: null,
          P2: null,
          P3: null,
        }
    );

  const [
    bulletin,
    setBulletin,
  ] =
    useState<RaceBulletinAnswers>(
      initialBulletin
    );

  const [
    specialPicks,
    setSpecialPicks,
  ] =
    useState<RaceSpecialPicks>(
      initialSpecialPicks
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      initialPrediction
        ? "✅ Kayıtlı tahminin yüklendi."
        : ""
    );

  const [
    locked,
    setLocked,
  ] =
    useState(false);

  const isRace =
    predictionType ===
    "race";

  useEffect(() => {
    function checkLock() {
      if (!lockAt) {
        setLocked(false);
        return;
      }

      const time =
        new Date(
          lockAt
        ).getTime();

      if (
        Number.isNaN(
          time
        )
      ) {
        setLocked(false);
        return;
      }

      setLocked(
        Date.now() >=
          time
      );
    }

    checkLock();

    const timer =
      window.setInterval(
        checkLock,
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [lockAt]);

  const teams =
    useMemo(
      () =>
        Array.from(
          new Set(
            drivers
              .map(
                (
                  driver
                ) =>
                  driver.team_name
                    ?.trim()
              )
              .filter(
                (
                  item
                ): item is string =>
                  Boolean(
                    item
                  )
              )
          )
        ).sort(),
      [drivers]
    );

  function getDriver(
    number:
      | number
      | null
  ) {
    if (!number) {
      return null;
    }

    return (
      drivers.find(
        (
          driver
        ) =>
          driver.driver_number ===
          number
      ) ??
      null
    );
  }

  function selectDriver(
    driverNumber:
      number
  ) {
    if (locked) {
      return;
    }

    const next = {
      ...selected,
    };

    (
      Object.keys(
        next
      ) as PodiumSlot[]
    ).forEach(
      (
        slot
      ) => {
        if (
          slot !==
            activeSlot &&
          next[slot] ===
            driverNumber
        ) {
          next[slot] =
            null;
        }
      }
    );

    next[
      activeSlot
    ] =
      driverNumber;

    setSelected(
      next
    );

    setMessage(
      ""
    );

    if (
      activeSlot ===
      "P1"
    ) {
      setActiveSlot(
        "P2"
      );
    } else if (
      activeSlot ===
      "P2"
    ) {
      setActiveSlot(
        "P3"
      );
    }
  }

  function answerQuestion(
    key:
      keyof RaceBulletinAnswers,
    value:
      "yes"
      | "no"
  ) {
    if (locked) {
      return;
    }

    setBulletin(
      (
        current
      ) => ({
        ...current,

        [key]:
          current[
            key
          ] ===
          value
            ? undefined
            : value,
      })
    );
  }

  const answeredCount =
    RACE_BULLETIN_QUESTIONS.filter(
      (
        item
      ) =>
        bulletin[
          item.key
        ] ===
          "yes" ||
        bulletin[
          item.key
        ] ===
          "no"
    ).length;

  const specialCount =
    RACE_SPECIAL_PICKS.filter(
      (
        item
      ) => {
        const value =
          specialPicks[
            item.key
          ];

        return (
          value !==
            null &&
          value !==
            undefined &&
          value !==
            ""
        );
      }
    ).length;

  async function savePrediction() {
    if (locked) {
      setMessage(
        "🔒 Tahmin süresi sona erdi."
      );

      return;
    }

    if (
      !selected.P1 ||
      !selected.P2 ||
      !selected.P3
    ) {
      setMessage(
        "Önce P1, P2 ve P3 pilotlarını seç."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    try {
      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase
          .auth
          .getUser();

      if (
        userError ||
        !user
      ) {
        window.location.href =
          "/login";

        return;
      }

      const payload:
        Record<
          string,
          unknown
        > = {
        user_id:
          user.id,

        season,

        round,

        race_name:
          raceName,

        prediction_type:
          predictionType,

        p1_driver_number:
          selected.P1,

        p2_driver_number:
          selected.P2,

        p3_driver_number:
          selected.P3,

        points: 0,

        podium_points: 0,

        bulletin_points: 0,

        special_points: 0,

        score_breakdown: {},

        updated_at:
          new Date()
            .toISOString(),
      };

      if (isRace) {
        payload.race_bulletin =
          bulletin;

        payload.special_picks =
          specialPicks;
      }

      const {
        error,
      } =
        await supabase
          .from(
            "predictions"
          )
          .upsert(
            payload,
            {
              onConflict:
                "user_id,season,round,prediction_type",
            }
          );

      if (error) {
        setMessage(
          `Tahmin kaydedilemedi: ${error.message}`
        );

        return;
      }

      setMessage(
        isRace
          ? `✅ Yarış tahmin paketin kaydedildi. ${answeredCount}/12 senaryo ve ${specialCount}/4 özel seçim işaretlendi.`
          : "✅ Sprint podyum tahminin kaydedildi."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  const slots: {
    key:
      PodiumSlot;

    points:
      string;
  }[] = [
    {
      key: "P1",
      points:
        "+50",
    },

    {
      key: "P2",
      points:
        "+35",
    },

    {
      key: "P3",
      points:
        "+25",
    },
  ];

  return (
    <div className="prediction-system">
      <style>{`
        .prediction-system {
          color:
            var(--text, #fff);
        }

        .prediction-system * {
          box-sizing:
            border-box;
        }

        .prediction-lock {
          margin-bottom:
            20px;

          padding:
            15px 17px;

          border:
            1px solid
            rgba(255,75,68,.28);

          border-radius:
            12px;

          background:
            rgba(225,6,0,.08);
        }

        .prediction-lock b {
          display:
            block;

          color:
            #ff625b;

          font-size:
            11px;

          letter-spacing:
            .08em;
        }

        .prediction-lock span {
          display:
            block;

          margin-top:
            5px;

          color:
            var(--muted, #9aa4af);

          font-size:
            12px;
        }

        .podium-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            12px;
        }

        .podium-card {
          position:
            relative;

          min-height:
            240px;

          padding:
            17px;

          overflow:
            hidden;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .09
              )
            );

          border-radius:
            15px;

          color:
            var(--text, #fff);

          background:
            rgba(
              255,
              255,
              255,
              .025
            );

          text-align:
            left;

          cursor:
            pointer;

          transition:
            .2s;
        }

        .podium-card:hover {
          transform:
            translateY(
              -2px
            );
        }

        .podium-card.active {
          border-color:
            rgba(
              255,
              73,
              66,
              .68
            );

          background:
            linear-gradient(
              145deg,
              rgba(
                225,
                6,
                0,
                .13
              ),
              rgba(
                255,
                255,
                255,
                .025
              )
            );
        }

        .podium-card:disabled {
          cursor:
            not-allowed;

          opacity:
            .7;
        }

        .podium-top {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            flex-start;
        }

        .podium-position {
          font-size:
            39px;

          line-height:
            1;

          font-weight:
            1000;
        }

        .podium-points {
          margin-top:
            5px;

          color:
            #ff625b;

          font-size:
            9px;

          font-weight:
            900;
        }

        .podium-badge {
          padding:
            6px 8px;

          border-radius:
            999px;

          color:
            #ff756f;

          background:
            rgba(
              225,
              6,
              0,
              .13
            );

          font-size:
            8px;

          font-weight:
            900;
        }

        .podium-driver {
          display:
            flex;

          align-items:
            center;

          gap:
            11px;

          margin-top:
            32px;
        }

        .podium-driver img,
        .podium-avatar {
          width:
            74px;

          height:
            74px;

          flex:
            0 0 74px;

          border-radius:
            50%;

          object-fit:
            cover;

          background:
            #242b34;
        }

        .podium-avatar {
          display:
            grid;

          place-items:
            center;

          font-weight:
            1000;
        }

        .team-bar {
          width:
            4px;

          height:
            39px;

          flex:
            0 0 4px;

          border-radius:
            999px;
        }

        .driver-title {
          font-size:
            15px;

          font-weight:
            1000;
        }

        .driver-team {
          margin-top:
            3px;

          color:
            var(--muted, #8994a1);

          font-size:
            9px;
        }

        .empty-podium {
          height:
            130px;

          display:
            grid;

          place-items:
            center;

          color:
            var(--muted, #7e8996);

          font-size:
            11px;

          text-align:
            center;
        }

        .prediction-section {
          margin-top:
            30px;

          padding-top:
            27px;

          border-top:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .08
              )
            );
        }

        .prediction-heading {
          display:
            flex;

          align-items:
            flex-end;

          justify-content:
            space-between;

          gap:
            18px;

          margin-bottom:
            15px;
        }

        .prediction-heading small {
          color:
            #ff514a;

          font-size:
            9px;

          font-weight:
            1000;

          letter-spacing:
            .13em;
        }

        .prediction-heading h3 {
          margin:
            5px 0 0;

          font-size:
            24px;
        }

        .prediction-progress {
          color:
            var(--muted, #8e99a6);

          font-size:
            10px;

          font-weight:
            800;
        }

        .driver-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              4,
              minmax(
                0,
                1fr
              )
            );

          gap:
            9px;
        }

        .driver-button {
          min-width:
            0;

          padding:
            10px;

          display:
            flex;

          align-items:
            center;

          gap:
            9px;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .07
              )
            );

          border-radius:
            12px;

          color:
            var(--text, #fff);

          background:
            rgba(
              255,
              255,
              255,
              .02
            );

          text-align:
            left;

          cursor:
            pointer;
        }

        .driver-button.selected {
          border-color:
            rgba(
              255,
              77,
              68,
              .55
            );

          background:
            rgba(
              225,
              6,
              0,
              .08
            );
        }

        .driver-button:disabled {
          opacity:
            .55;

          cursor:
            not-allowed;
        }

        .driver-button img,
        .driver-small-avatar {
          width:
            43px;

          height:
            43px;

          flex:
            0 0 43px;

          border-radius:
            50%;

          object-fit:
            cover;

          background:
            #252c35;
        }

        .driver-small-avatar {
          display:
            grid;

          place-items:
            center;

          font-size:
            9px;

          font-weight:
            1000;
        }

        .driver-button-name {
          overflow:
            hidden;

          font-size:
            11px;

          font-weight:
            900;

          white-space:
            nowrap;

          text-overflow:
            ellipsis;
        }

        .driver-button-team {
          margin-top:
            2px;

          overflow:
            hidden;

          color:
            var(--muted, #7f8996);

          font-size:
            8px;

          white-space:
            nowrap;

          text-overflow:
            ellipsis;
        }

        .bulletin-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap:
            10px;
        }

        .bulletin-card {
          position:
            relative;

          min-height:
            164px;

          padding:
            16px;

          display:
            flex;

          flex-direction:
            column;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .08
              )
            );

          border-radius:
            14px;

          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                255,
                255,
                .032
              ),
              rgba(
                255,
                255,
                255,
                .012
              )
            );
        }

        .bulletin-card-top {
          display:
            flex;

          justify-content:
            space-between;

          gap:
            10px;
        }

        .bulletin-icon {
          font-size:
            21px;
        }

        .bulletin-point {
          color:
            #ff665f;

          font-size:
            9px;

          font-weight:
            1000;
        }

        .bulletin-group {
          margin-top:
            9px;

          color:
            #ff625b;

          font-size:
            7px;

          font-weight:
            1000;

          letter-spacing:
            .11em;

          text-transform:
            uppercase;
        }

        .bulletin-card h4 {
          margin:
            5px 0 5px;

          font-size:
            13px;

          line-height:
            1.35;
        }

        .bulletin-card p {
          margin:
            0;

          color:
            var(--muted, #838e9b);

          font-size:
            9px;

          line-height:
            1.5;
        }

        .yes-no {
          display:
            grid;

          grid-template-columns:
            1fr 1fr;

          gap:
            6px;

          margin-top:
            auto;

          padding-top:
            12px;
        }

        .yes-no button {
          height:
            33px;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .08
              )
            );

          border-radius:
            8px;

          color:
            var(--muted, #909ba7);

          background:
            rgba(
              255,
              255,
              255,
              .025
            );

          font-size:
            9px;

          font-weight:
            900;

          cursor:
            pointer;
        }

        .yes-no button.yes-active {
          border-color:
            rgba(
              51,
              210,
              116,
              .45
            );

          color:
            #62e697;

          background:
            rgba(
              51,
              210,
              116,
              .10
            );
        }

        .yes-no button.no-active {
          border-color:
            rgba(
              255,
              72,
              64,
              .45
            );

          color:
            #ff6b65;

          background:
            rgba(
              225,
              6,
              0,
              .09
            );
        }

        .yes-no button:disabled {
          cursor:
            not-allowed;

          opacity:
            .6;
        }

        .special-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap:
            10px;
        }

        .special-card {
          padding:
            16px;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .08
              )
            );

          border-radius:
            14px;

          background:
            rgba(
              255,
              255,
              255,
              .022
            );
        }

        .special-head {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            12px;
        }

        .special-head strong {
          font-size:
            12px;
        }

        .special-points {
          color:
            #ff655f;

          font-size:
            9px;

          font-weight:
            1000;
        }

        .special-card select {
          width:
            100%;

          height:
            42px;

          margin-top:
            12px;

          padding:
            0 10px;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .10
              )
            );

          border-radius:
            9px;

          color:
            var(--text, #fff);

          background:
            var(--panel, #171b22);

          outline:
            none;
        }

        .save-summary {
          margin-top:
            27px;

          padding:
            17px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            20px;

          border:
            1px solid
            rgba(
              255,
              80,
              72,
              .20
            );

          border-radius:
            14px;

          background:
            linear-gradient(
              135deg,
              rgba(
                225,
                6,
                0,
                .10
              ),
              rgba(
                255,
                255,
                255,
                .018
              )
            );
        }

        .save-summary strong {
          display:
            block;

          font-size:
            14px;
        }

        .save-summary span {
          display:
            block;

          margin-top:
            4px;

          color:
            var(--muted, #8b96a3);

          font-size:
            9px;
        }

        .save-button {
          min-width:
            190px;

          height:
            46px;

          border:
            0;

          border-radius:
            9px;

          color:
            white;

          background:
            linear-gradient(
              135deg,
              #c90000,
              #ff463f
            );

          font-size:
            10px;

          font-weight:
            1000;

          cursor:
            pointer;
        }

        .save-button:disabled {
          opacity:
            .5;

          cursor:
            not-allowed;
        }

        .prediction-message {
          margin-top:
            13px;

          padding:
            12px 14px;

          border:
            1px solid
            var(
              --border,
              rgba(
                255,
                255,
                255,
                .08
              )
            );

          border-radius:
            10px;

          color:
            var(--muted, #c4ccd5);

          background:
            rgba(
              255,
              255,
              255,
              .025
            );

          font-size:
            10px;

          line-height:
            1.5;
        }

        @media(
          max-width:
            850px
        ) {
          .podium-grid {
            grid-template-columns:
              1fr;
          }

          .driver-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .bulletin-grid,
          .special-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media(
          max-width:
            520px
        ) {
          .driver-grid {
            grid-template-columns:
              1fr;
          }

          .save-summary {
            align-items:
              stretch;

            flex-direction:
              column;
          }

          .save-button {
            width:
              100%;
          }
        }
      `}</style>

      {locked && (
        <div className="prediction-lock">
          <b>
            🔒 TAHMİNLER KİLİTLENDİ
          </b>

          <span>
            Seans başladı. Kaydedilmiş tahminler artık değiştirilemez.
          </span>
        </div>
      )}

      {/* PODIUM */}

      <div className="podium-grid">
        {slots.map(
          (
            slot
          ) => {
            const driver =
              getDriver(
                selected[
                  slot.key
                ]
              );

            const active =
              activeSlot ===
                slot.key &&
              !locked;

            return (
              <button
                key={
                  slot.key
                }
                type="button"
                className={`podium-card ${
                  active
                    ? "active"
                    : ""
                }`}
                disabled={
                  locked
                }
                onClick={() =>
                  setActiveSlot(
                    slot.key
                  )
                }
              >
                <div className="podium-top">
                  <div>
                    <div className="podium-position">
                      {slot.key}
                    </div>

                    <div className="podium-points">
                      {slot.points} PUAN
                    </div>
                  </div>

                  {active && (
                    <span className="podium-badge">
                      SEÇİLİYOR
                    </span>
                  )}
                </div>

                {driver ? (
                  <div className="podium-driver">
                    {driver.headshot_url ? (
                      <img
                        src={
                          driver.headshot_url
                        }
                        alt={
                          driverName(
                            driver
                          )
                        }
                      />
                    ) : (
                      <div className="podium-avatar">
                        {driver.name_acronym ||
                          "F1"}
                      </div>
                    )}

                    <span
                      className="team-bar"
                      style={{
                        background:
                          driver.team_colour
                            ? `#${driver.team_colour}`
                            : "#777",
                      }}
                    />

                    <div>
                      <div className="driver-title">
                        {driverName(
                          driver
                        )}
                      </div>

                      <div className="driver-team">
                        {driver.team_name ||
                          "Formula 1"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-podium">
                    Aşağıdan pilot seç
                  </div>
                )}
              </button>
            );
          }
        )}
      </div>

      {/* DRIVER PICKER */}

      <section className="prediction-section">
        <div className="prediction-heading">
          <div>
            <small>
              DRIVER PICK
            </small>

            <h3>
              {activeSlot} için pilot seç
            </h3>
          </div>

          <div className="prediction-progress">
            PODIUM · {PODIUM_MAX_POINTS} PUAN
          </div>
        </div>

        <div className="driver-grid">
          {drivers.map(
            (
              driver
            ) => {
              const chosen =
                selected.P1 ===
                  driver.driver_number ||
                selected.P2 ===
                  driver.driver_number ||
                selected.P3 ===
                  driver.driver_number;

              return (
                <button
                  key={
                    driver.driver_number
                  }
                  type="button"
                  className={`driver-button ${
                    chosen
                      ? "selected"
                      : ""
                  }`}
                  disabled={
                    locked
                  }
                  onClick={() =>
                    selectDriver(
                      driver.driver_number
                    )
                  }
                >
                  {driver.headshot_url ? (
                    <img
                      src={
                        driver.headshot_url
                      }
                      alt=""
                    />
                  ) : (
                    <div className="driver-small-avatar">
                      {driver.name_acronym ||
                        "F1"}
                    </div>
                  )}

                  <div
                    style={{
                      minWidth:
                        0,
                    }}
                  >
                    <div className="driver-button-name">
                      {driverName(
                        driver
                      )}
                    </div>

                    <div className="driver-button-team">
                      {driver.team_name ||
                        "Formula 1"}
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* NORMAL RACE EXTRA */}

      {isRace && (
        <>
          <section className="prediction-section">
            <div className="prediction-heading">
              <div>
                <small>
                  RACE BULLETIN
                </small>

                <h3>
                  Yarış Senaryoları
                </h3>
              </div>

              <div className="prediction-progress">
                {answeredCount}/12 · MAKS. {BULLETIN_MAX_POINTS} PUAN
              </div>
            </div>

            <div className="bulletin-grid">
              {RACE_BULLETIN_QUESTIONS.map(
                (
                  question
                ) => {
                  const value =
                    bulletin[
                      question.key
                    ];

                  return (
                    <article
                      className="bulletin-card"
                      key={
                        question.key
                      }
                    >
                      <div className="bulletin-card-top">
                        <span className="bulletin-icon">
                          {question.icon}
                        </span>

                        <span className="bulletin-point">
                          +{question.points} P
                        </span>
                      </div>

                      <div className="bulletin-group">
                        {question.group}
                      </div>

                      <h4>
                        {question.label}
                      </h4>

                      <p>
                        {question.hint}
                      </p>

                      <div className="yes-no">
                        <button
                          type="button"
                          disabled={
                            locked
                          }
                          className={
                            value ===
                            "yes"
                              ? "yes-active"
                              : ""
                          }
                          onClick={() =>
                            answerQuestion(
                              question.key,
                              "yes"
                            )
                          }
                        >
                          EVET
                        </button>

                        <button
                          type="button"
                          disabled={
                            locked
                          }
                          className={
                            value ===
                            "no"
                              ? "no-active"
                              : ""
                          }
                          onClick={() =>
                            answerQuestion(
                              question.key,
                              "no"
                            )
                          }
                        >
                          HAYIR
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>

          <section className="prediction-section">
            <div className="prediction-heading">
              <div>
                <small>
                  SPECIAL PICKS
                </small>

                <h3>
                  Özel Tahminler
                </h3>
              </div>

              <div className="prediction-progress">
                {specialCount}/4 · MAKS. {SPECIAL_MAX_POINTS} PUAN
              </div>
            </div>

            <div className="special-grid">
              {/* FASTEST LAP */}

              <div className="special-card">
                <div className="special-head">
                  <strong>
                    ⚡ En hızlı turu kim atar?
                  </strong>

                  <span className="special-points">
                    +20 P
                  </span>
                </div>

                <select
                  disabled={
                    locked
                  }
                  value={
                    specialPicks.fastestLap ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setSpecialPicks(
                      (
                        current
                      ) => ({
                        ...current,

                        fastestLap:
                          event
                            .target
                            .value
                            ? Number(
                                event
                                  .target
                                  .value
                              )
                            : null,
                      })
                    )
                  }
                >
                  <option value="">
                    Pilot seç
                  </option>

                  {drivers.map(
                    (
                      driver
                    ) => (
                      <option
                        key={
                          driver.driver_number
                        }
                        value={
                          driver.driver_number
                        }
                      >
                        {driver.name_acronym ||
                          driverName(
                            driver
                          )}
                        {" · "}
                        {driverName(
                          driver
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* FIRST DNF */}

              <div className="special-card">
                <div className="special-head">
                  <strong>
                    💥 İlk DNF kim olur?
                  </strong>

                  <span className="special-points">
                    +25 P
                  </span>
                </div>

                <select
                  disabled={
                    locked
                  }
                  value={
                    specialPicks.firstDnf ??
                    ""
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event
                        .target
                        .value;

                    setSpecialPicks(
                      (
                        current
                      ) => ({
                        ...current,

                        firstDnf:
                          value ===
                          "NONE"
                            ? "NONE"
                            : value
                            ? Number(
                                value
                              )
                            : null,
                      })
                    );
                  }}
                >
                  <option value="">
                    Pilot seç
                  </option>

                  <option value="NONE">
                    DNF olmayacak
                  </option>

                  {drivers.map(
                    (
                      driver
                    ) => (
                      <option
                        key={
                          driver.driver_number
                        }
                        value={
                          driver.driver_number
                        }
                      >
                        {driver.name_acronym ||
                          driverName(
                            driver
                          )}
                        {" · "}
                        {driverName(
                          driver
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* MOST GAINED */}

              <div className="special-card">
                <div className="special-head">
                  <strong>
                    📈 En çok sıra kazanan pilot
                  </strong>

                  <span className="special-points">
                    +20 P
                  </span>
                </div>

                <select
                  disabled={
                    locked
                  }
                  value={
                    specialPicks.mostGained ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setSpecialPicks(
                      (
                        current
                      ) => ({
                        ...current,

                        mostGained:
                          event
                            .target
                            .value
                            ? Number(
                                event
                                  .target
                                  .value
                              )
                            : null,
                      })
                    )
                  }
                >
                  <option value="">
                    Pilot seç
                  </option>

                  {drivers.map(
                    (
                      driver
                    ) => (
                      <option
                        key={
                          driver.driver_number
                        }
                        value={
                          driver.driver_number
                        }
                      >
                        {driver.name_acronym ||
                          driverName(
                            driver
                          )}
                        {" · "}
                        {driverName(
                          driver
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* TEAM */}

              <div className="special-card">
                <div className="special-head">
                  <strong>
                    🏆 Kazanan takım
                  </strong>

                  <span className="special-points">
                    +15 P
                  </span>
                </div>

                <select
                  disabled={
                    locked
                  }
                  value={
                    specialPicks.winningTeam ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setSpecialPicks(
                      (
                        current
                      ) => ({
                        ...current,

                        winningTeam:
                          event
                            .target
                            .value ||
                          null,
                      })
                    )
                  }
                >
                  <option value="">
                    Takım seç
                  </option>

                  {teams.map(
                    (
                      team
                    ) => (
                      <option
                        key={
                          team
                        }
                        value={
                          team
                        }
                      >
                        {team}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="save-summary">
        <div>
          <strong>
            {isRace
              ? `Maksimum ${RACE_MAX_POINTS} puan`
              : `${PODIUM_MAX_POINTS} puanlık Sprint tahmini`}
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
          disabled={
            saving ||
            locked
          }
          onClick={
            savePrediction
          }
        >
          {saving
            ? "KAYDEDİLİYOR..."
            : locked
            ? "TAHMİNLER KİLİTLİ"
            : "TAHMİN PAKETİNİ KAYDET →"}
        </button>
      </div>

      {message && (
        <div className="prediction-message">
          {message}
        </div>
      )}
    </div>
  );
}