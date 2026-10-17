'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const backupRoot = path.join(root,'.arcade-backups');
if(!fs.existsSync(backupRoot)){console.error('❌ Header onarım yedeği bulunamadı.'); process.exit(1);}
const dirs = fs.readdirSync(backupRoot).filter(name=>name.startsWith('header-onarimi-') && fs.existsSync(path.join(backupRoot,name,'restore-info.json'))).sort().reverse();
if(!dirs.length){console.error('❌ Geri alınabilecek Header yedeği bulunamadı.'); process.exit(1);}
const dir = path.join(backupRoot,dirs[0]);
const info = JSON.parse(fs.readFileSync(path.join(dir,'restore-info.json'),'utf8'));
const relative = path.relative(root,info.pageFile);
if(!relative || relative.startsWith('..') || path.isAbsolute(relative) || !['app/arcade/page.tsx','src/app/arcade/page.tsx'].includes(relative.replace(/\\/g,'/'))){console.error('❌ Hedef bu projeye ait değil, işlem durduruldu.'); process.exit(1);}
fs.copyFileSync(path.join(dir,'page.tsx'),info.pageFile);
console.log('✅ Header değişikliği geri alındı.');
