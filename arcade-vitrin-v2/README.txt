F1 MEDIPOL - ARCADE VITRIN V2
===========================

Bu paket Arcade ana ekraninin gorunusunu yeniler.
Kart Rush, F1 Manager ve What If oyun kodlarina dokunmaz.

KURULUM / WINDOWS POWERSHELL
1. ZIP dosyasini Indirilenler klasorune indir.
2. VS Code terminalinde F1 Medipol ana klasorunu ac (package.json burada olmali).
3. Asagidaki iki komutu SIRASIYLA calistir:

   Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-arcade-vitrin-v2.zip" -DestinationPath . -Force
   node .\arcade-vitrin-v2\INSTALL.cjs

4. Gerekirse npm.cmd run dev -- --webpack, sonra Ctrl + Shift + R.

GERI ALMA
   node .\arcade-vitrin-v2\RESTORE.cjs

DEGISEN DOSYALAR
   app/arcade/page.tsx (veya src/app/arcade/page.tsx)
   app/arcade/arcade.module.css (veya src/app/arcade/arcade.module.css)

Yedek: proje kokundeki .arcade-backups dizini.
Kurucu mevcut dosyadaki oyun baglantilarini korumaya calisir.
Kurulum onceki dosyanin tamamini yedekler. Diger sistemlere dokunmaz.
