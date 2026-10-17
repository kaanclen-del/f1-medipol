F1 MEDIPOL KART RUSH 3.9.1 — ESKI SURUS FIZIGI

G3.9 sürümünde direksiyon fiziksel olarak gereğinden yavaş ve zayıf çalışıyordu.
Bu güncelleme daha önce beğendiğiniz G3.7.3 direksiyon fizik hesabını GERİ GETİRİR.
Ancak dalgalanan bayrakları, tribünleri, lastik yönünü, kokpiti ve HUD'u korur.

Değişiklik SADECE components/kart-rush/engine.ts dosyasındadır.
G3.9 yüklü olmalıdır. Başka sürüm varsa kurucu güvenli şekilde durur.

Kurulum (PowerShell, proje kökünden):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g39-1-eski-surus-fizigi.zip" -DestinationPath . -Force
node .\kart-rush-g39-1-eski-surus-fizigi\INSTALL.cjs
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

Geri al:
node .\kart-rush-g39-1-eski-surus-fizigi\RESTORE.cjs
