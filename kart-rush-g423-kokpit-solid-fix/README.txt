F1 MEDIPOL KART RUSH G4.2.3 - KOKPIT SOLID FIX

G4.2.2 uzerine kurulur. Diger dosyalariniza dokunmaz.

- Hollow steering wheel now has a solid opaque backplate.
- A small dashboard bulkhead blocks the road through the wheel.
- Overlapping coplanar dashboard and console meshes cleaned up.
- Cockpit and halo cameras slightly raised for clearances, still wider than the original view.
- AI/players speeds 350 / 370 km/h and ULTRA assets are preserved.

POWERSHELL (proje kokunde):
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g423-kokpit-solid-fix.zip" -DestinationPath . -Force
node .\kart-rush-g423-kokpit-solid-fix\INSTALL.cjs
npm.cmd run build -- --webpack

Sadece sorun olursa geri al:
node .\kart-rush-g423-kokpit-solid-fix\RESTORE.cjs
