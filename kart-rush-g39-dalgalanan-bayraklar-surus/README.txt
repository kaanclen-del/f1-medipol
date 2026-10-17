F1 MEDİPOL KART RUSH — GRAPHICS 3.9

Bu paket, Graphics 3.8.1'in üzerine kurulur ve yalnızca components/kart-rush/engine.ts dosyasını değiştirir.

Neler yeni?
- Sabit bayraklar yerine alt bölümlere ayrılmış, GPU üzerinde dalgalanan kumaş bayraklar
- Büyük bayrak sayısında belirgin artış (grafik kalitesine göre dengeli)
- A basılıyken ön lastiklerin sola, D basılıyken sağa bakması (dış ve iç kameralar)
- Direksiyon tepki süresinin yumuşatılması ve hız duyarlı dönüş açısı
- Sert dönüşteki fazla kamera yan savrulmasının azaltılması

KURULUM (PowerShell, proje kökünde)
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g39-dalgalanan-bayraklar-surus.zip" -DestinationPath . -Force
node .\kart-rush-g39-dalgalanan-bayraklar-surus\INSTALL.cjs
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

TEST: http://localhost:3000/arcade/kart-rush

GERİ ALMA
node .\kart-rush-g39-dalgalanan-bayraklar-surus\RESTORE.cjs

UYUM NOTU
G38.1'in SHA-256 değeriyle eşleşmeyen engine.ts dosyasını kurucu değiştirmez.
Paket, diğer dosyaları veya Supabase SQL verilerini değiştirmez.
