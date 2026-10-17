F1 MEDIPOL KART RUSH — G4.2.5 Kalabalik Grid Optimizasyonu

15-20 arac yan yana oldugunda WebGL geometri olusturma maliyetini azaltir.
Ultra/High tam detayli araclardan en yakin 4-5 adedi anlik animasyonunu korur.
Diger araclar ayni kaplama/geometri ayrintisina sahip on-hazirlanmis taslaklarla cizilir.
GPU Buffer bellekleri her kare sifirdan ayrilmaz.

G4.2.4 uzerine kurulur. AI, hiz, fizik, ses, kokpit ve kaplamalar degismez.

PowerShell:
node .\kart-rush-g425-crowd-optimization\INSTALL.cjs
npm.cmd run build -- --webpack

Yalniz geri almak icin:
node .\kart-rush-g425-crowd-optimization\RESTORE.cjs
