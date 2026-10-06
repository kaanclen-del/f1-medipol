export type PodiumPrediction = {
  P1: number;
  P2: number;
  P3: number;
};

export type PredictionScore = {
  total: number;

  P1: number;
  P2: number;
  P3: number;
};

/*
  PUANLAMA KURALLARI

  P1 doğru konum  = +50
  P2 doğru konum  = +35
  P3 doğru konum  = +25

  Pilot gerçek podyumda fakat
  yanlış sıradaysa = +10
*/

const EXACT_POINTS = {
  P1: 50,
  P2: 35,
  P3: 25,
} as const;

/*
  TEK BİR POZİSYONU PUANLA
*/

function scorePosition(
  predictedDriver: number,
  actualDriver: number,
  actualPodium: number[],
  exactPoints: number
) {
  /*
    Pilot tam olarak doğru
    pozisyondaysa tam puan.
  */

  if (predictedDriver === actualDriver) {
    return exactPoints;
  }

  /*
    Pilot podyuma girmiş fakat
    yanlış sıradaysa +10.
  */

  if (actualPodium.includes(predictedDriver)) {
    return 10;
  }

  /*
    Podyumda değilse puan yok.
  */

  return 0;
}

/*
  ANA PUANLAMA FONKSİYONU
*/

export function calculatePredictionScore(
  prediction: PodiumPrediction,
  actual: PodiumPrediction
): PredictionScore {
  const actualPodium = [
    actual.P1,
    actual.P2,
    actual.P3,
  ];

  const P1 = scorePosition(
    prediction.P1,
    actual.P1,
    actualPodium,
    EXACT_POINTS.P1
  );

  const P2 = scorePosition(
    prediction.P2,
    actual.P2,
    actualPodium,
    EXACT_POINTS.P2
  );

  const P3 = scorePosition(
    prediction.P3,
    actual.P3,
    actualPodium,
    EXACT_POINTS.P3
  );

  return {
    P1,
    P2,
    P3,

    total:
      P1 +
      P2 +
      P3,
  };
}

/*
  YARIŞ SONUCU LİSTESİNDEN
  P1 / P2 / P3 ÇIKAR

  OpenF1 sonucunu daha sonra
  bu fonksiyona göndereceğiz.
*/

export function getPodiumFromResults(
  results: {
    driver_number: number;
    position: number;
  }[]
): PodiumPrediction | null {
  const p1 = results.find(
    (result) => result.position === 1
  );

  const p2 = results.find(
    (result) => result.position === 2
  );

  const p3 = results.find(
    (result) => result.position === 3
  );

  if (!p1 || !p2 || !p3) {
    return null;
  }

  return {
    P1: p1.driver_number,
    P2: p2.driver_number,
    P3: p3.driver_number,
  };
}