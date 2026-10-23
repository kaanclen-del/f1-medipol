import fs from "node:fs";
import path from "node:path";

const target = path.join(process.cwd(), "app", "members", "[id]", "page.tsx");
if (!fs.existsSync(target)) {
  console.error("HATA: app/members/[id]/page.tsx bulunamadı. Doğru proje kökünde misin?");
  process.exit(1);
}
const old = fs.readFileSync(target, "utf8");
const importLine = 'import MemberPublicFriends from "@/components/MemberPublicFriends";';
const backdropImport = 'import MemberThemeWallpaperBackdrop from "@/components/MemberThemeWallpaperBackdrop";';
const marker = '<div className={styles.contentGrid}>';
if (old.includes("<MemberPublicFriends memberId={id}")) {
  console.log("G6.17.9 zaten kurulu; değişiklik yapılmadı.");
  process.exit(0);
}
if (!old.includes(marker) || !old.includes('import Link from "next/link";')) {
  console.error("HATA: Üye profil sayfasının yapısı beklenenden farklı. Dosya değiştirilmedi.");
  process.exit(1);
}
let next = old.replace('import Link from "next/link";', 'import Link from "next/link";\n' + importLine + '\n' + backdropImport)
  .replace(marker, '<MemberPublicFriends memberId={id} />\n       ' + marker);
// Tema basina farkli duvar kagitlarini ziyaret edilen profilde de kullan.
const profileFields = 'profile_wallpaper: string | null; profile_accent: string | null;';
if (!next.includes(profileFields)) throw new Error('Profil tipi degisti; dosyaya dokunulmadi.');
next = next.replace(profileFields, 'profile_wallpaper: string | null; profile_wallpaper_light: string | null; profile_wallpaper_red: string | null; profile_accent: string | null;');
const selectFields = 'favorite_driver,profile_wallpaper,profile_accent';
if (!next.includes(selectFields)) throw new Error('Profil select alanlari degisti; dosyaya dokunulmadi.');
next = next.replace(selectFields, 'favorite_driver,profile_wallpaper,profile_wallpaper_light,profile_wallpaper_red,profile_accent');
const oldBackdrop = '<ProfileWallpaperBackdrop wallpaper={wallpaper}/>';
if (!next.includes(oldBackdrop)) throw new Error('Eski profil arka plani bulunamadi; dosyaya dokunulmadi.');
next = next.replace(oldBackdrop, '<MemberThemeWallpaperBackdrop wallpaper={wallpaper} lightId={profile.profile_wallpaper_light} redId={profile.profile_wallpaper_red} />');
next = next.replace('import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";\n', '');
const backup = target + ".before-g6179.bak";
fs.copyFileSync(target, backup);
fs.writeFileSync(target, next, "utf8");
const cssTarget = path.join(process.cwd(), "app", "members", "[id]", "page.module.css");
if (fs.existsSync(cssTarget)) {
  const css = fs.readFileSync(cssTarget, "utf8");
  const markerCSS = "/* G6.17.9: Ziyaret edilen profil";
  if (!css.includes(markerCSS)) {
    fs.copyFileSync(cssTarget, cssTarget + ".before-g6179.bak");
    const addon = fs.readFileSync(path.join(process.cwd(), "uye_tema_ek.css"), "utf8");
    fs.writeFileSync(cssTarget, css + addon, "utf8");
  }
}
console.log("G6.17.9 ziyaret edilen üyenin arkadaşları eklendi.");
console.log("Yedek:", backup);
