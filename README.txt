F1 Medipol - Giris Ekrani Tasarim Duzeltmesi v2

Guncellenen dosyalar:
app/login/page.tsx
app/login/login.module.css

Degisiklikler:
- Race Control Experience, Member Access / 2026, Uyelik Alani ve Beyond the Grid dekoratif etiketleri kaldirildi.
- Sol slogan ve sag kart basliginin font, satir araligi ve Turkce karakter gorunumu elden gecirildi.
- Gri, kirmizi ve acik temalarda input e-posta/sifre kutularinin arka planlari esitlendi.
- Mobil duzen ve tema gecisi korundu.
- Supabase giris/kayit sifre islemleri degistirilmedi.

PowerShell (proje kok klasorunde):
Copy-Item .\app\login\page.tsx .\app\login\page.tsx.bak -Force; Copy-Item .\app\login\login.module.css .\app\login\login.module.css.bak -Force; Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-giris-tasarim-duzeltme-v2.zip" -DestinationPath . -Force

Acik olan dev sunucu Webpack ise sayfa otomatik yenilenir. Gerektiginde Ctrl+F5.
