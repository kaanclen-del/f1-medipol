F1 MEDIPOL — KART RUSH G6.2.4 FULL LANDSCAPE / 4-SQUARE HUD

ON KOSUL: G6.2.3 iPhone Landscape kurulu olmalidir. Kurucu kaynak dosyalari SHA256 ile dogrular.

YENILIKLER:
- iPhone yatay yarista WebGL ekrani site Header/layout katmaninin disinda, dogrudan body portalinda gosterilir.
- Site header/dm/bildirim/profil ust barini mobil yatay yaris sirasinda gizler, cikinca geri getirir.
- viewport-fit=cover destegi ve CSS 100dvw / 100dvh ile guvenli alanlari oyun goruntusune katar.
- PC + mobil: SIRA, TUR, SURE ve EN IYI TUR 4 kompakt kare.
- KAMERA tusu, DURAKLAT/MENU yaninda, ayarlara girmeden ulasilir.
- Eski Grid Walk/Risk Karti ve harici start 5 isik popup'lari kaldirildi.
- 3D pistteki start isiklari / geri sayim ve yarisa giris suresi aynen korunur.
- Mobil dokunmatik kontroller baslangicta da erisilebilir kalir.

ONEMLI: iOS Safari, adres cubugunu kodla gizlemeye izin vermez. Gercek fiziksel tam ekran deneyimi icin Safari > Paylas > Ana Ekrana Ekle ile PWA olarak acin. Dinamik ada kisimlari oyun alanina dahildir, HUD tuslari cihaz kesiginden uzak tutulur.

KURULUM (PowerShell proje kokunde):
  Expand-Archive -LiteralPath .\f1-medipol-kart-rush-g624-iphone-fullscreen.zip -DestinationPath . -Force
  node .\kart-rush-g624-iphone-fullscreen\INSTALL.cjs
  npm.cmd run build -- --webpack

GERI ALMA:
  node .\kart-rush-g624-iphone-fullscreen\RESTORE.cjs

Not: Windows satir sonu farkliliklari kabul edilir. Derleme testini bilgisayarinda yap.
