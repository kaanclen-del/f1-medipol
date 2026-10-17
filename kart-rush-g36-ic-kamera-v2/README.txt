F1 MEDIPOL KART RUSH 3.6 — İÇ KAMERA YENİDEN TASARIM

Bu paket sadece components/kart-rush/engine.ts dosyasını günceller.

Neler değişti?
- V ile gezerken artık 2 farklı iç açı var:
  1) HALO KOKPİT
  2) SÜRÜCÜ KOKPİTİ
- Kamera artık yere çok yakın / yatay değil; göz hizası yükseltildi
- Go-kart hissi azaltıldı, iç kamera daha F1 benzeri hale getirildi
- F1 tipi düz üst / düz alt direksiyon korundu ve görünümü temizlendi
- Kokpit kameralarında FOV ve kamera yumuşatma yeniden ayarlandı
- Gökyüzü sabit kalmaya devam eder

Kurulum (PowerShell, proje kökü):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g36-ic-kamera-v2.zip" -DestinationPath . -Force
node .\kart-rush-g36-ic-kamera-v2\INSTALL.cjs
npm.cmd run build -- --webpack

Sonra test:
npm.cmd run dev -- --webpack
Sayfa: http://localhost:3000/arcade/kart-rush

Not:
Kamera değiştirmek için yarış içinde V tuşuna bas.
Sıralama: TAKİP → YAKIN TAKİP → HALO YAKIN → TV KAMERASI → BURUN → HALO KOKPİT → SÜRÜCÜ KOKPİTİ
