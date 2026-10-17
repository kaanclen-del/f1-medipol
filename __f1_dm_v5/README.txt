F1 MEDIPOL — DM V5 / Cihaza Gore Mesajlasma

- Masaustunde, Header mesaj ikonuna tiklaninca sag altta pencere acilir.
- Telefon ve tablette, ayni ikon /messages tam sayfa gorunumu acar.
- Mesaj yazma alani sohbet secildiginde altta sabit gorunur.
- Masaustunde tek arkadas varsa ilk acilista onun sohbeti otomatik acilir.
- Resim, video, ses, profil ve arkadaslik islevleri korunur.
- Yeni SQL gerekmiyor.

KURULUM:
PowerShell'de proje klasorunden:
  Expand-Archive -LiteralPath "INDIRILEN_ZIP_DOSYASI" -DestinationPath ".\__f1_dm_v5" -Force
  node ".\__f1_dm_v5\INSTALL.cjs"

KONTROL:
  npm.cmd run build -- --webpack
  npm.cmd run dev -- --webpack

Sadece su dosyalar degisir:
  components/DmDock.tsx
  components/MessagesClient.tsx
  components/MessagesClient.module.css

Mevcut DM V4 kurulumunun ustune uygulanir. Yedekler __f1_dm_v5_yedek/ altina kaydedilir.
