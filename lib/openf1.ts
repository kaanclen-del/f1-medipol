import { openF1Request } from "@/lib/openf1-auth";

export type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  country_name?: string;
  location?: string;
  date_start: string;
  date_end: string;
  year: number;
};

export type OpenF1Driver = {
  driver_number: number;

  first_name?: string;
  last_name?: string;
  full_name?: string;
  broadcast_name?: string;
  name_acronym?: string;

  team_name?: string;
  team_colour?: string;

  country_code?: string;
  headshot_url?: string;

  session_key: number;
  meeting_key: number;
};

export type OpenF1Position = {
  date: string;

  driver_number: number;

  meeting_key: number;

  position: number;

  session_key: number;
};

export type OpenF1Interval = {
  date: string;

  driver_number: number;

  gap_to_leader:
    | number
    | string
    | null;

  interval:
    | number
    | string
    | null;

  meeting_key: number;

  session_key: number;
};

export type OpenF1Lap = {
  date_start?: string;

  driver_number: number;

  /*
    OpenF1'dan gelen bu tur süresi.
    Döndürdüğümüz son objede bunu
    son TAMAMLANMIŞ turun süresi olarak
    kullanıyoruz.
  */
  lap_duration:
    number | null;

  /*
    Biz hesaplıyoruz.
    O pilotun o seanstaki personal best'i.
  */
  best_lap_duration?:
    number | null;

  lap_number: number;

  is_pit_out_lap?:
    boolean;

  session_key: number;

  meeting_key: number;
};

export type OpenF1Stint = {
  compound?: string;

  driver_number: number;

  lap_start: number;

  lap_end?:
    number | null;

  stint_number: number;

  tyre_age_at_start?:
    number;

  session_key: number;

  meeting_key: number;
};

export type OpenF1SessionResult = {
  driver_number: number;

  position:
    number | null;

  gap_to_leader:
    | number
    | string
    | (
        | number
        | string
        | null
      )[]
    | null;

  duration:
    | number
    | number[]
    | null;

  number_of_laps:
    number;

  dnf: boolean;

  dns: boolean;

  dsq: boolean;

  session_key: number;

  meeting_key: number;
};

/* =========================================================
   HELPERS
   ========================================================= */

function isValidLapDuration(
  value:
    number | null
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
  );
}

/* =========================================================
   EN SON SESSION
   ========================================================= */

export async function getLatestF1Session():
  Promise<
    OpenF1Session | null
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/sessions?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const data:
      OpenF1Session[] =
      await response.json();

    if (
      !Array.isArray(
        data
      ) ||
      data.length ===
        0
    ) {
      return null;
    }

    return data[0];
  } catch (
    error
  ) {
    console.error(
      "OPENF1 SESSION ERROR:",
      error
    );

    return null;
  }
}

/* =========================================================
   SÜRÜCÜLER
   ========================================================= */

export async function getLatestF1Drivers():
  Promise<
    OpenF1Driver[]
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/drivers?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data:
      OpenF1Driver[] =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    /*
      Aynı pilot birden fazla kez
      dönerse tekilleştir.
    */

    const byDriver =
      new Map<
        number,
        OpenF1Driver
      >();

    for (
      const driver of
        data
    ) {
      byDriver.set(
        driver.driver_number,
        driver
      );
    }

    return Array.from(
      byDriver.values()
    );
  } catch (
    error
  ) {
    console.error(
      "OPENF1 DRIVERS ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   POZİSYON
   ========================================================= */

export async function getLatestF1Positions():
  Promise<
    OpenF1Position[]
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/position?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data:
      OpenF1Position[] =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    const latestByDriver =
      new Map<
        number,
        OpenF1Position
      >();

    for (
      const item of
        data
    ) {
      const current =
        latestByDriver.get(
          item.driver_number
        );

      if (
        !current ||
        new Date(
          item.date
        ).getTime() >
          new Date(
            current.date
          ).getTime()
      ) {
        latestByDriver.set(
          item.driver_number,
          item
        );
      }
    }

    return Array.from(
      latestByDriver.values()
    ).sort(
      (
        a,
        b
      ) =>
        a.position -
        b.position
    );
  } catch (
    error
  ) {
    console.error(
      "OPENF1 POSITIONS ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   INTERVAL
   ========================================================= */

export async function getLatestF1Intervals():
  Promise<
    OpenF1Interval[]
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/intervals?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data:
      OpenF1Interval[] =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    const latestByDriver =
      new Map<
        number,
        OpenF1Interval
      >();

    for (
      const item of
        data
    ) {
      const current =
        latestByDriver.get(
          item.driver_number
        );

      if (
        !current ||
        new Date(
          item.date
        ).getTime() >
          new Date(
            current.date
          ).getTime()
      ) {
        latestByDriver.set(
          item.driver_number,
          item
        );
      }
    }

    return Array.from(
      latestByDriver.values()
    );
  } catch (
    error
  ) {
    console.error(
      "OPENF1 INTERVAL ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   TURLAR
   ========================================================= */

/*
  Bu fonksiyon artık pilot başına:

  - en yüksek lap_number
  - son tamamlanmış turun süresi
  - personal best

  değerlerini birlikte döndürüyor.
*/

export async function getLatestF1Laps():
  Promise<
    OpenF1Lap[]
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/laps?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data:
      OpenF1Lap[] =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    /*
      Pilotun gördüğümüz
      en yüksek lap numarası.
    */

    const latestLapByDriver =
      new Map<
        number,
        OpenF1Lap
      >();

    /*
      Pilotun son geçerli
      TAMAMLANMIŞ turu.
    */

    const lastCompletedByDriver =
      new Map<
        number,
        OpenF1Lap
      >();

    /*
      Personal Best.
    */

    const bestByDriver =
      new Map<
        number,
        number
      >();

    for (
      const lap of
        data
    ) {
      const latest =
        latestLapByDriver.get(
          lap.driver_number
        );

      if (
        !latest ||
        lap.lap_number >
          latest.lap_number
      ) {
        latestLapByDriver.set(
          lap.driver_number,
          lap
        );
      }

      /*
        Pit-out veya geçersiz süre
        LAST/BEST hesabına girmez.
      */

      if (
        lap.is_pit_out_lap ===
          true ||
        !isValidLapDuration(
          lap.lap_duration
        )
      ) {
        continue;
      }

      const completed =
        lastCompletedByDriver.get(
          lap.driver_number
        );

      if (
        !completed ||
        lap.lap_number >
          completed.lap_number
      ) {
        lastCompletedByDriver.set(
          lap.driver_number,
          lap
        );
      }

      const currentBest =
        bestByDriver.get(
          lap.driver_number
        );

      if (
        currentBest ===
          undefined ||
        lap.lap_duration <
          currentBest
      ) {
        bestByDriver.set(
          lap.driver_number,
          lap.lap_duration
        );
      }
    }

    return Array.from(
      latestLapByDriver.entries()
    ).map(
      ([
        driverNumber,
        latestLap,
      ]) => {
        const lastCompleted =
          lastCompletedByDriver.get(
            driverNumber
          );

        return {
          ...latestLap,

          /*
            En yüksek lap_number korunuyor.
          */
          lap_number:
            latestLap.lap_number,

          /*
            Son kaydın süresi null olsa bile
            önceki tamamlanmış turun süresini
            kaybetmiyoruz.
          */
          lap_duration:
            lastCompleted
              ?.lap_duration ??
            null,

          best_lap_duration:
            bestByDriver.get(
              driverNumber
            ) ??
            null,
        };
      }
    );
  } catch (
    error
  ) {
    console.error(
      "OPENF1 LAPS ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   LASTİK / STINT
   ========================================================= */

export async function getLatestF1Stints():
  Promise<
    OpenF1Stint[]
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/stints?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data:
      OpenF1Stint[] =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    const latestByDriver =
      new Map<
        number,
        OpenF1Stint
      >();

    for (
      const stint of
        data
    ) {
      const current =
        latestByDriver.get(
          stint.driver_number
        );

      if (
        !current ||
        stint.stint_number >
          current.stint_number
      ) {
        latestByDriver.set(
          stint.driver_number,
          stint
        );
      }
    }

    return Array.from(
      latestByDriver.values()
    );
  } catch (
    error
  ) {
    console.error(
      "OPENF1 STINTS ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   SESSION SONUCU
   ========================================================= */

export async function getLatestF1SessionResult():
  Promise<
    OpenF1SessionResult[]
  > {
  try {
    const response =
      await openF1Request(
        "https://api.openf1.org/v1/session_result?session_key=latest",
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      return [];
    }

    const data:
      OpenF1SessionResult[] =
      await response.json();

    if (
      !Array.isArray(
        data
      )
    ) {
      return [];
    }

    return data.sort(
      (
        a,
        b
      ) => {
        if (
          a.position ===
          null
        ) {
          return 1;
        }

        if (
          b.position ===
          null
        ) {
          return -1;
        }

        return (
          a.position -
          b.position
        );
      }
    );
  } catch (
    error
  ) {
    console.error(
      "OPENF1 RESULT ERROR:",
      error
    );

    return [];
  }
}