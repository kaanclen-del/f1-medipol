F1 MEDIPOL · Kart Rush Mobile HUD + Audio V18.1

V18 kurucusundaki "Rakip ses güncellemesi alanı bulunamadı" hatası için onarım.
GitHub main/KartRushTrack.tsx sürümünde onHud callback pausedRef.current kullanır.
Bu paket hem pausedRef.current hem pausedRef.current||finishOnce.current sürümüne uyumludur.

KURULUM (VS Code terminali, f1-medipol ana klasörü)
1) ZIP'i buraya açın.
2) node .\kart-rush-mobile-audio-v18-1\INSTALL.cjs
3) npm.cmd run build -- --webpack

GERİ ALMA
node .\kart-rush-mobile-audio-v18-1\RESTORE.cjs

Değişen: components/kart-rush/KartRushTrack.tsx, kartRush.module.css, raceAmbience.ts.
Mevcut ses dosyası ve oyun motoru değiştirilmez; yedekler .kart-rush-backups içinde.
