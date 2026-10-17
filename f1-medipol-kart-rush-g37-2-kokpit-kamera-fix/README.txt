F1 Medipol Kart Rush — Graphics 3.7.2 Kokpit Kamera Fix

Bu paket yalnızca components/kart-rush/engine.ts dosyasını günceller.
Beklenen mevcut sürüm: G37.1 kokpit iyileştirme.

Düzeltilenler:
- İç kamera hızlanınca aracın dışına taşıyormuş hissi azaltıldı.
- Kokpit kameralar daha içeri ve daha yukarı taşındı.
- İç kamera FOV daraltıldı; görüntü daha doğal hale geldi.
- Direksiyon görseli düzeltildi: A = sola, D = sağa.
- Direksiyon ve kollar daha görünür hale getirildi.
- Kokpit sidewall/dashboard/upper tub daha dolu hale getirildi.

Kurulum:
1) ZIP'i projeye çıkar.
2) Proje kökünde çalıştır:
   node .\f1-medipol-kart-rush-g37-2-kokpit-kamera-fix\INSTALL.cjs
3) Ardından build al:
   npm.cmd run build -- --webpack
4) Geliştirme sunucusu:
   npm.cmd run dev -- --webpack

Geri alma:
   node .\f1-medipol-kart-rush-g37-2-kokpit-kamera-fix\RESTORE.cjs
