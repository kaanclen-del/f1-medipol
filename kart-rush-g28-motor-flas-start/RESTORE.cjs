#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const die=s=>{console.error('\n❌ GERİ ALMA DURDU: '+s);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))die('Proje kök klasörünü aç.');
const folder=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(folder))die('Yedek klasörü bulunamadı.');
const names=fs.readdirSync(folder).filter(s=>s.startsWith('g28-motor-flas-start-')).sort();
if(!names.length)die('Graphics 2.8 yedeği bulunamadı.');
const latest=path.join(folder,names[names.length-1]);
const index=path.join(latest,'restore-index.json');
if(!fs.existsSync(index))die('Yedek indeksi eksik.');
const info=JSON.parse(fs.readFileSync(index,'utf8'));
for(const item of info.files){
 const dst=path.join(root,item.dest),bak=path.join(latest,item.dest);
 if(!fs.existsSync(bak))die('Yedek dosya yok: '+item.dest);
 if(!fs.existsSync(dst)||sha(fs.readFileSync(dst))!==item.after)
  die(item.dest+' kurulumdan sonra değişmiş. Sonraki düzenlemeyi korumak için geri alma durduruldu.');
}
for(const item of info.files){
 const dst=path.join(root,item.dest),bak=path.join(latest,item.dest);
 fs.copyFileSync(bak,dst);console.log('✓ Geri yüklendi: '+item.dest);
}
console.log('\n✅ Graphics 2.8 geri alındı: '+latest);
