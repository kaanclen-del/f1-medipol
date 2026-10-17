F1 MEDIPOL — ARCADE V6 + GO-KART ZAMAN MERKEZI

KURULUM (PowerShell, VS Code projesinin ana klasorunde):
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-arcade-gokart-v6.zip" -DestinationPath . -Force
  node .\arcade-gokart-v6\INSTALL.cjs

SAYFALAR:
  /arcade
  /arcade/gokart-zamanlama

YENILIKLER:
 - F1 Arcade ana basligi ve aciklamasi kaldirildi.
 - Tek ve kucuk, yatay ortalanmis OYUN BASLASIN alani.
 - 4. kart: Go-Kart Zaman Merkezi.
 - Istedigin kadar surucu ve arac ekle, duzenle, sil.
 - Gercek kronometre ile ardisik turlari kaydet veya manuel sure gir.
 - 3 ve 5 saniye ceza uygula ve son cezayi geri al.
 - En iyi 1, 2, 3 veya 5 turun toplami + cezalar ile sonuc hesapla.
 - Pist uzunlugu girerek en iyi turun ortalama hizini goster.
 - CSV sonuc dosyasi indir.
 - Tarayicida otomatik kayit. Oturum verileri sunucuya aktarilmaz.

ONEMLI: Bu sistem GERCEK gokart etkinliginde manuel sure tutma aracidir.
Paylasimli canli sonuc sistemi degildir. Ayni oturum birden fazla cihazda
senkronize edilmez. Tarayici verileri silinirse kayitlar kaybolabilir;
CSV sonuc dosyasini indirmeni oneririz.

YEDEK:
  .arcade-backups/gokart-v6-<tarih>

GERI ALMA:
  node .\arcade-gokart-v6\RESTORE.cjs

Bu paket yalnizca app/arcade/page.tsx, app/arcade/arcade.module.css
ve yeni app/arcade/gokart-zamanlama klasorundeki 4 dosyayi degistirir.
Supabase, DM, Header, Kart Rush motoru, Manager, What If etkilenmez.
