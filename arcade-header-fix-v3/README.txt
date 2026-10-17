F1 MEDIPOL / ARCADE HEADER ONARIM V3
===================================
Bu paket Arcade V2'de unutulan sitenin orijinal Header bileşenini sayfanın başına ekler.
Yalnızca app/arcade/page.tsx dosyasını değiştirir. Mevcut Header bileşenini düzenlemez.

PowerShell (f1-medipol klasöründe):
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-arcade-header-fix-v3.zip" -DestinationPath . -Force
  node .\arcade-header-fix-v3\INSTALL.cjs

Eski hâle dönmek:
  node .\arcade-header-fix-v3\RESTORE.cjs

Oyun motoru, kart tasarımı, sayfa CSS'i ve bağlantılar değişmez.
