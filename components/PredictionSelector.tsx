"use client";

import { useState } from "react";
import type { OpenF1Driver } from "@/lib/openf1";
import { createClient } from "@/utils/supabase/client";

type Props = {
  drivers: OpenF1Driver[];
  season: number;
  round: number;
  raceName: string;
  predictionType?: "race" | "sprint";
};

type PodiumSlot = "P1" | "P2" | "P3";

export default function PredictionSelector({
  drivers,
  season,
  round,
  raceName,
  predictionType = "race",
}: Props) {
  const supabase = createClient();

  const [activeSlot, setActiveSlot] =
    useState<PodiumSlot>("P1");

  const [selected, setSelected] = useState<{
    P1: number | null;
    P2: number | null;
    P3: number | null;
  }>({
    P1: null,
    P2: null,
    P3: null,
  });

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  function selectDriver(
    driverNumber: number
  ) {
    const next = {
      ...selected,
    };

    (
      Object.keys(next) as PodiumSlot[]
    ).forEach((slot) => {
      if (
        next[slot] === driverNumber &&
        slot !== activeSlot
      ) {
        next[slot] = null;
      }
    });

    next[activeSlot] = driverNumber;

    setSelected(next);
    setMessage("");

    if (activeSlot === "P1") {
      setActiveSlot("P2");
    } else if (activeSlot === "P2") {
      setActiveSlot("P3");
    }
  }

  function getDriver(
    driverNumber: number | null
  ) {
    if (!driverNumber) {
      return null;
    }

    return drivers.find(
      (driver) =>
        driver.driver_number ===
        driverNumber
    );
  }

  async function savePrediction() {
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

    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);

      window.location.href =
        "/login";

      return;
    }

    const { error } =
      await supabase
        .from("predictions")
        .upsert(
          {
            user_id: user.id,
            season,
            round,
            race_name: raceName,
            prediction_type:
              predictionType,
            p1_driver_number:
              selected.P1,
            p2_driver_number:
              selected.P2,
            p3_driver_number:
              selected.P3,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id,season,round,prediction_type",
          }
        );

    if (error) {
      setMessage(
        `Tahmin kaydedilemedi: ${error.message}`
      );

      setSaving(false);

      return;
    }

    setMessage(
      "✅ Tahminin başarıyla kaydedildi."
    );

    setSaving(false);
  }

  const slots: {
    key: PodiumSlot;
    points: string;
  }[] = [
    {
      key: "P1",
      points: "+50",
    },
    {
      key: "P2",
      points: "+35",
    },
    {
      key: "P3",
      points: "+25",
    },
  ];

  const predictionComplete =
    Boolean(
      selected.P1 &&
        selected.P2 &&
        selected.P3
    );

  return (
    <div>
      {/* PODIUM */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3,minmax(0,1fr))",
          gap: "14px",
        }}
      >
        {slots.map((slot) => {
          const driver = getDriver(
            selected[slot.key]
          );

          const isActive =
            activeSlot === slot.key;

          return (
            <button
              key={slot.key}
              type="button"
              onClick={() =>
                setActiveSlot(slot.key)
              }
              style={{
                minHeight: "270px",
                borderRadius: "16px",
                border: isActive
                  ? "1px solid rgba(255,75,68,.75)"
                  : "1px solid rgba(255,255,255,.09)",
                background: isActive
                  ? "linear-gradient(145deg,rgba(225,6,0,.12),rgba(255,255,255,.025))"
                  : "rgba(255,255,255,.025)",
                color: "white",
                padding: "18px",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "42px",
                      lineHeight: 1,
                      fontWeight: 1000,
                    }}
                  >
                    {slot.key}
                  </div>

                  <small
                    style={{
                      color: "#ff625b",
                      fontWeight: 900,
                    }}
                  >
                    {slot.points} PUAN
                  </small>
                </div>

                {isActive && (
                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: "999px",
                      background:
                        "rgba(225,6,0,.16)",
                      color: "#ff6b65",
                      fontSize: "9px",
                      fontWeight: 900,
                    }}
                  >
                    SEÇİLİYOR
                  </span>
                )}
              </div>

              {driver ? (
                <div
                  style={{
                    marginTop: "28px",
                  }}
                >
                  {driver.headshot_url && (
                    <img
                      src={
                        driver.headshot_url
                      }
                      alt={
                        driver.full_name ||
                        "F1 Driver"
                      }
                      style={{
                        width: "90px",
                        height: "90px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        background:
                          "#252c36",
                        marginBottom: "14px",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
                  >
                    <span
                      style={{
                        width: "4px",
                        height: "34px",
                        borderRadius:
                          "999px",
                        background:
                          driver.team_colour
                            ? `#${driver.team_colour}`
                            : "#666",
                      }}
                    />

                    <div>
                      <div
                        style={{
                          fontSize: "17px",
                          fontWeight: 1000,
                        }}
                      >
                        {driver.full_name ||
                          driver.broadcast_name}
                      </div>

                      <small
                        style={{
                          color: "#8d98a6",
                        }}
                      >
                        {driver.team_name}
                      </small>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "150px",
                    display: "grid",
                    placeItems: "center",
                    color: "#788493",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  Pilot seçmek için aşağıdaki
                  kartlardan birine tıkla.
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* PİLOT LİSTESİ */}

      <div
        style={{
          marginTop: "26px",
        }}
      >
        <div className="eyebrow">
          PİLOT SEÇ
        </div>

        <h3
          style={{
            margin: "7px 0 15px",
            fontSize: "22px",
          }}
        >
          {activeSlot} için pilot seçiyorsun
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4,minmax(0,1fr))",
            gap: "10px",
          }}
        >
          {drivers.map((driver) => {
            const isSelected =
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
                onClick={() =>
                  selectDriver(
                    driver.driver_number
                  )
                }
                style={{
                  borderRadius: "13px",
                  border: isSelected
                    ? "1px solid rgba(255,80,72,.65)"
                    : "1px solid rgba(255,255,255,.07)",
                  background: isSelected
                    ? "rgba(225,6,0,.09)"
                    : "rgba(255,255,255,.025)",
                  color: "white",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
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
                      width: "46px",
                      height: "46px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      background:
                        "#252c36",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "50%",
                      background:
                        "#252c36",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "10px",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {driver.name_acronym ||
                      "F1"}
                  </div>
                )}

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 900,
                      whiteSpace:
                        "nowrap",
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                    }}
                  >
                    {driver.full_name ||
                      driver.broadcast_name}
                  </div>

                  <div
                    style={{
                      color: "#7f8a98",
                      fontSize: "9px",
                      marginTop: "2px",
                      whiteSpace:
                        "nowrap",
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                    }}
                  >
                    {driver.team_name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MESAJ */}

      {message && (
        <div
          style={{
            marginTop: "20px",
            padding: "13px 15px",
            borderRadius: "11px",
            border:
              "1px solid rgba(255,255,255,.08)",
            background:
              "rgba(255,255,255,.035)",
            color: "#cbd2da",
            fontSize: "12px",
          }}
        >
          {message}
        </div>
      )}

      {/* KAYDET */}

      <div
        style={{
          marginTop: "24px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={savePrediction}
          className={
            predictionComplete
              ? "btn btn-red"
              : "btn"
          }
          disabled={
            !predictionComplete ||
            saving
          }
          style={{
            opacity:
              predictionComplete &&
              !saving
                ? 1
                : 0.45,
            cursor:
              predictionComplete &&
              !saving
                ? "pointer"
                : "not-allowed",
          }}
        >
          {saving
            ? "Kaydediliyor..."
            : "Tahmini Kaydet →"}
        </button>
      </div>
    </div>
  );
}