KART RUSH GRAPHICS 3.7 — KOKPIT REBUILD

Only modifies components/kart-rush/engine.ts. Needs exact Graphics 3.6 source.

Inside cameras: HALO KOKPIT and SURUCU KOKPITI (cycle V).
Instead of boxes, continuous carbon survival-cell walls, team-colour paint and stripe,
3D multifunction flat-bottom wheel, illuminated 7-segment gear indication and RPM LEDs,
low-profile dashboard, cockpit pads, glove grips, mirrors, sculpted nose, halo and real front tyres.
Camera positions anchored BEHIND the steering wheel with minimal sway and proper FOV.

INSTALL (PowerShell, project root)
Expand-Archive -LiteralPath "$HOME\Downloads\f1-medipol-kart-rush-g37-kokpit-redesign.zip" -DestinationPath . -Force
node .\kart-rush-g37-kokpit-redesign\INSTALL.cjs
npm.cmd run build -- --webpack

RESTORE:
node .\kart-rush-g37-kokpit-redesign\RESTORE.cjs

No changes to social features, Supabase, race physics, physics powerups or textures elsewhere.
