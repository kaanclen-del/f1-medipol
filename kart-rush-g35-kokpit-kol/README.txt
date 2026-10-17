F1 MEDIPOL KART RUSH 3.5 — IMMERSIVE UPDATE

Graphics 3.4 üstüne kurulur; hash doğrulaması yapar. Sadece engine.ts ve KartRushTrack.tsx değişir.

YENİLİKLER
- Dünya yönünde duran gökyüzü, kamera hareketine uygun güneş ve bulut açısı
- 3B kokpit kamerası ve direksiyon tepkisi (V ile kamera değiştir)
- Xbox / DualSense standart Gamepad API profilleri + özel düğme eşleştirmeleri
- Mobil HUD için CSS çakışması düzeltmesi ve ayrı hız göstergesi alanı
- Daha iri, tek renkli düşük poligon tribün seyircileri
- Güç kazanımında rulet animasyonu
- 15 sn yarış tanıtımında daha yavaş, yumuşak kamera

KURULUM (PowerShell, proje kökü)
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g35-kokpit-kol.zip" -DestinationPath . -Force
node .\kart-rush-g35-kokpit-kol\INSTALL.cjs
npm.cmd run build -- --webpack

GERİ ALMA
node .\kart-rush-g35-kokpit-kol\RESTORE.cjs

NOT: Gamepad API yalnızca desteklenen tarayıcılarda ve bağlanmış kol varken çalışır; gerekirse kola bir kez basarak bağlantıyı başlatın. Motor, kaynak ve şampiyona verileri korunur.
