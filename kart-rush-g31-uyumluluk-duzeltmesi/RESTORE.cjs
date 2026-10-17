#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=process.cwd(),base=path.join(root,'.kart-rush-backups');
const die=msg=>{console.error('❌ '+msg);process.exit(1);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(base))die('Yedek klasörü bulunamadı.');
const names=fs.readdirSync(base).filter(n=>n.startsWith('g31-uyumluluk-duzeltmesi-')).sort();
if(!names.length)die('Graphics 3.1.1 yedeği bulunamadı.');
const folder=path.join(base,names[names.length-1]);
const info=JSON.parse(fs.readFileSync(path.join(folder,'restore-index.json'),'utf8'));
for(const item of info.files){
 const dest=path.join(root,item.dest),from=path.join(folder,item.dest);
 if(!fs.existsSync(from)||!fs.existsSync(dest))die('Geri alma dosyası eksik: '+item.dest);
 if(sha(fs.readFileSync(dest))!==item.installedSha)die('Kurulum sonrası düzenlenmiş dosya: '+item.dest+'; üzerine yazılmadı.');
}
for(const item of info.files){fs.copyFileSync(path.join(folder,item.dest),path.join(root,item.dest));console.log('✓ Geri alındı: '+item.dest);}
console.log('✅ 3.1.1 geri alındı. Yedek: '+folder);
console.log('Not: SQL değişiklikleri geri alınmaz.');
