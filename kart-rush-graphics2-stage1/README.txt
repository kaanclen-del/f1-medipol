KART RUSH GRAPHICS 2.0 — AŞAMA 1

Bu paket, yüklediğin güncel motor sürümüne göre hazırlanmıştır. Mevcut sürüş fiziğine dokunmaz.

YENİ
- PNG ALBEDO ATLASI: asphalt, grass, carbon, rubber, kerb, brushed metal, gravel, concrete.
- NORMAL + ROUGHNESS ATLASI: malzemeye özgü yüzey pürüzü ve ışık tepkisi.
- WEBGL1 TEXTURED MATERIAL PIPELINE: 2 texture sampler / anisotropic filtering / mipmaps.
- ARAÇ YAKIN DETAYI: karbon aero parçaları, winglet, sidepod hava çıkışları, diffuser, tekerlek somunları.
- YÜKSEK AYAR: yeni yakın plan ayrıntı geometrileri.
- DENGELİ AYAR: gerçek dokular ve gölgelendirme.
- DÜŞÜK AYAR: doku atlası hesapları kapalı, eski tip daha hafif shader fallback.

Bu bir Three.js motor değişimi DEĞİLDİR. Three.js geçişinden önce sürüşü bozmadan
gerçek texture + normal/roughness altyapısını mevcut WebGL motoruna ekleyen ilk aşamadır.
Fotoğraf tabanlı PBR fotogerçekçilik veya gerçek zamanlı gölge haritaları iddia edilmez.

ÖNEMLİ: ZIP'i proje ana klasörüne aç, sonra INSTALL.cjs çalıştır. Pakette .ts/.tsx
kaynak kopyaları bulunmaz; payload .payload uzantılıdır. Eski kurulum klasörlerinin
Next.js TypeScript derlemesine dahil olmasını engeller.

WINDOWS POWERSHELL
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-graphics2-stage1.zip" -DestinationPath . -Force
node .\kart-rush-graphics2-stage1\INSTALL.cjs
npm.cmd run build -- --webpack

GERİ ALMA
node .\kart-rush-graphics2-stage1\RESTORE.cjs

İlk gerçek tarayıcı görünümünü kontrol et: /arcade/kart-rush > Grafikler > YÜKSEK
