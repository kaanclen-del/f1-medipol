'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const backups = path.join(root,'.arcade-backups');
if (!fs.existsSync(backups)) { console.error('❌ Arcade yedeği bulunamadı.'); process.exit(1); }
const folders = fs.readdirSync(backups).filter(name=>name.startsWith('vitrin-') && fs.existsSync(path.join(backups,name,'backup-info.json'))).sort().reverse();
if (!folders.length) { console.error('❌ Geri alınabilir Arcade yedeği bulunamadı.'); process.exit(1); }
const folder = path.join(backups,folders[0]);
const info = JSON.parse(fs.readFileSync(path.join(folder,'backup-info.json'),'utf8'));
const target = info.targetDir;
if (!path.relative(root,target).startsWith('..') && path.isAbsolute(target)) {
 fs.copyFileSync(path.join(folder,'page.tsx'),path.join(target,'page.tsx'));
 const cssTarget = path.join(target,'arcade.module.css');
 if(info.hadCss) fs.copyFileSync(path.join(folder,'arcade.module.css'),cssTarget);
 else if(fs.existsSync(cssTarget)) fs.unlinkSync(cssTarget);
 console.log('✅ Önceki Arcade görünümü geri yüklendi. Yedek:',folder);
} else { console.error('❌ Yedek başka bir proje yoluna ait görünüyor. İşlem yapılmadı.'); process.exit(1); }
