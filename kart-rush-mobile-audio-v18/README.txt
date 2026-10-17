F1 MEDIPOL KART RUSH V18 - MOBIL SURUS + RACE AUDIO
=================================================

Bu ZIP eski oyun dosyalarini bastan sona degistirmez. Kurucu sadece mevcut
KartRushTrack.tsx dosyasina ses baglantilarini, scroll lock davranisini ve mobil
kamera dugmesini ekler; CSS'e en sona eklenen mobil ekrani hedefleyen kurallari
ilave eder. raceAmbience.ts ek ses sentezidir. Mevcut engine.ts, sound.ts,
KartRushClient.tsx, Supabase, ana menu ve oyun mekanikleri korunur.

KURULUM (PowerShell, proje kokunde):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-mobile-audio-v18.zip" -DestinationPath . -Force
node .\kart-rush-mobile-audio-v18\INSTALL.cjs
npm.cmd run build -- --webpack

GERI ALMA:
node .\kart-rush-mobile-audio-v18\RESTORE.cjs

MOBIL:
- Oyun alani mobilde 100dvh ve 100dvw kullanarak mevcut tarayici gorunur
  alanini doldurur (telefon tarayici adres cubugu her zaman gizlenemeyebilir).
- Direksiyon solda, gaz/fren/guc sagda. Korna kontrolu sag butonlarin ustunde.
- Hiz gostergesi kontrol dugmelerinin ustunden kaldirildi.
- Yatay ekran icin ayri yerlesim var. Fiziksel yatay cevirme telefon tarafindan yapilir.
- Kamera degistirme dokunmatik dugmesi eklendi.
- Tarayicilarda sesin baslamasi icin bir dokunma gerekebilir.
- Grafik kalitesi FPS'e baglidir; bu paket 3D mesh/engine optimizasyonu yapmaz.

SES:
- Uc yakindaki rakibin Web Audio sentezli motor sesi, mesafeye bagli siddet
- Hizla artan ruzgar efekti
- Temas, pist disi, turbo ve yaris gecis efektleri
- Ayarlardaki ses seviyesi hepsini etkiler; ses kapanirsa yeni sesler de kapanir.

NOT: Diger arac sesleri sentetik olarak uretilir, gercek motorsport ses kaydi degildir.
