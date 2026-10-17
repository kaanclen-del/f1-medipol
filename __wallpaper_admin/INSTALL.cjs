// F1 MEDIPOL — Admin panelinden profil arka planı yönetimi
// Proje kökünde: node .\__wallpaper_admin\INSTALL.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const base = path.join(__dirname,'files');
const tasks = [];
const info = [];
function stop(s){ console.error('\nKURULUM DURDURULDU: '+s); process.exit(1); }
function read(rel){const p=path.join(root,rel);if(!fs.existsSync(p))stop('Proje dosyası yok: '+rel);return fs.readFileSync(p,'utf8');}
function queue(rel,content,{overwrite=true}={}){
 const p=path.join(root,rel);const original=fs.existsSync(p)?fs.readFileSync(p):null;
 if(original&&!overwrite)return;
 const target=Buffer.from(content,'utf8');
 if(original&&original.equals(target))return;
 tasks.push({rel,p,original,target});
}
function fromPackage(rel){return fs.readFileSync(path.join(base,rel),'utf8');}

if(!fs.existsSync(path.join(root,'package.json')))stop('VS Code terminalini f1-medipol proje kökünde aç.');
if(!fs.existsSync(path.join(root,'app/profile/page.tsx')))stop('app/profile/page.tsx dosyası yok.');
if(!fs.existsSync(path.join(root,'app/admin/page.tsx')))stop('app/admin/page.tsx dosyası yok.');

// Yerleşik koleksiyondaki mevcut tasarımları koruyarak sayıyı 15'e tamamla.
let lib = read('lib/profile-wallpapers.ts');
const canonical=fs.readFileSync(path.join(__dirname,'base_wallpapers.ts'),'utf8');
const blockPattern=/^  \{\s*\n\s*id:\s*"([^"]+)",[\s\S]*?^  \},/gm;
const entries=[...canonical.matchAll(blockPattern)].map(m=>({id:m[1],text:m[0]}));
if(entries.length!==15)stop('Paket doğrulaması başarısız: yerleşik 15 tasarım eksik.');
const start=lib.indexOf('export const PROFILE_WALLPAPERS');
const end=lib.indexOf('\n];',start);
if(start<0||end<0)stop('lib/profile-wallpapers.ts formatı beklenenden farklı. Otomatik değişiklik yapılmadı.');
const existing=new Set([...lib.slice(start,end).matchAll(/\bid:\s*["']([^"']+)["']/g)].map(m=>m[1]));
const toAppend=entries.filter(e=>!existing.has(e.id));
if(toAppend.length){lib=lib.slice(0,end)+'\n'+toAppend.map(e=>e.text).join('\n')+lib.slice(end);info.push('Eksik '+toAppend.length+' yerleşik tema eklendi.');}
if(!lib.includes('motion?:')){
 // Type interface for motion. Only the ProfileWallpaper declaration, not other types.
 const typeStart=lib.indexOf('export type ProfileWallpaper');
 const typeEnd=lib.indexOf('};',typeStart);
 if(typeStart<0||typeEnd<0)stop('ProfileWallpaper type bulunamadı.');
 const inside=lib.slice(typeStart,typeEnd);
 const accent=/accent:\s*string\s*;/;
 if(!accent.test(inside))stop('ProfileWallpaper accent alanı bulunamadı.');
 lib=lib.slice(0,typeStart)+inside.replace(accent,'accent: string;\n  motion?: "drift" | "pulse" | "rain" | "aurora" | "speed";')+lib.slice(typeEnd);
}
queue('lib/profile-wallpapers.ts',lib);

let profile=read('app/profile/page.tsx');
const importCatalog='import { managedToWallpaper, type ManagedWallpaper } from "@/lib/profile-wallpaper-catalog";';
if(!profile.includes(importCatalog)){
 const anchor=/import \{ getProfileWallpaper, getWallpaperBackground \} from ["']@\/lib\/profile-wallpapers["'];?/;
 if(!anchor.test(profile))stop('Profil sayfasındaki wallpaper importu tanınmadı.');
 profile=profile.replace(anchor,matched=>matched+'\n'+importCatalog);
}
const oldWallpaper='const wallpaper = getProfileWallpaper(profile?.profile_wallpaper);';
if(profile.includes(oldWallpaper)){
 profile=profile.replace(oldWallpaper,`const wallpaperId = profile?.profile_wallpaper;
  const { data: customWallpaperData } =
    typeof wallpaperId === "string" && wallpaperId.startsWith("custom-")
      ? await supabase.from("profile_wallpaper_options")
          .select("id,name,description,image_url,color_a,color_b,accent,motion,is_published,sort_order")
          .eq("id", wallpaperId).eq("is_published", true).maybeSingle()
      : { data: null };
  const wallpaper = customWallpaperData
    ? managedToWallpaper(customWallpaperData as ManagedWallpaper)
    : getProfileWallpaper(wallpaperId);`);
}else if(!profile.includes('managedToWallpaper(customWallpaperData')){
 stop('Profil sayfasındaki arka plan kodu farklı. Hiçbir dosya değiştirilmedi.');
}
const backdropImport='import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";';
if(!profile.includes(backdropImport)){
 const anchor=/import Header from ["']@\/components\/Header["'];?/;
 if(!anchor.test(profile))stop('Profil sayfasında Header importu bulunamadı.');
 profile=profile.replace(anchor,m=>m+'\n'+backdropImport);
}
const oldLayer=/<div\s+className=["']profile-wallpaper-layer["']\s+aria-hidden=["']true["']\s+style=\{\{\s*backgroundImage:\s*background\s*\}\}\s*\/>/;
if(oldLayer.test(profile)){
 profile=profile.replace(oldLayer,'<ProfileWallpaperBackdrop wallpaper={wallpaper} />');
}else if(!profile.includes('<ProfileWallpaperBackdrop wallpaper={wallpaper} />')){
 // Older profile layout - ensure insertion after the opening main element.
 const opening=/(<main className=["']steam-profile["'] style=\{\{[\s\S]*?\}\}>)/;
 if(!opening.test(profile))stop('Profil arka plan yerleşimi tanınmadı. Güncel dosyayla tekrar deneyin.');
 profile=profile.replace(opening,'$1\n      <ProfileWallpaperBackdrop wallpaper={wallpaper} />');
}
profile=profile.replace(/\/profile\/edit#wallpaper/g,'/profile/wallpapers');
queue('app/profile/page.tsx',profile);

// Mevcut admin ekranındaki modül ızgarasına bağlantı yerleştir.
let admin=read('app/admin/page.tsx');
if(!admin.includes('href="/admin/profile-wallpapers"')){
 if(!/import\s+Link\s+from\s+["\']next\/link["\']/.test(admin))admin='import Link from "next/link";\n'+admin;
 const m=/className=["']admin-module-grid["']\s*>/;
 if(m.test(admin)){
 admin=admin.replace(m,found=>found+`
                <Link href="/admin/profile-wallpapers" className="admin-module">
                  <div className="module-icon">🎨</div>
                  <span>NEW MODULE</span>
                  <h3>Profil Arka Planları</h3>
                  <p>Üyelerin kullanacağı arka planları ekle, yayınla ve yönet.</p>
                  <strong>KOLEKSİYONU YÖNET →</strong>
                </Link>`);
 queue('app/admin/page.tsx',admin);
 }else{
 info.push('Admin panel kartı otomatik eklenemedi; /admin/profile-wallpapers adresi çalışır.');
 }
}

// Sadece bu modülün dosyalarını değiştir; ilgisiz sayfalara dokunma.
const files = [
 'lib/profile-wallpaper-catalog.ts',
 'lib/wallpaper-admin-auth.ts',
 'app/api/admin/profile-wallpapers/route.ts',
 'app/api/profile/wallpapers/route.ts',
 'app/admin/profile-wallpapers/page.tsx',
 'app/profile/wallpapers/page.tsx',
 'components/WallpaperAdminClient.tsx',
 'components/WallpaperAdminClient.module.css',
 'components/ProfileWallpaperBackdrop.tsx',
];
for(const file of files)queue(file,fromPackage(file));
for(const file of ['app/profile/wallpapers/wallpapers.module.css','components/ProfileWallpaperBackdrop.module.css'])queue(file,fromPackage(file),{overwrite:false});

const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupRoot=path.join(root,'f1_wallpaper_admin_backups',stamp);
for(const t of tasks){if(t.original){const out=path.join(backupRoot,t.rel);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,t.original);}}
for(const t of tasks){fs.mkdirSync(path.dirname(t.p),{recursive:true});fs.writeFileSync(t.p,t.target);console.log('GUNCELLENDI:',t.rel);}
console.log('\nKURULUM TAMAMLANDI. '+tasks.length+' dosya guncellendi.');
console.log('Yedek klasoru:',backupRoot);
for(const i of info)console.log('BILGI:',i);
console.log('ÖNEMLİ: Supabase SQL Editor dosyası: __wallpaper_admin/files/sql/PROFILE_WALLPAPERS_SETUP.sql');
console.log('Admin adresi: /admin/profile-wallpapers');
console.log('Üye adresi: /profile/wallpapers');
