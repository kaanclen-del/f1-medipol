"use client";

import { useEffect, useState } from "react";

// Tahmin merkezindeki 12 gerçek yarış bülteni senaryosu.
// Burada oy/cevap kaydedilmez: kartın tamamı /predict sayfasına gider.
const SCENARIOS = [
  { category: "GÜVENLİK ARACI", question: "Bu yarışta Safety Car piste çıkar mı?", description: "Bir güvenlik aracı, bütün stratejiyi değiştirebilir." },
  { category: "KIRMIZI BAYRAK", question: "Yarış kırmızı bayrakla durdurulur mu?", description: "Sence yarışın akışı beklenmedik bir şekilde kesilir mi?" },
  { category: "SANAL GÜVENLİK ARACI", question: "Virtual Safety Car devreye girer mi?", description: "Sanal güvenlik aracı temposu yarışı etkiler mi?" },
  { category: "YARIŞ DIŞI KALMA", question: "En az üç pilot yarışı tamamlayamaz mı?", description: "Dayanıklılık mı, sürpriz vedalar mı?" },
  { category: "İLK TUR", question: "İlk turda bir olay yaşanır mı?", description: "Startın heyecanı yarışın kaderini belirler mi?" },
  { category: "HAVA KOŞULLARI", question: "Yarış sırasında yağmur yağar mı?", description: "Hava koşulları stratejileri altüst eder mi?" },
  { category: "POLE POZİSYONU", question: "Pole pozisyonundan başlayan pilot kazanır mı?", description: "Sıralama turunun lideri yarışı da önde bitirir mi?" },
  { category: "LİDERLİK", question: "Kazanan pilot starttan finişe lider kalır mı?", description: "Işıklardan damalı bayrağa kadar zirveyi koruyabilir mi?" },
  { category: "FARK", question: "Kazanan ile ikinci arasında 10 saniyeden fazla fark olur mu?", description: "Sence damalı bayrakta fark ne kadar açılır?" },
  { category: "EN HIZLI TUR", question: "En hızlı turu atan pilot podyuma çıkar mı?", description: "Tek tur hızı podyumla taçlanır mı?" },
  { category: "LİDER DEĞİŞİMİ", question: "Dört farklı pilot yarışa liderlik eder mi?", description: "Zirve mücadelesi el değiştirecek mi?" },
  { category: "SON TURLAR", question: "Son 10 turda Safety Car veya VSC çıkar mı?", description: "Finale doğru yeni bir strateji fırsatı doğar mı?" },
] as const;

export default function RotatingPredictionPrompt() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Hareket azaltma tercihi olan kullanıcılar için sabit soru bırakılır.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setActiveIndex((previous) => {
        // Rastgele yeni soru; aynı soru peş peşe gelmez.
        const random = Math.floor(Math.random() * (SCENARIOS.length - 1));
        return random >= previous ? random + 1 : random;
      });
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  const item = SCENARIOS[activeIndex];

  return (
    <div className="prediction-spotlight" aria-label="Tahmin merkezinden örnek sorular">
      <div className="prediction-spotlight-inner">
        <div className="prediction-spotlight-question" key={activeIndex}>
          <div className="prediction-spotlight-meta">
            <span className="prediction-spotlight-category">{item.category}</span>
            <span className="prediction-spotlight-counter">{String(activeIndex + 1).padStart(2, "0")} / {SCENARIOS.length}</span>
          </div>
          <h4>{item.question}</h4>
          <p>{item.description}</p>
        </div>
        <div className="prediction-spotlight-bottom">
          <span className="prediction-spotlight-choice"><em>EVET</em> Mİ, <em>HAYIR</em> MI?</span>
          <span className="prediction-spotlight-hint">Cevabını vermek için karta tıkla ↗</span>
        </div>
      </div>
    </div>
  );
}
