F1 Medipol Kart Rush - G4.0.3 Asfalt Wet Look + Texture Polish

Kurulum:
1) PowerShell'de proje kokunde:
   Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g403-asfalt-wet-texture.zip" -DestinationPath . -Force
   node .\kart-rush-g403-asfalt-wet-texture\INSTALL.cjs
   npm.cmd run build -- --webpack

Bu paket sunlari yapar:
- Yagmurda sadece asfalti belirgin islak gosterir
- Kerb, beton ve cevre yuzeylerini karli/parlak gostermez
- Asfalta ve betona ek mikro doku verir

Geri alma:
   node .\kart-rush-g403-asfalt-wet-texture\RESTORE.cjs
