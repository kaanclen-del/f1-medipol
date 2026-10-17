F1 MEDIPOL KART RUSH G3.9.3 — HIZ / RAKİP DENGESİ / TRİBÜN ALKIŞI

DÜZELTME
- G3.9.2’de %100 sağlıklı araba Uzun Yarış temposunda 252 km/sa sınırına takılıyordu (300 x 0.84 = 252).
- Bu sürüm yarış uzunluğu seçimini motor hızından ayırır.
- Standart ve Uzun: turbosuz 280 km/sa; Hızlı: turbosuz 300 km/sa.
- Turbo geçici olarak daha yüksek hız verir; hasar ve pist dışı cezaları korunur.
- Kolay, Normal, Zor AI düz yol hızları ve viraj hızları birlikte artırılır.
- Araç tribün bölgesine yaklaşırken yerel kalabalık uğultusu, alkış ve tezahürat benzeri sesler artar.
- Fotoğraf makinesi flaş sesleri korunur; ayrı olarak çalınır.
- Ses tamamen WebAudio üzerinden üretilir; harici ses dosyası gerekmez.

Yalnızca iki dosya değişir:
components/kart-rush/engine.ts
components/kart-rush/venueAudio.ts

KURULUM (PowerShell, proje kökü):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g39-3-hiz-ai-tribun.zip" -DestinationPath . -Force
node .\kart-rush-g39-3-hiz-ai-tribun\INSTALL.cjs
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

GERİ AL:
node .\kart-rush-g39-3-hiz-ai-tribun\RESTORE.cjs

Bu kurucu G3.9.2 engine.ts ve G3.4 venueAudio.ts dosyaları için tasarlanmıştır. Farklı sürüm gördüğünde dosyaları değiştirmez.
