F1 MEDIPOL KART RUSH — V20.1 SORUN GIDERME PAKETI

Bu sürüm V19.1 üzerinedir. V19.1 kurulmamışsa güvenlik gereği durur.
Oyunun sürüş fiziği ve V19.1 finiş sonuçlarını korur.

Duzeltilenler:
- GoKart ses/gecis efektleri: overtake ve sira kaybetme
- Asfalt, cim, metal shader detaylari
- Pist sponsor billboard atlasina kullanicinin F1 Medipol logosu
- Kurulum klasorunde .tsx/.ts yok; Next.js bu paket kodlarini ayri uygulama diye derlemez

Kurulum:
1. ZIP'i indirin, proje ana klasorune acin.
2. V19.1 kurulum klasorunu proje disina tasiyin (silmeniz gerekmez).
3. node .\kart-rush-v20-1-son-guncelleme\INSTALL.cjs
4. npm.cmd run build -- --webpack

Geri alma:
node .\kart-rush-v20-1-son-guncelleme\RESTORE.cjs
