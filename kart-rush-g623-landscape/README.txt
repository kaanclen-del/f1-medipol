F1 MEDIPOL - Kart Rush G6.2.3 iPhone Yatay Ekran Duzeltmesi

ON KOSUL: G6.2.2 tam kurulu olmali. Oyunun gercek G6.2.2 kodu icin hazirlanmistir.

Duzeltmeler:
- iPhone Safari yatay ekranda yarisi 100dvw / 100dvh tam oyun yuzeyine yerlestirir.
- Sayfa / ust header oyun esnasinda goruntuyu sikistiramaz; yarista tam ekran gorunumu.
- Baslangic (grid walk / risk karti) sirasinda HUD ve kontrol cakismaz.
- Risk karti yatay ekranda kaydirilabilir; 5 kirmizi isik ekrani korunur.
- Launcher sayfasinda landscape kenar bosluklari azaltilir.
- Normal site ust menusu Header.tsx kaynak dosyasi elde olmadigi icin degistirilmez.

KURULUM (proje kokunde):
  node .\kart-rush-g623-landscape\INSTALL.cjs
  npm.cmd run build -- --webpack
GERI ALMA:
  node .\kart-rush-g623-landscape\RESTORE.cjs

Bu ZIP'in icindeki kodlar .txt payload olarak tutulur; proje kokune cikarildiginda
Next.js derleme sirasinda gecici TSX dosyalarini taramaz.
