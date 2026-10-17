F1 MEDIPOL / KART RUSH 3.2 - CESUR AI VE VİRAJ ÇİZGİLERİ

YENİ:
- 16 önemli viraj geometrisi haritadan otomatik algılanır.
- Her zorlukta botlar geç fren, iç apex dalışı, dıştan giriş ve dıştan hız taşıma dener.
- Viraj başında ayrı karar alınır; botlar aynı hattı sabit takip etmez.
- Başarılı risk daha iyi viraj çıkışı, başarısız risk pist dışına taşma ve hız kaybı doğurur.
- Kolay/Normal/Zor seviyelerinin tamamında riskli hamleler vardır; hata oranı farklıdır.

KURULUM (proje ana klasörü, Windows PowerShell):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g32-cesur-ai-viraj.zip" -DestinationPath . -Force
node .\kart-rush-g32-cesur-ai-viraj\INSTALL.cjs
npm.cmd run build -- --webpack

GERİ ALMA:
node .\kart-rush-g32-cesur-ai-viraj\RESTORE.cjs

Sadece components/kart-rush/engine.ts değiştirilir; mevcut Graphics 3.1 veya 3.1.1 motorunu gerektirir.
