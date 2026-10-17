F1 Medipol Kart Rush — Graphics 3.7.1 Kokpit İyileştirme

Bu paket yalnızca components/kart-rush/engine.ts dosyasını değiştirir.
Beklenen kaynak sürüm: Graphics 3.7 kokpit-redesign.

Kurulum:
1) ZIP'i projeye çıkar.
2) Proje kökünde çalıştır:
   node .\kart-rush-g37-1-kokpit-iyilestirme\INSTALL.cjs
3) Ardından doğrula:
   npm.cmd run build -- --webpack

Düzeltilenler:
- İç kamera hızlanınca araç dışına çıkıyormuş gibi hissettiren konum düzeltildi.
- Cockpit near clipping plane küçültüldü; artık paneller/gövde daha az kesiliyor.
- FOV daraltıldı; onboard görünüm daha doğal.
- Kokpit içi karbon panel, dashboard, sidewall ve trim güçlendirildi.
- Halo ve sürücü açısı daha içerde ve stabil.

Geri alma:
   node .\kart-rush-g37-1-kokpit-iyilestirme\RESTORE.cjs
