KART RUSH GRAPHICS 2.6 — V8 SCREAM + POINTS CHAMPIONSHIP

Dosya değişiklikleri:
 - components/kart-rush/sound.ts: yüksek devirde sürekli duyulan sentetik V8
 - components/kart-rush/KartRushClient.tsx: tek yarış veya puanlı lobi ve puan hedefi
 - components/kart-rush/KartRushTrack.tsx: yarış sonunda şampiyona tablosu ve puan akışı

ÖNEMLİ: Puanları oyuncular arasında saklamak için SUPABASE_CHAMPIONSHIP.sql içeriğini
Supabase Dashboard > SQL Editor > New query ekranında BİR DEFA çalıştırmalısın.
SQL, var olan lobileri silmez. Yeni alanlar ve yetki kontrollü puan fonksiyonları ekler.
SQL yapmadan yeni puanlı lobi oluşturma başarısız olur.

Kurulum: Proje ana klasöründe
 Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g26-v8-sampiyona.zip" -DestinationPath . -Force
 node .\kart-rush-g26-v8-sampiyona\INSTALL.cjs
 npm.cmd run build -- --webpack

Geri alma:
 node .\kart-rush-g26-v8-sampiyona\RESTORE.cjs
SQL migration rollback yapılmaz; eklenen sütunlar kullanılmadıkları sürece zararsızdır.

Şampiyona:
 Önce Tek GP / Puanlı Şampiyona seç.
 Hedef 25 / 50 / 75 / 100 / 150 / 200 puan.
 1-10. pozisyon puanları: 25 / 18 / 15 / 12 / 10 / 8 / 6 / 4 / 2 / 1.
 Tüm yarışçılar bitirince ev sahibinin ekranında otomatik puanlandırılır.
 Eksik oyuncular varsa ev sahibi 'DNF say ve puanla' işlemini manuel başlatabilir.
 Şampiyonluk hedefini ilk geçen (tur sonu en yüksek puan) kazanır.
 Mevcut F1 pist/stadyum/araç/gökyüzü kodu korunur.
 Kullanıcı ses kapatmışsa motor sessiz kalır. Ses, ilk kullanıcı etkileşiminden sonra çalışır.
