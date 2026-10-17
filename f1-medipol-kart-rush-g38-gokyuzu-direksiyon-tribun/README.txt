F1 Medipol Kart Rush — Graphics 3.8

Bu paket aşağıdaki sorunları hedefler:
- gökyüzünün ekranla birlikte dönmesi
- dış / iç kamerada teker yön hissinin tutarsız olması
- tek tuşla aşırı sert dönme hissi
- kokpitte direksiyon altında yol görünmesi / boş gövde hissi
- tribünlerde seyirci azlığı
- büyük pist bayraklarının eksikliği

Beklenen mevcut sürüm:
- G37.2 kokpit kamera fix veya
- G37.3 son kokpit polish

Kurulum:
1) ZIP'i proje klasörüne çıkar
2) Proje kökünde çalıştır:
   node .\f1-medipol-kart-rush-g38-gokyuzu-direksiyon-tribun\INSTALL.cjs
3) Ardından build al:
   npm.cmd run build -- --webpack
4) Sonra çalıştır:
   npm.cmd run dev -- --webpack

Geri alma:
   node .\f1-medipol-kart-rush-g38-gokyuzu-direksiyon-tribun\RESTORE.cjs
