F1 MEDIPOL - GRAND PRIX CANLI SOHBET MVP

1) ZIP dosyasini indirin ve proje klasorunde acin veya terminal komutuyla __f1_chat_mvp klasorune cikartin.
2) Proje ana klasorunde node .\__f1_chat_mvp\INSTALL.cjs calistirin.
3) VS Code terminalinde: Get-Content ".\__f1_chat_mvp\sql\RACE_CHAT_SETUP.sql" -Raw | Set-Clipboard
4) Supabase SQL Editor -> New query -> Ctrl+V -> Run (terminal komutunu SQL Editor'e yazmayin!).
5) Mevcut localhost'u yenileyin ve /race-chat sayfasini acin.
6) Iki farkli hesapla giris yaparak mesaj gondermeyi deneyin.

Ayrintilar:
- Her round/season ayri sohbet odasi.
- Uye oturumu gerekli; SQL RLS kendi adina sahte mesaj girilmesini engeller.
- DB trigger her kullaniciya 4 saniye gonderim bekleme suresi uygular.
- Son 70 mesaj, otomatik yenileme ve Realtime (destek varsa).
- Uye kendi mesajini silebilir, admin baskalarinin da mesajlarini silebilir.
- Her uye uygunsuz mesaji bildirir. Raporlar public.race_chat_reports tablosunda yonetimce incelenebilir.
- DM, grup sohbeti, resim ve ses paylasimi bu ilk surumde yoktur.
- Uygulama Supabase auth ve profiles tablosunu kullanir.
- Ilk surumde tum sohbet uyelere aciktir; moderasyon icin admin kullanin.

NOT: Gercek Supabase'e erisimimiz olmadigi icin SQL'in gercek sunucuda ve sohbetin iki hesapta calismasi yerel test gerektirir.
