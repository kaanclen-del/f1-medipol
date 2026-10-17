#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const backupRoot=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backupRoot)){console.error('❌ Yedek klasörü bulunamadı.');process.exit(1);}
const dirs=fs.readdirSync(backupRoot).filter(name=>name.startsWith('g35-1-kokpit-fix-')).sort();
if(!dirs.length){console.error('❌ Geri alınacak g35.1 yedeği bulunamadı.');process.exit(1);}
const latest=path.join(backupRoot,dirs[dirs.length-1]);
const indexFile=path.join(latest,'restore-index.json');
if(!fs.existsSync(indexFile)){console.error('❌ restore-index.json eksik.');process.exit(1);}
const index=JSON.parse(fs.readFileSync(indexFile,'utf8'));
for(const item of index.files){
 const src=path.join(latest,item.path); const dst=path.join(root,item.path);
 if(!fs.existsSync(src)){console.error('❌ Yedek dosyası eksik: '+item.path);process.exit(1);}
 fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.copyFileSync(src,dst);
 console.log('✓ Geri yüklendi: '+item.path);
}
console.log('\n↩️ KART RUSH 3.5.1 geri alındı.');
