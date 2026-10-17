F1 MEDIPOL - KART RUSH BUILD FIX V17

Düzeltmeler:
1) KartRushTrack.tsx dosyasının TRACK_METERS import hatasını gerçek engine/circuit tanımlarına göre düzeltir.
2) kart-rush-sade-menu içindeki eski TSX örneklerini tsconfig.json derlemesinden hariç tutar.
3) Değişen dosyaların hepsini .kart-rush-backups altında yedekler.
4) Sabit yoksa pist uzunluğunu trackPosition koordinatlarından hesaplar; tahmini sayı yazmaz.
5) Tekrar kurulumda önceki değişiklikleri korur.

Kurulum:
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-build-fix-v17.zip" -DestinationPath . -Force
  node .\kart-rush-build-fix-v17\INSTALL.cjs
  npm.cmd run build -- --webpack

Geri alma:
  node .\kart-rush-build-fix-v17\RESTORE.cjs

DERLEME TAMAMLANMADAN git commit/push YAPMA.
