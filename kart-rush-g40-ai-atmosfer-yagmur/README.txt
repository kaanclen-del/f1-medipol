F1 Medipol Kart Rush - G40 AI + Atmosfer + Yagmur Paketi

Kurulum:
1) PowerShell'de proje kokunde:
   Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g40-ai-atmosfer-yagmur.zip" -DestinationPath . -Force
   node .\kart-rush-g40-ai-atmosfer-yagmur\INSTALL.cjs
   npm.cmd run build -- --webpack

Bu paket sunlari yapar:
- AI araclarinin duz yol hizi ve hizlanmasini artirir
- Yagmurlu havada daha guclu sis, yagmur cizgileri ve kamera damlalari ekler
- Kuru havada daha zengin uzaklik sisi / sinematik atmosfer uygular

Geri alma:
   node .\kart-rush-g40-ai-atmosfer-yagmur\RESTORE.cjs
