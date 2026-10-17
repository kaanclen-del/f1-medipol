/**
 * F1 Medipol DM V6 installer. No database modifications.
 * Run from the root of the Next.js project.
 */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const appRoot = fs.existsSync(path.join(root, 'app', 'page.tsx')) ? root :
  fs.existsSync(path.join(root, 'src', 'app', 'page.tsx')) ? path.join(root, 'src') : null;
if (!appRoot || !fs.existsSync(path.join(root, 'package.json'))) {
  console.error('HATA: Terminali f1-medipol proje ana klasorunde acmalisin.'); process.exit(1);
}
const componentDir = path.join(appRoot, 'components');
const headerFile = path.join(componentDir, 'Header.tsx');
const messagesFile = path.join(componentDir, 'MessagesClient.tsx');
const messageCssFile = path.join(componentDir, 'MessagesClient.module.css');
const themeFile = path.join(componentDir, 'HeaderThemeMenu.tsx');
const themeCssFile = path.join(componentDir, 'HeaderThemeMenu.module.css');
const globalCssFile = path.join(appRoot, 'app', 'globals.css');
const required = [headerFile, messagesFile, messageCssFile, globalCssFile];
for (const file of required) {
  if (!fs.existsSync(file)) { console.error('HATA: Bulunamadi: ' + path.relative(root,file) + '. Hicbir dosya degismedi.'); process.exit(1); }
}
const header = fs.readFileSync(headerFile, 'utf8');
const messages = fs.readFileSync(messagesFile, 'utf8');
const css = fs.readFileSync(messageCssFile, 'utf8');
const already = messages.includes('f1-dm-wallpaper:') && header.includes('<HeaderThemeMenu');
if (!already && (!messages.includes('dm_send_message') || !messages.includes('profileActionMenu') || !messages.includes('chatMessages') || !css.includes('popupMode'))) {
  console.error('HATA: Mesajlasma V5 yapisi bulunamadi. Dosyalara dokunulmadi.'); process.exit(1);
}
if (!header.includes('"use client"') && !header.includes("'use client'")) {
  console.error('HATA: Header istemci bileseni degil.');process.exit(1);
}
const source = file => fs.readFileSync(path.join(__dirname, 'components', file), 'utf8');
let newHeader = header;
if (!/import\s+HeaderThemeMenu\s+from\s+["']@\/components\/HeaderThemeMenu["']/.test(newHeader)) {
  const directive = /(["']use client["'];?)/;
  if (!directive.test(newHeader)) { console.error('HATA: Header import alani bulunamadi.'); process.exit(1); }
  newHeader = newHeader.replace(directive, '$1\nimport HeaderThemeMenu from "@/components/HeaderThemeMenu";');
}
if (!newHeader.includes('<HeaderThemeMenu')) {
  const rightContainer = /<div\s+className=["']medipol-header-right["']\s*>/;
  if (rightContainer.test(newHeader)) {
    newHeader = newHeader.replace(rightContainer, match => match + '\n          <HeaderThemeMenu />');
  } else {
    const bell = /<NotificationBell\b[^>]*\/>/;
    if (!bell.test(newHeader)) {console.error('HATA: Header sag taraf bulunamadi. Hicbir dosya degismedi.');process.exit(1)}
    newHeader = newHeader.replace(bell, match => match + '\n          <HeaderThemeMenu />');
  }
}
// Old fixed panel is hidden across pages, including fullscreen messages.
const cssMarker = '/* F1 MEDIPOL DM V6 — HEADER THEME PICKER */';
let newGlobalCss = fs.readFileSync(globalCssFile, 'utf8');
if (!newGlobalCss.includes(cssMarker)) newGlobalCss += `\n${cssMarker}\n` + `
.global-theme-switcher, .global-theme-switcher * {display:none !important;}
@media(max-width:470px){
 .medipol-header-inner {width:calc(100% - 18px) !important;gap:7px !important;}
 .medipol-header-right {gap:5px !important;}
 .medipol-header-logo {min-width:105px !important;width:105px !important;max-width:105px !important;flex:0 0 105px !important;}
 .medipol-header-logo-art {width:105px !important;min-width:105px !important;max-width:105px !important;}
}
`;
const next = [
  [headerFile,newHeader],
  [messagesFile,source('MessagesClient.tsx')],
  [messageCssFile,source('MessagesClient.module.css')],
  [themeFile,source('HeaderThemeMenu.tsx')],
  [themeCssFile,source('HeaderThemeMenu.module.css')],
  [globalCssFile,newGlobalCss],
];
const changes = next.filter(([target,body]) => !fs.existsSync(target) || fs.readFileSync(target,'utf8')!==body);
if (!changes.length) { console.log('DM V6 zaten kurulu.'); process.exit(0); }
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root,'__f1_dm_v6_yedek',stamp);
const created = [];
try {
  // Do not modify any project files until all backups have been prepared.
  for (const [target] of changes) if (fs.existsSync(target)) {
    const destination = path.join(backup, path.relative(root,target));
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(target,destination);
  }
  for (const [target,body] of changes) {
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,body,'utf8');
    created.push(target);
    console.log('OK:',path.relative(root,target));
  }
} catch(error) {
  for (const target of created.reverse()) {
    const original = path.join(backup,path.relative(root,target));
    if (fs.existsSync(original)) fs.copyFileSync(original,target);
    else fs.rmSync(target,{force:true});
  }
  console.error('HATA: Kurulum geri alindi. ' + error.message); process.exit(1);
}
console.log('\nF1 MEDIPOL DM V6 TAMAMLANDI');
console.log('Yedek:',backup);
console.log('Header: acilir tema secici. Mobil DM: alt sabit tema yok.');
console.log('Mesajlar: 5 sohbet arka plani (uc nokta > Sohbet Arka Plani).');
console.log('Supabase SQL gerekmiyor.\nTest: npm.cmd run build -- --webpack');
