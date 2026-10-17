#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=process.cwd(),base=path.join(root,'.kart-rush-backups');
const die=(s)=>{console.error('❌ '+s);process.exit(1);};
if(!fs.existsSync(base))die('Geri alma yedeği yok.');
const dirs=fs.readdirSync(base).filter(n=>n.startsWith('graphics2-stadyum-v2-3-')).sort();
if(!dirs.length)die('Graphics 2.3 yedeği bulunamadı.');
const dir=path.join(base,dirs[dirs.length-1]),info=JSON.parse(fs.readFileSync(path.join(dir,'restore-index.json'),'utf8'));
const sha=(x)=>crypto.createHash('sha256').update(x).digest('hex');
for(const f of info.files){
 const target=path.join(root,f.dest);
 if(f.existed&&!fs.existsSync(path.join(dir,f.dest)))die('Yedekte eksik dosya: '+f.dest);
 if(fs.existsSync(target)&&sha(fs.readFileSync(target))!==f.installedSha)die(f.dest+' kurulumdan sonra değiştirilmiş. Otomatik geri alma dosyayı koruyarak durdu.');
}
for(const f of info.files){
 const target=path.join(root,f.dest);
 if(f.existed){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(dir,f.dest),target);}
 else if(fs.existsSync(target))fs.unlinkSync(target);
 console.log('↶ '+f.dest);
}
console.log('✅ Graphics 2.3 geri alındı: '+dir);
