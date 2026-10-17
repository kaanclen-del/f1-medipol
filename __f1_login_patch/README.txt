F1 Medipol login 404 onarimi
VS Code PowerShell terminalinde proje kokune gidin.
Ctrl+C ile dev sunucusunu kapatin.
ZIP dosyasini Downloads klasorune indirin.
Komut:
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-login-404-onarim.zip" -DestinationPath .\__f1_login_patch -Force; cmd /c .\__f1_login_patch\install.cmd
Ardindan npm.cmd run dev; terminalde gorunen Local URL ile /login acin.
