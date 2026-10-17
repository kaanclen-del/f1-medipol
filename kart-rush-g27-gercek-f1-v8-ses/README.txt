F1 Medipol Kart Rush — Graphics 2.7 Authentic F1 V8 Audio

Bu paket pist, araç grafiği, şampiyona SQL/RPC işlevlerini DEĞİŞTİRMEZ.
İnce/cızırtılı osilatörler yerine kaydedilmiş F1 V8 egzozu kullanır.

KURULUM — proje ana klasöründe PowerShell:
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g27-gercek-v8-ses.zip" -DestinationPath . -Force
node .\kart-rush-g27-gercek-f1-v8-ses\INSTALL.cjs
npm.cmd run build -- --webpack

Gerçek ses varsa kurucu bunu `public/kart-rush/audio/f1-v8-fw32-2010.ogg` dosyasına indirir.
İndirme başarısız olursa çalışma zamanında Wikimedia'yı dener, gerekirse yumuşak sentetik ses kullanılır.

SES DOSYASI ELLE İNDİRME (gerekirse):
https://commons.wikimedia.org/wiki/File:Williams-Cosworth_FW32_(2010).ogg
Sayfada 'Original file' seç, ses dosyasını yukarıdaki yola `f1-v8-fw32-2010.ogg` adıyla kaydet.
PowerShell kontrol: Test-Path .\public\kart-rush\audio\f1-v8-fw32-2010.ogg

GERİ ALMA:
node .\kart-rush-g27-gercek-f1-v8-ses\RESTORE.cjs

LİSANS:
Edvvc / Ed Pond, Williams-Cosworth FW32 (2010), CC BY-SA 3.0.
Kaynak ve düzenleme açıklaması public/kart-rush/audio/ATTRIBUTION.txt.
