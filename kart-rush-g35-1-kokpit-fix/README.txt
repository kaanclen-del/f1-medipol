F1 MEDIPOL KART RUSH 3.5.1 — KOKPİT DÜZELTME PAKETİ

Bu paket Graphics 3.5 üstüne kurulur ve sadece components/kart-rush/engine.ts dosyasını günceller.

DÜZELTMELER
- Kokpit kamerası artık aracın dışına taşmayacak şekilde daha sıkı ayarlandı
- Yuvarlak direksiyon yerine F1 tipi düz üst / düz alt direksiyon eklendi
- Kokpit iç yan duvarları ve gösterge paneli küçültülerek görüş açısı temizlendi
- Kokpit FOV azaltıldı, kamera daha sabit hale getirildi
- Gökyüzü artık araçla birlikte dönmek yerine dünya yönüne sabitlendi

KURULUM (PowerShell, proje kökü)
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g35-1-kokpit-fix.zip" -DestinationPath . -Force
node .\kart-rush-g35-1-kokpit-fix\INSTALL.cjs
npm.cmd run build -- --webpack

GERİ ALMA
node .\kart-rush-g35-1-kokpit-fix\RESTORE.cjs
