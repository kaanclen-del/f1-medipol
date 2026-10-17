F1 MEDIPOL - MOBIL GORUNUM / DM V3

Kapsam:
- Ana sayfada dar mobil ekranda tasan Grand Prix basligi duzeltildi.
- Yaris geri sayimi iki sutun x iki satir oldu.
- Mesaj baloncugu mobilde sol alt bolgeye alindi; sag alt tema paneliyle cakismaz.
- Mobil DM: WhatsApp benzeri genis okunakli sohbet listesi, mesaj balonlari, tasarimli kompozitor.
- Kotu gorunen mikrofon emojisi yerine cizim ikon (kayit halinde dur simgesi).
- Kullanici arama ve mesaj inputlarinda iPhone zoom etkisini azaltan 16px duzen.
- Klavye acildiginda gorunen ekran yuksekligine gore pencere duzeni.
- Masaustu DM arayuzu korunur.

KURULUM (VS Code terminali, f1-medipol proje kokunden):
1) ZIP dosyasini indir, Downloads'a koy.
2) Expand-Archive ...; node .\__f1_mobile_v3\INSTALL.cjs
3) npm.cmd run build -- --webpack
4) npm.cmd run dev -- --webpack

GUNCELLENEN DOSYALAR:
app/globals.css
components/DmDock.module.css
components/DmDock.tsx

Mevcut dosyalarin yedegi f1_mobile_v3_yedek icine alinir.
SQL degisikligi yoktur. Yeni mesajlar, profiller, auth ve veritabani etkilenmez.
