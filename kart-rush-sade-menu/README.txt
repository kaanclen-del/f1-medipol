F1 MEDIPOL - KART RUSH | SADE ANA MENU (V14 / V15)
====================================================

Bu paket ekran görüntüsünde pembe çarpıyla işaretlenmiş alanları temizler.

KALDIRILANLAR:
- En üst arcade experience etiketi ve edition rozeti
- Grand Prix Hub, Race Weekend, Your Grid / Final Edition satırları
- Arka planda büyük 01 ve RACING DEPARTMENT yazıları
- 22 araç / 11 takım / tur bilgi kutuları
- Ana sayfadaki Hedef Tempo butonları (Ayarlar sekmesine taşındı)
- Local Grand Prix ibaresi, AI/Grafik özetleri ve tekrar eden Ayarlar linki
- Your Machine, takım alt yazısı, motor / sürüş / sınıf istatistikleri
- Yarış başlat düğmesinin ekstra İngilizce üst yazısı

KORUNANLAR:
- Kart Rush başlığı, ana menü, garaj, ayarlar ve çevrim içi sekmesi
- Piste Çık, Yarışı Başlat, tur sayısı
- Seçili aracın görseli, adı ve kaplama değiştirme düğmesi
- Kontrollerin kısa özeti
- Oyun motoru, fizik, pist, HUD, Supabase, lobi: DEĞİŞMEDİ

KURULUM (VS CODE WINDOWS):
1) ZIP'i aç.
2) kart-rush-sade-menu klasörünü, package.json'ın olduğu proje ana klasörüne kopyala.
3) VS Code Terminalde:
   node .\kart-rush-sade-menu\INSTALL.cjs
   npm.cmd run dev -- --webpack
4) Sayfayı Ctrl+Shift+R ile yenile.

Geri almak istersen:
   node .\kart-rush-sade-menu\RESTORE.cjs

Installer yerel değişiklikleri korumak için yalnızca ilgili menü bölümünü
düzenleyebilir ve otomatik yedek alır. Eşleşmeyen yapıya dokunmaz.

surumler/v14 ve surumler/v15 klasörleri ilgili sürümlerin
TAM KartRushClient.tsx ve TAM kartRush.module.css dosyalarını içerir.
Doğrudan değiştirmek isteyenler sürümlerine uygun klasörü kullanabilir.
