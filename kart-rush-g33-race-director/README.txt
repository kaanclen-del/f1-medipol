F1 MEDIPOL Kart Rush 3.3 - RACE DIRECTOR

Sadece Graphics 3.2 motoru + Graphics 3.1/3.1.1 yarış ekranı ve ses üzerine kurulur.

- Bütün rakipler her virajda risk alır. Aşırı yavaşlama ve durma cezası azaltıldı.
- Start/grid ilk saniyelerinde botlar daha erken yarış temposuna erişir.
- Gökyüzü direksiyonla beraber dönmez (ekrana göre sabit panorama).
- Mobil hız göstergesi ile direksiyon kontrolleri ayrıldı.
- Vites geçişlerinde hafif klik ve fren basışında kısa ses efekti.
- Beş start ışığı sesi varsayılan açık, ayarlardan kapatılabilir.
- Işıklardan önce 5 saniyelik hareketli pist kamera tanıtımı ve pilot bilgi kartları.

PowerShell proje klasöründe:
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g33-race-director.zip" -DestinationPath . -Force
node .\kart-rush-g33-race-director\INSTALL.cjs
npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-g33-race-director\RESTORE.cjs

NOT: Tarayıcılar ilk ses için kullanıcı etkileşimi isteyebilir.
