F1 MEDIPOL KART RUSH G6.2.5 - HUD TEMIZLIGI

GEREKLI: G6.2.4 iPhone Fullscreen once kurulu olmali.

G6.2.4 dort karelik SIRA, TUR, SURE, EN IYI HUD korunur.
KAMERA ve DURAKLAT dugmeleri korunur.
Dort karenin altinda kalan eski hiz, arac durumu, yaris imzasi,
yagmur bandi, kokpit yazisi, guc aciklamasi, ust ilerleme cizgisi kaldirilir.
Pit/viraj/uyari ve mevcut oyun motoru korunur. Bu paket sadece
components/kart-rush/KartRushTrack.tsx dosyasini degistirir.

KURULUM (PowerShell; proje klasorunde):
Expand-Archive -LiteralPath '.\f1-medipol-kart-rush-g625-hud-cleanup.zip' -DestinationPath . -Force -ErrorAction Stop
node .\kart-rush-g625-hud-cleanup\INSTALL.cjs
npm.cmd run build -- --webpack

GERI AL:
node .\kart-rush-g625-hud-cleanup\RESTORE.cjs

BIR ONEMLI NOT:
Bu paket kaynak dosyanin G6.2.4 ile ayni oldugunu SHA256 ile dogrular.
Uyusmazsa dosyalara dokunmadan durur. Eski local yedekleri GitHub'a ekleme.
