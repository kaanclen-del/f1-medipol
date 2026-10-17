@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%CD%"
set "ASSETS=%~dp0payload"
echo.
echo =============================================
echo    F1 MEDIPOL / GIRIS SAYFASI ONARIMI
 echo =============================================
echo Proje: %ROOT%
echo.
if not exist "%ROOT%\package.json" (
  echo [HATA] Bu klasorde package.json yok.
  echo VS Code terminalinde f1-medipol proje kokunu acmalisin.
  exit /b 2
)
set "APPROOT="
if exist "%ROOT%\app\layout.tsx" set "APPROOT=%ROOT%\app"
if not defined APPROOT if exist "%ROOT%\src\app\layout.tsx" set "APPROOT=%ROOT%\src\app"
if not defined APPROOT if exist "%ROOT%\app\page.tsx" set "APPROOT=%ROOT%\app"
if not defined APPROOT if exist "%ROOT%\src\app\page.tsx" set "APPROOT=%ROOT%\src\app"
if not defined APPROOT (
  echo [HATA] Next.js app dizini bulunamadi.
  echo app/layout.tsx veya src/app/layout.tsx dosyasini kontrol et.
  exit /b 3
)
echo [1/4] Next.js uygulama klasoru: %APPROOT%
if not exist "%ASSETS%\page.tsx" (
 echo [HATA] ZIP icerisindeki page.tsx bulunamadi.
 exit /b 4
)
if not exist "%ASSETS%\login.module.css" (
 echo [HATA] ZIP icerisindeki CSS bulunamadi.
 exit /b 4
)
if not exist "%APPROOT%\login" mkdir "%APPROOT%\login"
if exist "%APPROOT%\login\page.tsx" (
  copy /y "%APPROOT%\login\page.tsx" "%APPROOT%\login\page.tsx.before-fix.bak" >nul
  echo [2/4] Eski giris sayfasi yedeklendi.
) else (
  echo [2/4] Yeni login klasoru olusturuluyor.
)
copy /y "%ASSETS%\page.tsx" "%APPROOT%\login\page.tsx" >nul
if errorlevel 1 (
 echo [HATA] TSX dosyasi kopyalanamadi.
 exit /b 5
)
copy /y "%ASSETS%\login.module.css" "%APPROOT%\login\login.module.css" >nul
if errorlevel 1 (
 echo [HATA] CSS dosyasi kopyalanamadi.
 exit /b 5
)
echo [3/4] Login TSX + CSS dosyalari yerlerine konuldu.
if exist "%ROOT%\.next" (
  echo [4/4] Eski Next.js derleme onbellegi temizleniyor...
  rmdir /s /q "%ROOT%\.next" 2>nul
  if exist "%ROOT%\.next" (
    echo [UYARI] .next klasoru silinemedi. Dev sunucusu calisiyor olabilir.
    echo Lutfen tum npm dev terminallerini Ctrl+C ile kapat ve onarimi yeniden calistir.
  ) else (
    echo [4/4] Onbellek temizlendi.
  )
) else (
  echo [4/4] Eski onbellek bulunamadi.
)
echo.
echo =============================================
echo YUKLENDI: %APPROOT%\login\page.tsx
echo YUKLENDI: %APPROOT%\login\login.module.css
echo Simdi ayni terminalde npm.cmd run dev calistir.
echo Terminaldeki LOCAL URL adresinin sonuna /login ekle.
echo 3000 doluysa Next.js baska port kullanabilir.
echo =============================================
endlocal
