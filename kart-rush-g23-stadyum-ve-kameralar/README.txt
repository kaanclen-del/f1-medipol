Kart Rush Graphics 2.3 — Stadyum Dünyası / Ayrıntılı Asfalt / Kamera Flaşları

Başlangıç sürümü: Graphics 2.2 engine.ts + Graphics 2.0 Stage 1 HUD.
Farklı sürümlerde bilinçli olarak kurulum durur. Hiçbir mevcut dosyayı koşulsuz ezmez.

Kurulum (PowerShell, proje ana klasörü):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g23-stadyum-ve-kameralar.zip" -DestinationPath . -Force
node .\kart-rush-g23-stadyum-ve-kameralar\INSTALL.cjs
npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-g23-stadyum-ve-kameralar\RESTORE.cjs

Grafik:
- Graphics 2.0 albedo ve normal/roughness atlasları yeninden kurulur.
- Devamlı stadyum tribün bantları, kanopiler, pist duvarları, kontrol kulesi, pit binası.
- Dağ ve geniş çim üretimi kaldırıldı. Uzak ufuk koyu beton stadyum zeminine taşındı.
- Çit, servis yolları, tribün kalabalığı (yüksek ayar), sektör sponsor reklamları.
- Oyuncuya yakın kameralarda dinamik ışık patlaması. Web Audio kamera çift deklanşör ve tribün uğultusu.

Teknik:
- Arka plan çizimi WebGL1 + statik mesh, araç fiziğine dokunulmaz.
- Sürüm eşleşmeyen motor/UI üzerine yazılmaz. Yedeklenir; RESTORE.cjs ile geri döner.
- Düşük grafik ayarında seyirci ve dinamik flaşlar kapalı, statik tribünler daha az ayrıntılı.

Sınırlama: Otomatik TS derlemesi ve mesh oluşturma testi yapıldı; gerçek WebGL görsel sonucu kullanıcı tarayıcısında doğrulanacak.
