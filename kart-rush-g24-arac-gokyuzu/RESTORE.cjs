#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const die=(message)=>{console.error('\n❌ GERİ ALMA DURDU: '+message);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))die('Komutu F1 Medipol proje ana klasöründe çalıştır.');
const backupsDir=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backupsDir))die('Yedek klasörü bulunamadı.');
const candidates=fs.readdirSync(backupsDir).filter(name=>name.startsWith('graphics2-arac-gokyuzu-v2-4-')).sort();
if(!candidates.length)die('Graphics 2.4 için geri alınacak yedek bulunamadı.');
const latest=path.join(backupsDir,candidates[candidates.length-1]);
const indexFile=path.join(latest,'restore-index.json');
if(!fs.existsSync(indexFile))die('Yedek index dosyası eksik.');
const info=JSON.parse(fs.readFileSync(indexFile,'utf8'));
for(const item of info.files){
 const backupFile=path.join(latest,item.backup);
 const dest=path.join(root,item.dest);
 if(!fs.existsSync(backupFile))die('Yedek dosyası eksik: '+item.backup);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(backupFile,dest);
 console.log('✓ Geri yüklendi: '+item.dest);
}
console.log('\n✅ Graphics 2.4 geri alındı. Kaynak yedek: '+latest);
