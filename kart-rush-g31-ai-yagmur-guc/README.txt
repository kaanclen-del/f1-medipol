F1 Medipol Kart Rush G3.1

Kurulum: ZIP'i proje klasörüne açıp node .\kart-rush-g31-ai-yagmur-guc\INSTALL.cjs çalıştır.
Ardından npm.cmd run build -- --webpack

Yeni özellikler:
- 21 bota cesaret ve hata profili, 8 sn grid koruma, viraj riski
- EMP en yakın 2, Pulse en yakın 1 araca; Mıknatıs 11 sn ve daha geniş kapsül çekme
- Hava seçimi: Kuru / Yağmurlu; ıslakta daha zorlu direksiyon/fren
- Gökyüzü dünya koordinatlarına göre sabitlendi; yağmurda daha karanlık ışık
- Daha doğal, filtrelenmiş düşük/orta frekans kornası

Çevrim içi yağmurlu lobby: SUPABASE_WEATHER.sql dosyasını Supabase SQL Editor üzerinde bir kez çalıştır.

Geri alma: node .\kart-rush-g31-ai-yagmur-guc\RESTORE.cjs

Kapsam: engine.ts, KartRushTrack.tsx, KartRushClient.tsx, sound.ts.
Mevcut dokular, pist, puanlı şampiyona, yarış sesleri ve takım kaplamaları korunur.
