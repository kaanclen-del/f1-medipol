F1 Medipol Kart Rush - Graphics 3.8.1 Derleme Hatası Düzeltmesi

G3.8 kurulumundan sonra görülen TS2448/TS2454 `back` ve `roofHeight`
hatalarını düzeltir. Kaynak sırası değişir; oyun mekaniği, pist,
kokpit, gökyüzü, büyük bayraklar ve tribün yoğunluğu aynen korunur.

Sadece components/kart-rush/engine.ts değiştirilir.
G3.8 kurulu değilse üzerine yazılmaz. Önce otomatik yedek alınır.

PowerShell (proje kökünde):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g38-1-derleme-fix.zip" -DestinationPath . -Force
node .\kart-rush-g38-1-derleme-fix\INSTALL.cjs
npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-g38-1-derleme-fix\RESTORE.cjs
