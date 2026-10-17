F1 MEDIPOL KART RUSH — G6.0 MEGA OVERHAUL

Gereksinim: G5.1 Overdrive Showcase kurulu olmalidir.

PowerShell, proje kokunde:
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g600-mega-overhaul.zip" -DestinationPath . -Force
  node .\kart-rush-g600-mega-overhaul\INSTALL.cjs
  npm.cmd run build -- --webpack
  npm.cmd run dev -- --webpack

Kurulumdan once Windows CRLF dahil kaynak motor surumu kontrol edilir.
Paket kaynaklari .payload ve .png uzantilidir, Next.js derlemesine karismaz.
Diger mini oyunlara, Supabase verilerine, AI fizigine veya kullanici kayitlarina dokunmaz.

Geri alma:
  node .\kart-rush-g600-mega-overhaul\RESTORE.cjs

UYARI: 4K kaplamalar ve yeni shader/venue detaylari GPU yukunu arttirabilir.
Low/normal seviyelerde ozellikler sinirlanmistir, high/ultra icin tasarlanmistir.
Gercek oyun ici FPS ve tum ekran goruntuleri yerel PC ortaminda kontrol edilmelidir.
