F1 MEDİPOL — KART RUSH G3.0 MANUEL YARIŞ UPGRADE

Bu sürüm Graphics 2.8 + 2.9 kaynaklarıyla uyumludur.

Neler yenilendi?
- Oyuncu artık pisti kendi kendine takip etmez. W sadece gaz verir.
- A/D direksiyondur, S fren. Hızlı ve yanlış açılı virajlarda pist dışına çıkılır.
- Bariyere temas hasar ve ciddi zaman kaybı verir. Uzun süre bariyerde kalan araç kurtarma cezasıyla geri alınır.
- Pistteki teknik virajlar, şikanlar ve fren noktaları artırıldı.
- Botlar müsait sağ/sol sollama hattını kontrol eder; bloke olduğunda fren yapar.
- Bot viraj hızları denetlendi; iyi çizgiyi bulan oyuncu avantaj kazanır.
- Motor devri gerçek gaz/fren ve ara hız değişimlerine göre yumuşak değişir; devamlı tek tiz ses değildir.

KURULUM (proje kökünde Windows PowerShell):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g30-manuel-surus.zip" -DestinationPath . -Force
node .\kart-rush-g30-manuel-surus-yaris-zekasi\INSTALL.cjs
npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-g30-manuel-surus-yaris-zekasi\RESTORE.cjs

Önemli:
- Sürüş yardımcısı tamamen kaldırıldığı için ilk yarışta viraj öncesi frenlemeyi dene.
- Menüdeki kolay/orta/zor bot dereceleri korunuyor.
- Yeni PNG, SQL ya da Supabase ayarı gerekmiyor.
- Paket sadece components/kart-rush/engine.ts, sound.ts ve KartRushTrack.tsx değiştirir.
- Grafik 2.3-2.9 doku sistemine, takımlara, şampiyona SQL'sine ve start/flaş seslerine dokunmaz.
