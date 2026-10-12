"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Driver = {
  id: string;

  driver_key: string;
  driver_name: string;

  current_team_state_id:
    | string
    | null;

  current_team_key:
    | string
    | null;

  current_team_name:
    | string
    | null;

  pace: number;
  consistency: number;
  wet: number;
  racecraft: number;
  potential: number;

  annual_salary: number;

  contract_until_season:
    | number
    | null;

  is_current_driver: boolean;
  is_free_agent: boolean;
  contract_expired: boolean;
  can_sign: boolean;

  status:
    | "current"
    | "free"
    | "expired"
    | "contracted"
    | "human_locked";

  first_year_cost: number;
};

type MarketData = {
  season: {
    season_number: number;
    current_round: number;
    status: string;
    market_season: number;
  };

  team: {
    id: string;
    team_key: string;
    team_name: string;
    budget: number;

    driver_key:
      | string
      | null;
  };

  currentDriver:
    | Driver
    | null;

  drivers: Driver[];
};

export default function DriverContractCenter({
  lobbyId,
}: {
  lobbyId: string;
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    data,
    setData,
  ] =
    useState<MarketData | null>(
      null
    );

  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" | "available"
    >("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    years,
    setYears,
  ] = useState(1);

  const [
    signing,
    setSigning,
  ] =
    useState<string | null>(
      null
    );

  const [
    message,
    setMessage,
  ] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/driver-market`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Pilot pazarı yüklenemedi."
        );

        return;
      }

      setData(result);
    } catch {
      setMessage(
        "Pilot pazarı verisine ulaşılamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  const visibleDrivers =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const normalized =
        search
          .trim()
          .toLocaleLowerCase(
            "tr-TR"
          );

      return data.drivers.filter(
        (driver) => {
          if (
            filter ===
              "available" &&
            !driver.can_sign
          ) {
            return false;
          }

          if (
            normalized &&
            !driver.driver_name
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                normalized
              ) &&
            !(
              driver.current_team_name ??
              ""
            )
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                normalized
              )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      data,
      filter,
      search,
    ]);

  async function signDriver(
    driver: Driver
  ) {
    setSigning(
      driver.driver_key
    );

    setMessage("");

    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/driver-market`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                driverKey:
                  driver.driver_key,

                years,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result?.error ||
            "Kontrat işlemi başarısız."
        );

        return;
      }

      setMessage(
        result.message ??
          "Kontrat tamamlandı."
      );

      await load();

      window.setTimeout(
        () => {
          window.location.reload();
        },
        850
      );
    } catch {
      setMessage(
        "Kontrat işlemi sırasında bağlantı hatası oluştu."
      );
    } finally {
      setSigning(null);
    }
  }

  return (
    <>
      <button
        type="button"

        onClick={() =>
          setOpen(true)
        }

        style={{
          width: "100%",

          marginBottom:
            "16px",

          minHeight:
            "145px",

          padding:
            "22px",

          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap: "25px",

          textAlign:
            "left",

          border:
            "1px solid rgba(255,255,255,.075)",

          borderRadius:
            "18px",

          background:
            "linear-gradient(120deg,rgba(210,38,61,.08),rgba(255,255,255,.018))",

          color: "#fff",

          cursor:
            "pointer",
        }}
      >
        <div>
          <div
            style={{
              color:
                "#d2263d",

              fontSize:
                "9px",

              fontWeight:
                900,

              letterSpacing:
                "1.4px",
            }}
          >
            DRIVER MARKET
          </div>

          <h2
            style={{
              margin:
                "7px 0 6px",

              fontSize:
                "23px",
            }}
          >
            Pilot Kontrat Merkezi
          </h2>

          <div
            style={{
              color:
                "#747d86",

              fontSize:
                "10px",

              lineHeight:
                1.5,
            }}
          >
            Pilotları karşılaştır,
            maaşları incele ve
            1–3 sezonluk kontrat
            görüşmeleri yap.
          </div>
        </div>

        <div
          style={{
            minWidth:
              "120px",

            padding:
              "12px",

            border:
              "1px solid rgba(255,255,255,.08)",

            borderRadius:
              "10px",

            textAlign:
              "center",

            background:
              "rgba(0,0,0,.18)",
          }}
        >
          <div
            style={{
              color:
                "#626b74",

              fontSize:
                "7px",

              fontWeight:
                900,
            }}
          >
            CONTRACTS
          </div>

          <strong
            style={{
              display:
                "block",

              marginTop:
                "4px",

              fontSize:
                "13px",
            }}
          >
            MERKEZİ AÇ →
          </strong>
        </div>
      </button>

      {open && (
        <>
          <button
            type="button"

            aria-label="Kontrat merkezini kapat"

            onClick={() =>
              setOpen(false)
            }

            style={{
              position:
                "fixed",

              inset: 0,

              zIndex: 110,

              border: 0,

              background:
                "rgba(0,0,0,.76)",

              backdropFilter:
                "blur(5px)",
            }}
          />

          <aside
            style={{
              position:
                "fixed",

              zIndex: 120,

              top: 0,
              right: 0,
              bottom: 0,

              width:
                "min(760px,100vw)",

              overflowY:
                "auto",

              background:
                "#070707",

              borderLeft:
                "1px solid rgba(255,255,255,.09)",

              boxShadow:
                "-30px 0 100px rgba(0,0,0,.65)",
            }}
          >
            <div
              style={{
                position:
                  "sticky",

                top: 0,

                zIndex: 10,

                padding:
                  "20px",

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap: "15px",

                borderBottom:
                  "1px solid rgba(255,255,255,.07)",

                background:
                  "rgba(7,7,7,.96)",

                backdropFilter:
                  "blur(15px)",
              }}
            >
              <div>
                <div
                  style={
                    redLabel
                  }
                >
                  DRIVER MARKET
                </div>

                <h2
                  style={{
                    margin:
                      "5px 0 0",

                    fontSize:
                      "25px",
                  }}
                >
                  Pilot Kontrat Merkezi
                </h2>
              </div>

              <button
                type="button"

                onClick={() =>
                  setOpen(false)
                }

                style={
                  closeButton
                }
              >
                ×
              </button>
            </div>

            {loading ? (
              <div
                style={{
                  padding:
                    "35px 20px",

                  color:
                    "#727b85",
                }}
              >
                Pilot pazarı
                hazırlanıyor...
              </div>
            ) : !data ? (
              <div
                style={{
                  padding:
                    "25px 20px",

                  color:
                    "#ff7183",
                }}
              >
                {message ||
                  "Veriler yüklenemedi."}
              </div>
            ) : (
              <div
                style={{
                  padding:
                    "18px",

                  display:
                    "grid",

                  gap: "14px",
                }}
              >
                {/* CURRENT DRIVER */}

                <section
                  style={
                    panel
                  }
                >
                  <div
                    style={
                      sectionHeader
                    }
                  >
                    <div
                      style={
                        redLabel
                      }
                    >
                      CURRENT CONTRACT
                    </div>

                    <h3
                      style={{
                        margin:
                          "5px 0 0",
                      }}
                    >
                      Mevcut Pilot
                    </h3>
                  </div>

                  {data.currentDriver ? (
                    <div
                      style={{
                        padding:
                          "16px",

                        display:
                          "grid",

                        gridTemplateColumns:
                          "1fr auto",

                        gap:
                          "12px",

                        alignItems:
                          "center",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            fontSize:
                              "19px",
                          }}
                        >
                          {
                            data
                              .currentDriver
                              .driver_name
                          }
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "5px",

                            color:
                              "#6c7580",

                            fontSize:
                              "9px",
                          }}
                        >
                          {
                            data.team
                              .team_name
                          }{" "}
                          ·{" "}
                          {formatMoney(
                            data
                              .currentDriver
                              .annual_salary
                          )}
                          /sezon
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <div
                          style={
                            miniLabel
                          }
                        >
                          KONTRAT
                        </div>

                        <strong>
                          {data
                            .currentDriver
                            .contract_until_season
                            ? `S${data.currentDriver.contract_until_season} SONUNA KADAR`
                            : "YOK"}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding:
                          "16px",

                        color:
                          "#717a84",
                      }}
                    >
                      Aktif pilot
                      bulunamadı.
                    </div>
                  )}
                </section>

                {/* FINANCE */}

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap: "10px",
                  }}
                >
                  <MiniCard
                    label="TAKIM BÜTÇESİ"
                    value={formatMoney(
                      data.team
                        .budget
                    )}
                  />

                  <MiniCard
                    label="PAZAR SEZONU"
                    value={`SEZON ${data.season.market_season}`}
                  />
                </div>

                {/* CONTRACT YEARS */}

                <section
                  style={
                    panel
                  }
                >
                  <div
                    style={
                      sectionHeader
                    }
                  >
                    <div
                      style={
                        redLabel
                      }
                    >
                      CONTRACT LENGTH
                    </div>

                    <h3
                      style={{
                        margin:
                          "5px 0 0",
                      }}
                    >
                      Kontrat Süresi
                    </h3>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(3,1fr)",

                      gap: "8px",

                      padding:
                        "14px",
                    }}
                  >
                    {[1, 2, 3].map(
                      (value) => (
                        <button
                          key={
                            value
                          }

                          type="button"

                          onClick={() =>
                            setYears(
                              value
                            )
                          }

                          style={{
                            minHeight:
                              "52px",

                            border:
                              years ===
                              value
                                ? "1px solid #d2263d"
                                : "1px solid rgba(255,255,255,.07)",

                            borderRadius:
                              "9px",

                            background:
                              years ===
                              value
                                ? "rgba(210,38,61,.10)"
                                : "rgba(255,255,255,.018)",

                            color:
                              "#fff",

                            cursor:
                              "pointer",

                            fontWeight:
                              900,
                          }}
                        >
                          {value}{" "}
                          SEZON
                        </button>
                      )
                    )}
                  </div>
                </section>

                {/* FILTERS */}

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr auto",

                    gap: "8px",
                  }}
                >
                  <input
                    value={
                      search
                    }

                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }

                    placeholder="Pilot veya takım ara..."

                    style={{
                      minHeight:
                        "43px",

                      padding:
                        "0 13px",

                      border:
                        "1px solid rgba(255,255,255,.075)",

                      borderRadius:
                        "9px",

                      background:
                        "rgba(255,255,255,.02)",

                      color:
                        "#fff",

                      outline:
                        "none",
                    }}
                  />

                  <button
                    type="button"

                    onClick={() =>
                      setFilter(
                        (value) =>
                          value ===
                          "all"
                            ? "available"
                            : "all"
                      )
                    }

                    style={{
                      padding:
                        "0 13px",

                      border:
                        filter ===
                        "available"
                          ? "1px solid #d2263d"
                          : "1px solid rgba(255,255,255,.075)",

                      borderRadius:
                        "9px",

                      background:
                        filter ===
                        "available"
                          ? "rgba(210,38,61,.09)"
                          : "rgba(255,255,255,.02)",

                      color:
                        "#fff",

                      cursor:
                        "pointer",

                      fontSize:
                        "8px",

                      fontWeight:
                        900,
                    }}
                  >
                    {filter ===
                    "available"
                      ? "UYGUN PİLOTLAR"
                      : "TÜM PİLOTLAR"}
                  </button>
                </div>

                {message && (
                  <div
                    style={{
                      padding:
                        "12px",

                      border:
                        "1px solid rgba(210,38,61,.20)",

                      borderRadius:
                        "9px",

                      background:
                        "rgba(210,38,61,.06)",

                      color:
                        "#ff8190",

                      fontSize:
                        "10px",
                    }}
                  >
                    {message}
                  </div>
                )}

                {/* DRIVER LIST */}

                <div
                  style={{
                    display:
                      "grid",

                    gap: "9px",
                  }}
                >
                  {visibleDrivers.map(
                    (driver) => (
                      <DriverCard
                        key={
                          driver.driver_key
                        }

                        driver={
                          driver
                        }

                        years={
                          years
                        }

                        signing={
                          signing ===
                          driver.driver_key
                        }

                        onSign={() =>
                          signDriver(
                            driver
                          )
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}

function DriverCard({
  driver,
  years,
  signing,
  onSign,
}: {
  driver: Driver;
  years: number;
  signing: boolean;
  onSign: () => void;
}) {
  return (
    <div
      style={{
        border:
          driver.is_current_driver
            ? "1px solid rgba(210,38,61,.30)"
            : "1px solid rgba(255,255,255,.065)",

        borderRadius:
          "12px",

        background:
          driver.is_current_driver
            ? "rgba(210,38,61,.055)"
            : "rgba(255,255,255,.016)",

        overflow:
          "hidden",
      }}
    >
      <div
        style={{
          padding:
            "14px",

          display:
            "grid",

          gridTemplateColumns:
            "minmax(170px,1fr) auto",

          gap: "13px",

          alignItems:
            "center",
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",

              gap: "7px",

              alignItems:
                "center",

              flexWrap:
                "wrap",
            }}
          >
            <strong
              style={{
                fontSize:
                  "16px",
              }}
            >
              {
                driver.driver_name
              }
            </strong>

            <StatusBadge
              driver={
                driver
              }
            />
          </div>

          <div
            style={{
              marginTop:
                "5px",

              color:
                "#6d7680",

              fontSize:
                "8px",
            }}
          >
            {driver.current_team_name ??
              "Serbest Pilot"}

            {" · "}

            {formatMoney(
              driver.annual_salary
            )}
            /sezon
          </div>
        </div>

        <button
          type="button"

          disabled={
            !driver.can_sign ||
            signing
          }

          onClick={
            onSign
          }

          style={{
            minWidth:
              "115px",

            minHeight:
              "38px",

            border:
              driver.can_sign
                ? 0
                : "1px solid rgba(255,255,255,.06)",

            borderRadius:
              "8px",

            background:
              !driver.can_sign
                ? "rgba(255,255,255,.025)"
                : driver.is_current_driver
                ? "#333840"
                : "#d2263d",

            color:
              driver.can_sign
                ? "#fff"
                : "#565e67",

            cursor:
              driver.can_sign &&
              !signing
                ? "pointer"
                : "not-allowed",

            fontSize:
              "8px",

            fontWeight:
              1000,
          }}
        >
          {signing
            ? "İŞLENİYOR..."
            : driver.is_current_driver
            ? `${years} SEZON YENİLE`
            : driver.can_sign
            ? `${years} SEZON İMZALA`
            : "KİLİTLİ"}
        </button>
      </div>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(5,1fr)",

          borderTop:
            "1px solid rgba(255,255,255,.045)",
        }}
      >
        <Stat
          label="PACE"
          value={
            driver.pace
          }
        />

        <Stat
          label="CONS."
          value={
            driver.consistency
          }
        />

        <Stat
          label="WET"
          value={
            driver.wet
          }
        />

        <Stat
          label="RACE"
          value={
            driver.racecraft
          }
        />

        <Stat
          label="POT."
          value={
            driver.potential
          }

          highlight
        />
      </div>

      <div
        style={{
          padding:
            "8px 13px",

          display:
            "flex",

          justifyContent:
            "space-between",

          gap: "12px",

          borderTop:
            "1px solid rgba(255,255,255,.04)",

          color:
            "#59616a",

          fontSize:
            "7px",
        }}
      >
        <span>
          KONTRAT:{" "}
          {driver.contract_until_season
            ? `Sezon ${driver.contract_until_season}`
            : "Yok"}
        </span>

        <span>
          İLK SEZON MALİYETİ:{" "}
          {formatMoney(
            driver.first_year_cost
          )}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({
  driver,
}: {
  driver: Driver;
}) {
  let text =
    "KONTRATLI";

  let color =
    "#747d86";

  if (
    driver.status ===
    "current"
  ) {
    text =
      "SENİN PİLOTUN";

    color =
      "#ff7183";
  }

  if (
    driver.status ===
    "free"
  ) {
    text =
      "SERBEST";

    color =
      "#67e697";
  }

  if (
    driver.status ===
    "expired"
  ) {
    text =
      "KONTRATI BİTTİ";

    color =
      "#ffb052";
  }

  if (
    driver.status ===
    "human_locked"
  ) {
    text =
      "OYUNCU TAKIMI";

    color =
      "#7c8590";
  }

  return (
    <span
      style={{
        padding:
          "3px 6px",

        border:
          `1px solid ${color}35`,

        borderRadius:
          "5px",

        background:
          `${color}0d`,

        color,

        fontSize:
          "6px",

        fontWeight:
          1000,
      }}
    >
      {text}
    </span>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding:
          "10px 6px",

        textAlign:
          "center",

        borderRight:
          "1px solid rgba(255,255,255,.035)",
      }}
    >
      <div
        style={
          miniLabel
        }
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",

          marginTop:
            "4px",

          color:
            highlight
              ? "#d6d171"
              : "#fff",

          fontSize:
            "13px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          "13px",

        border:
          "1px solid rgba(255,255,255,.065)",

        borderRadius:
          "10px",

        background:
          "rgba(255,255,255,.018)",
      }}
    >
      <div
        style={
          miniLabel
        }
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",

          marginTop:
            "5px",

          fontSize:
            "16px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function formatMoney(
  amount: number
) {
  if (
    amount >= 1_000_000
  ) {
    const value =
      amount /
      1_000_000;

    return `€${Number.isInteger(
      value
    )
      ? value.toFixed(0)
      : value.toFixed(1)}M`;
  }

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "EUR",

      maximumFractionDigits:
        0,
    }
  ).format(amount);
}

const panel = {
  border:
    "1px solid rgba(255,255,255,.07)",

  borderRadius:
    "12px",

  background:
    "rgba(255,255,255,.018)",

  overflow:
    "hidden",
};

const sectionHeader = {
  padding:
    "14px",

  borderBottom:
    "1px solid rgba(255,255,255,.055)",
};

const redLabel = {
  color:
    "#d2263d",

  fontSize:
    "8px",

  fontWeight:
    1000,

  letterSpacing:
    "1.2px",
};

const miniLabel = {
  color:
    "#59616a",

  fontSize:
    "7px",

  fontWeight:
    900,

  letterSpacing:
    ".6px",
};

const closeButton = {
  width: "38px",

  height: "38px",

  borderRadius:
    "50%",

  border:
    "1px solid rgba(255,255,255,.10)",

  background:
    "rgba(255,255,255,.03)",

  color: "#fff",

  cursor:
    "pointer",

  fontSize:
    "18px",
};