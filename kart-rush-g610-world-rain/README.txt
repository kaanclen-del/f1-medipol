F1 MEDIPOL KART RUSH — GRAPHICS 6.1 / 3D WORLD RAIN

Gereksinim: Graphics 6.0 Mega Overhaul yuklu olmali.

PowerShell / proje kokunde:
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g610-dunya-yagmuru.zip" -DestinationPath . -Force
  node .\kart-rush-g610-world-rain\INSTALL.cjs
  npm.cmd run build -- --webpack

Geri alma:
  node .\kart-rush-g610-world-rain\RESTORE.cjs

Bu paket sadece components/kart-rush/engine.ts dosyasini degistirir.
G6.0 4K dokular, araba grafikleri, kokpit, AI ve butun diger oynanis korunur.
Yagmur ekrana yapisik filtre yerine gercek dunya koordinatlarinda
3D dusey WebGL cizgileridir. Derinlik testi aktif oldugu icin onlerinde
bulunan binalar ve araclardan gorunmezler. Kamera hareketinde 3D paralaks var.
Normal havada yagmur shaderi/bufferi olusturulmaz.
Performans: Balanced 1500 / High 2200 / Ultra 2900 dusen damla.
Cok eski GPU'lar shaderi desteklemezse yaris devam eder (yagmur fallback).

NOT: Gercek FPS ve WebGL shader destegi kullanicinin bilgisayarinda
browser uzerinden test edilmelidir. Kurulum tam Next uygulamasini icermiyor.
