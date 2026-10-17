F1 Medipol Kart Rush — Graphics 2.8 V8 Howl + Flashes + Start Lights

YENILIKLER
- Tam gaz 5 saniye aralıksız tutulunca sesin devri açılır (hıza bağlı kalmaz).
- V8 kaydı korunur, üst frekanslar yumuşatılır, sert mekanik osilatörler eklenmez.
- Aynı 24 kamera noktasında yaklaşınca üçlü ışık flaşları ve üçlü shutter sesi.
- Beş kırmızı ışık için ayrı kısa uyarı sesi, ışıklar söndüğünde ayrı kalkış sesi.
- Tarayıcının ses politikaları nedeniyle geri sayım ekranında SESİ AÇ düğmesi eklenmiştir.

ON KOSULLAR
- Graphics 2.6 şampiyona + Graphics 2.7 gerçek V8 ses kurulmuş olmalı.
- Graphics 2.3/2.4/2.5 pist ve araç sistemleri korunur.

KURULUM (F1 Medipol proje kökünde)
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g28-v8-flas-start.zip" -DestinationPath . -Force
  node .\kart-rush-g28-motor-flas-start\INSTALL.cjs
  npm.cmd run build -- --webpack

GERI ALMA
  node .\kart-rush-g28-motor-flas-start\RESTORE.cjs

TEST
  - Geri sayımda SESİ AÇ'a bas, 5 bip ve farklı GO bipini dinle.
  - Yarış başlayınca 5 saniye gazı hiç bırakma, devir açılmalı.
  - Tribün kamerasının yakınından geçerken büyük beyaz flaşlar ve klik sesleri duymalısın.

NOT: Gerçek WebGL / ses donanımı bu ortamda canlı dinlenemiyor. Testi tarayıcıda yap.
