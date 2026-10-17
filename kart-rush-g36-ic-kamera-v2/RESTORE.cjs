#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const backupRoot=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backupRoot)){console.error('❌ Yedek klasörü yok.');process.exit(1);}
const dirs=fs.readdirSync(backupRoot).filter(d=>d.startsWith('g36-ic-kamera-v2-')).sort();
if(!dirs.length){console.error('❌ G36 iç kamera yedeği bulunamadı.');process.exit(1);}
const latest=path.join(backupRoot,dirs[dirs.length-1]);
const index=JSON.parse(fs.readFileSync(path.join(latest,'restore-index.json'),'utf8'));
for(const rel of index.files){
 const src=path.join(latest,rel); const dst=path.join(root,rel);
 fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst); console.log('✓ Geri yüklendi: '+rel);
}
console.log('\n↩️ G36 iç kamera paketi geri alındı.');
