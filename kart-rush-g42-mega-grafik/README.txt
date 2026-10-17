F1 MEDIPOL KART RUSH — GRAPHICS 4.2.0 MEGA TEXTURE & ENVIRONMENT

KURULUM (PowerShell - proje kokunde)

Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g420-mega-grafik.zip" -DestinationPath . -Force
node .\kart-rush-g42-mega-grafik\INSTALL.cjs
npm.cmd run build -- --webpack
npm.cmd run dev -- --webpack

EKLENENLER
- 4096x2048 albedo atlas: asphalt / grass / carbon / tyres / kerb / metal / gravel / concrete
- 4096x2048 packed normal/roughness atlas
- New physically shaded gravel traps, extra microdetail on all existing textured road surfaces
- Extra 3D barriers, tyre stacks, steel mesh fences, marshal equipment/huts
- 16x anisotropic filtering if GPU extension permits
- Floodlight fixtures visibly OFF during sunny dry races; active with controlled reflections in rain
- Rain tarmac remains asphalt grey, not pure white

PATHS CHANGED
components/kart-rush/engine.ts
public/kart-rush/materials/surface-albedo-v3-mega.png
public/kart-rush/materials/surface-normal-rough-v3-mega.png

Requires exact Graphics 4.1.0 engine source. Installer takes SHA-256 checked backup.

GERI ALMA
node .\kart-rush-g42-mega-grafik\RESTORE.cjs

Do not put these files under app/. The PNGs must live under public/kart-rush/materials/.
