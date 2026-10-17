KART RUSH G6.2.6 — IPHONE TOUCH + COMPACT HEADER

KAYNAK: 17 Ekim 2026 tarihinde kullanicinin yukledigi kart-rush-g626-kaynak.zip.

YAPILANLAR
- Mobil dikey/yatay site header: logo + hamburger; DM, bildirim, profil ve tema menu icinde
- iPhone yatayda menu artik 700px CSS esiginden disari cikmiyor
- Yarista kamera dugmesi gorunur ve dokunmaya tepki verecek sekilde duzenlendi
- Direksiyon/gaz/fren: coklu parmak kimligiyle bagimsiz basili-tutma; Safari touchcancel korumasi
- setAudioEnabled TS2304 hatasi kaldirildi
- Baslangic popup'i: mevcut kaynakta ZATEN YOK. Pistin 3D isiklari korunur
- Yeni motor geometrisi/ses/oyun fizigi degistirilmedi

KURULUM (PowerShell, proje klasorunde):
Expand-Archive -LiteralPath '.\f1-medipol-kart-rush-g626-mobile-header-touch.zip' -DestinationPath . -Force -ErrorAction Stop
node .\kart-rush-g626-mobile-controls-header\INSTALL.cjs
npm.cmd run build -- --webpack

GERI AL:
node .\kart-rush-g626-mobile-controls-header\RESTORE.cjs

DIKKAT:
- INSTALL once kaynagin SHA256 surumunu dogrular, farkli kodda dosya degistirmez.
- Dosyalar .kart-rush-backups icinde birebir yedeklenir.
- ZIP proje kokunde dursa bile yuklemeyi Git'e eklemeyin.
- Build basarisizsa git commit ve push YAPMAYIN.
- Safari / PWA varsa eski sayfa onbellegini temizleyerek HTTPS Vercel uzerinde test edin.
- Gercek iPhone Safari testi bu ortamda yapilamadi.
