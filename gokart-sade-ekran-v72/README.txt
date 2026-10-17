F1 Medipol Go-Kart Zamanlama - V7.2 Sade Ekran

Gereksinim: Once V7.1 kurulmus olmali.

KURULUM (PowerShell, proje kokunde):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-gokart-sade-ekran-v72.zip" -DestinationPath . -Force
node .\gokart-sade-ekran-v72\INSTALL.cjs
npm.cmd run build -- --webpack

GERI ALMA:
node .\gokart-sade-ekran-v72\RESTORE.cjs

Degisiklikler:
- Surucu ekleme formunda yalnizca isim alani var.
- Arac numarasi otomatik ataniyor.
- Siralama Ayarlari paneli artik yok.
- Siralama tek en hizli tur + cezaya gore yapiliyor.
- Eszamanli tur kronometresi, tur kayitlari, gecmis ve CSV korunuyor.
- Mevcut localStorage verileri silinmiyor.
- Yedek alinmadan mevcut dosyalar degistirilmez.
- Paket icinde .tsx veya .ts yok; Next.js yanlislikla paket kodunu derlemez.
