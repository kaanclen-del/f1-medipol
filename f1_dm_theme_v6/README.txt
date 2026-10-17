F1 MEDIPOL / DM V6 - HEADER TEMA + 5 SOHBET ARKA PLANI

1. Bu ZIP dosyasini indir.
2. VS Code terminalini projenin ana klasorunde ac.
3. Paket icindeki INSTALL.cjs dosyasini node ile calistir.

DEGISIKLIKLER
- Mevcut alt sabit tema secici tum sayfalarda gizlenir.
- Header'a kucuk tema ikonu eklenir; Gri, F1 Kirmizi, Acik secenekleri.
- Tam ekran DM'nin ust cubugunda da tema menusu bulunur.
- DM sohbetindeki uc nokta menusune 5 arka plan eklenir: Beyaz, Gri,
  F1 Kirmizi, Gece Mavisi, Mor Neon.
- Tercih her kullanicinin her sohbeti icin sadece kendi tarayicisinda kaydedilir.
- Mevcut mesajlar, arkadasliklar, medya ve Supabase verileri degismez.

SQL GEREKMİYOR.

KONTROL
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

Yedekler __f1_dm_v6_yedek klasorune kaydedilir.
