KART RUSH GRAPHICS 2.0 — SHADER HOTFIX V2.0.1

Neden: GLSL ES 1.00 içinde `packed` ayrılmış anahtar kelimedir.
Bu paket yalnızca `components/kart-rush/engine.ts` içindeki fragment shader değişken adını düzeltir.
Asfalt/çim/karbon atlasları, araç fiziği, sesler, HUD ve menüye dokunmaz.

KURULUM (proje ana klasörü, Windows PowerShell):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g2-shader-hotfix-v2-0-1.zip" -DestinationPath . -Force
node .\kart-rush-graphics2-shader-fix-v2-0-1\INSTALL.cjs
npm.cmd run build -- --webpack

GERİ ALMA:
node .\kart-rush-graphics2-shader-fix-v2-0-1\RESTORE.cjs

Eski Stage 1 dosyaları ile SHA-256 kontrolü yapılır. Başka sürümse kurucu güvenlik için durur.
