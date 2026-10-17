F1 MEDIPOL ARCADE - GO-KART V6.1 CSS BUILD FIX

Next.js CSS Modules şu global selector nedeniyle hata veriyordu:
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}

Bu paket kuralı şu şekilde düzeltir:
  @media(prefers-reduced-motion:reduce){.page,.page *{scroll-behavior:auto!important}}

ÖZELLİKLER
- Yalnızca app/arcade/gokart-zamanlama/timing.module.css değişir.
- Otomatik yedek alır.
- Aynı kurucu tekrar çalıştırıldığında yeniden yazmaz.
- Go-Kart verilerine, diğer oyunlara, Header'a dokunmaz.

KURULUM (ZIP'i proje ana klasörüne çıkardıktan sonra):
  node .\arcade-gokart-css-fix-v6.1\INSTALL.cjs
  npm.cmd run build -- --webpack

GERİ ALMA:
  node .\arcade-gokart-css-fix-v6.1\RESTORE.cjs
