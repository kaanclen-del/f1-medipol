KART RUSH G6.2.2 — iPHONE 16 / GERCEK KAYNAK UYUMLU

Bu paket 2026-10-17 tarihinde yuklediginiz 3 kaynak dosyaya birebir uyarlanmistir.
Motor G6.1 -> G6.2 (adaptif mobil GPU), iPhone HUD & kontroller, tek DURAKLAT/MENU, ses test ve 2D yagmur bindirmesini kaldirma.

PowerShell (PROJE KOKUNDE):
Expand-Archive -LiteralPath <INDIRDIGINIZ_ZIP_DOSYASININ_GERCEK_YOLU> -DestinationPath . -Force
node .\kart-rush-g622-iphone-gercek-kaynak\INSTALL.cjs
npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-g622-iphone-gercek-kaynak\RESTORE.cjs

NOT: Yalniz 3 dosya degisir. Bunlardan biri beklenmeyen sekilde degistiyse kurulum YAZMADAN DURUR.
Yedek: .kart-rush-backups/g622-iphone-exact-*
Installer klasoru sadece .cjs/.json/.txt dosyalari icerir; Next.js derlemesine fazladan .tsx girmez.
Gercek iPhone uzerinde dokunmatik ve ses testi gereklidir.
