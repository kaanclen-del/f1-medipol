F1 MEDIPOL GO-KART V7.1 - WINDOWS UYUMLU ESZAMANLI TUR ZAMANLAMA

Bu surum Gokart V6 ve V6.1 TimingClient.tsx ile uyumludur. Satir sonu
LF/CRLF farklarini taniyabilir. Yeni kurulum dosyasi .txt formundadir,
Next.js onu ikincil TypeScript kaynak dosyasi gibi derlemez.

PowerShell (f1-medipol kok klasorunde):
  Remove-Item -LiteralPath ".\gokart-eszamanli-tur-v7" -Recurse -Force
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-gokart-eszamanli-tur-v71.zip" -DestinationPath . -Force
  node .\gokart-eszamanli-tur-v71\INSTALL.cjs
  npm.cmd run build -- --webpack

Ozellikler:
  - Global yaris kronometresi, tum suruculer ayni anda tur atar.
  - Bir surucuyu secmek diger suruculerin suresini durdurmaz.
  - Her surucunun satirinda bagimsiz + TUR butonu ve canli turu bulunur.
  - Secili surucunun turu ayri kaydedilir; digerleri etkilenmez.
  - Mevcut kayitlar, cezalar ve CSV korunur.
  - Kaldigin yerin kaydi tarayici hafizasinda korunur.

Geri alma (degisiklik yoksa):
  node .\gokart-eszamanli-tur-v71\RESTORE.cjs

UYARI: Eger eski V7 paket klasoru projede kaldiysa, Next.js kurulum paketi
icindeki .tsx dosyasini da derler ve hata verebilir. Once onu kaldirin.
