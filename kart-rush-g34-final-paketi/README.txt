F1 MEDIPOL / KART RUSH 3.4 - GRAND FINALE

Kurulum: VS Code terminalinde proje klasöründeyken
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g34-final.zip" -DestinationPath . -Force
  node .\kart-rush-g34-final-paketi\INSTALL.cjs
  npm.cmd run build -- --webpack
  npm.cmd run dev -- --webpack

İçerik:
- Pist tanıtımı 15 sn + 5 kırmızı ışık. Merkezi tanıtım sayacı
- İsteğe bağlı 50/50 start riski: kalkışın ilk 30 saniyesinde avantaj veya dezavantaj
- Her yarışta rastgele 22 araçlık grid; online grid lobi üyeleri için eşzamanlı
- Hard zorluk revizyonu: daha yüksek hız, geç fren, yüksek başarı yüzdesi
- Tribünlerde daha fazla düşük poligonlu seyirci
- Pist boyunca 72 kamera/flaş, 3 kısa fotoğraf makinesi efekti
- Mobil hız göstergesini direksiyondan ayıran CSS düzeltmesi
- Otomatik açılan geniş finiş paneli ve aynı lobide devam seçeneği
- Arkaya bakış / uzaktaki rakiplerin çizim mesafesi ve detay geçişi
- Pist, şampiyona SQL, diğer sesler ve takım kaplamaları korunur.

Geri alma:
  node .\kart-rush-g34-final-paketi\RESTORE.cjs

ÖNEMLİ: Bu paket sadece G3.3 üzerinde test edildi. Uyumsuz dosyada durur.
WebGL / mobil gerçek tarayıcı testi geliştiricinin bilgisayarında yapılmalıdır.
