F1 Medipol Kart Rush — Graphics 3.7.3 Son Kokpit Polish

Beklenen mevcut sürüm:
- engine.ts için G37.2 kokpit kamera fix kurulu olmalı
- KartRushTrack.tsx için G35 yarış arayüzü tabanı kurulu olmalı

Bu paket şunları yapar:
- araç içi kokpiti son kez daha dolu ve daha kaliteli hale getirir
- ön lastiklerin direksiyon yönünü düzeltir
- klavye veya gamepad algılanınca dokunmatik kontrolleri otomatik gizler

Kurulum:
1) ZIP'i projeye çıkar
2) Proje kökünde çalıştır:
   node .\f1-medipol-kart-rush-g37-3-son-kokpit\INSTALL.cjs
3) Ardından build:
   npm.cmd run build -- --webpack
4) Sonra dev sunucusu:
   npm.cmd run dev -- --webpack

Geri alma:
   node .\f1-medipol-kart-rush-g37-3-son-kokpit\RESTORE.cjs
