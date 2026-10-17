#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=process.cwd(),base=path.join(root,'.kart-rush-backups');
const die=(s)=>{console.error('❌ '+s);process.exit(1);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(base))die('Yedek klasörü bulunamadı.');
const dirs=fs.readdirSync(base).filter(x=>x.startsWith('g31-ai-yagmur-guc-')).sort();
if(!dirs.length)die('Graphics 3.1 yedeği bulunamadı.');
const dir=path.join(base,dirs[dirs.length-1]);
const info=JSON.parse(fs.readFileSync(path.join(dir,'restore-index.json'),'utf8'));
for(const item of info.files){
 const dest=path.join(root,item.dest),source=path.join(dir,item.dest);
 if(!fs.existsSync(source)||!fs.existsSync(dest))die('Geri alma dosyası eksik: '+item.dest);
 if(sha(fs.readFileSync(dest))!==item.installedSha)die('G3.1 sonrasında değişmiş dosya var: '+item.dest+' - güvenlik nedeniyle geri alınmadı.');
}
for(const item of info.files){
 fs.copyFileSync(path.join(dir,item.dest),path.join(root,item.dest));
 console.log('✓ Geri alındı: '+item.dest);
}
console.log('✅ Graphics 3.1 dosyaları geri alındı: '+dir);
console.log('Not: Supabase üzerinde çalıştırılan SQL geri alınmadı; eski sürüme engel olmaz.');
