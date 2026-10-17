F1 Medipol Kart Rush G40.1 -- Stadium Floodlights and Reflective Track

BAZ SURUM: Graphics G40 AI + Atmosfer + Yagmur

KURULUM (proje kokunde PowerShell):
  Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g401-isik-ve-yansima.zip" -DestinationPath . -Force
  node .\kart-rush-g401-isik-ve-yansima\INSTALL.cjs
  npm.cmd run build -- --webpack
  npm.cmd run dev -- --webpack

GERI ALMA:
  node .\kart-rush-g401-isik-ve-yansima\RESTORE.cjs

GUNCELLEMELER:
- Tum piste grafik kalitesine gore 3D projektor direkleri ve coklu lamba basliklari
- Yakindaki en fazla 4 projektorden asfalt, pist borduru, beton icin zemine dusen sicak isik havuzlari
- Kuru pist icin belirgin gece aydinlatmasi, yagmurda daha parlak yansimalar
- Fren yapan oyuncu ve AI araclari icin yolda kirimizi fren isigi yansimasi
- G40'un mevcut asfalti, sis, yagmur ve lens efektleri korunuyor

Not: Shader ve dinamik efektler motor tarafinda; harici dosya/SQL gerektirmez.
