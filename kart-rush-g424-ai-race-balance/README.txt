F1 MEDIPOL — KART RUSH G4.2.4 • AI RACE BALANCE

G4.2.3 (Cockpit Solid Fix) uzerine kurulur.
Bu paket YALNIZCA components/kart-rush/engine.ts dosyasini degistirir.

Degisiklikler:
- En zorda AI viraj hedef hizlari ve yol tutus/hiz koruma stratejisi ileri tasindi.
- Normalde rakipler daha rekabetci; kolayda fark minimal.
- Yagmurda AI'nin asiri sert hiz dusmesi azaltildi.
- Oyuncuyla ayni yuksek hiz limitleri AI'ye uygulandi: turbosuz 350, turboyla 370 km/sa.
- Oyuncu gaz, fren, direksiyon, kokpit, ULTRA grafik ve diger sistemler degismedi.

Yukaridaki 350/370 sayilari ust limitlerdir; viraj, trafik ve etkenler nedeniyle anlik hiz daha az olabilir.

KURULUM - Windows PowerShell, proje klasorunde:
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g424-ai-race-balance.zip" -DestinationPath . -Force
node .\kart-rush-g424-ai-race-balance\INSTALL.cjs
npm.cmd run build -- --webpack

GERI ALMA (yalnizca geri donmek istersen):
node .\kart-rush-g424-ai-race-balance\RESTORE.cjs

Kurulum scripti SHA-256 dogrular, once yedekler, tekrar kurulumda degistirmez.
