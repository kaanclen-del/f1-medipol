KART RUSH GRAPHICS 2.9 — ARCADE SES

Kısa motor kaydı artık döndürülmez. Motor sürekli, yumuşak ve gaz/araç hızına göre akıcı değişir. Vites kaynaklı ani ton atlamaları yoktur. 2.8 başlama ışıkları, tribün kamera efektleri ve diğer oyunlar korunur.

PowerShell (proje kökünde):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g29-arcade-motor-sesi.zip" -DestinationPath . -Force
node .\kart-rush-g29-arcade-ses\INSTALL.cjs
npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-g29-arcade-ses\RESTORE.cjs
