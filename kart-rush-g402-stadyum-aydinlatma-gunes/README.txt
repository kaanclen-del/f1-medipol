F1 Medipol Kart Rush G4.0.2 - Grand Prix Stadium Lighting / Sunny Dry Track

Bu paket G4.0.1'in uzerine kurulur; yalnizca components/kart-rush/engine.ts dosyasini degistirir.

Degisenler:
- Sokak lambasi tipindeki kucuk isiklar yerine 36 metre yuksekliginde projektor kuleleri.
- Her kulede 18 modullu, genis alanli LED projektor bankalari.
- Tribun catisinda dogrusal projektorler ve pist uzerinde 8 aydinlatma gantrisi.
- Islak zeminde daha parlak, daha genis soguk beyaz isik yansimalari.
- Kuru hava: gercekten gunesli mavi gokyuzu, beyaz bulutlar, gunes ve KURU SIS YOK.
- Yagmur: kapali firtinali gokyuzu, sis, yagmur, damla ve brake yansimasi korunur.
- AI, surus fizigi, hiz, kokpit, puanlama ve Supabase dosyalari degismez.

Proje klasorunde PowerShell:
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g402-stadyum-aydinlatma-gunes.zip" -DestinationPath . -Force
node .\kart-rush-g402-stadyum-aydinlatma-gunes\INSTALL.cjs
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

Geri alma:
node .\kart-rush-g402-stadyum-aydinlatma-gunes\RESTORE.cjs
