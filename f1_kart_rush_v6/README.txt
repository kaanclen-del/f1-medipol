F1 MEDIPOL KART RUSH — DRIVE V6
===============================

KURULUM (Windows)
1. Bu ZIP dosyasını aç.
2. f1_kart_rush_v6 klasörünü (tamamını) mevcut F1 Medipol proje klasörünün içine kopyala.
   Örnek: C:\Users\...\f1-medipol\f1_kart_rush_v6\INSTALL.cjs
3. Proje ana klasöründe terminal aç ve şu komutu çalıştır:
       node f1_kart_rush_v6\INSTALL.cjs
   Alternatif: f1_kart_rush_v6\KUR-V6.cmd dosyasına çift tıkla.
4. npm.cmd run dev
5. /arcade/kart-rush sayfasını aç.

Sürüm V4 veya V5 mevcut dosyalarının doğrulanmış SHA-256 imzasını arar.
Özel düzenlenmiş/sürümü farklı oyun dosyaları otomatik değiştirilmez.
Dört eski dosyanın yedeği proje içindeki .kart-rush-backups klasörüne alınır.
Yeni oyun bağımlılığı veya SQL şeması gerekmez. Lobi ve sonuç kaydı korunur.

YENİ ÖZELLİKLER
- Açık W / yukarı ok GAZ kontrolü. Gaz bırakılınca ivme kesilir ve araç yavaş yavaş süzülür.
- S / aşağı ok FREN. A / D yön. E / boşluk özel güç. F tam ekran. ESC antrenmanı duraklat.
- Mobilde GAZ ve FREN'e basılı tut; sağ/sol düğmeleriyle direksiyon ver.
- F1 tarzında daha ince açık tekerlekli araçlar, gerçek süspansiyon, ön/arka kanatlar ve halo.
- Pist içindeki binalar kaldırıldı, yarış pisti bariyerleri, asfalt/çim ayrımı iyileştirildi.
- Botlar özel güç toplayıp turbo, kalkan, EMP kullanır ve sollamaya çalışır.
- Oyuncu/bot ve bot/bot çarpışmaları; çevrim içi yarışta yerel temas etkisi.
- Ana menü, araç garajı, grafik/performans ve ses ayarları.
- WebAudio motor, güç toplama, turbo ve çarpışma sesleri kullanıcı kontrolü sonrasında duyulur.

NOTLAR
- Çevrim içi temas, yerel istemci fiziği ile hesaplanır. Anti-hile ve sunucu-otoriteli fizik bu sürümde yoktur.
- Altı araç seçimi renk/görünüm tercihi sunar; sürüş performansını değiştirmez.
- Grafik YÜKSEK ayarı zayıf mobil cihazlarda FPS düşürebilir; DENGELİ önerilir.
