F1 MEDIPOL KART RUSH G3.9.2 — DIREKSIYON + 300 KM/SA

- Direksiyon tepki süresi kısaltıldı (~0.1 s içinde girdinin %90'ı).
- Virajlarda direksiyonun etkisizleşmesine neden olan minimum tutuş iyileştirildi.
- Sağlıklı araç normal yarışta 300 km/sa hıza çıkabilir; turbo geçici olarak daha hızlı olabilir.
- Güç, yağmur, hasar, çim, pit ve fren cezaları korunur.
- Kokpit, tribünler, bayraklar, grafikler ve Supabase etkilenmez.

Kurulum PowerShell proje kökünde:
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g39-2-surus-300kmh.zip" -DestinationPath . -Force
node .\kart-rush-g39-2-surus-300kmh\INSTALL.cjs
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

Geri al:
node .\kart-rush-g39-2-surus-300kmh\RESTORE.cjs

Yalnızca mevcut G3.9 veya G3.9.1 engine.ts için. Uymuyorsa üzerine yazmadan durur.
