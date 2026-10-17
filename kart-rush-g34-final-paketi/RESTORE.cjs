#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n❌ GERİ ALMA DURDU: '+message);process.exit(1);};
const dir=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(dir))fail('Yedek klasörü bulunamadı.');
const names=fs.readdirSync(dir).filter(n=>n.startsWith('g34-final-')).sort();
if(!names.length)fail('Graphics 3.4 yedeği bulunamadı.');
const backup=path.join(dir,names[names.length-1]);
const index=path.join(backup,'restore-index.json');
if(!fs.existsSync(index))fail('Geri alma dosyası eksik.');
const data=JSON.parse(fs.readFileSync(index,'utf8'));
const digest=(f)=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
// Avoid wiping any edits made since installation.
for(const a of data.files){
 const dst=path.join(root,a.path),saved=path.join(backup,a.path);
 if(!fs.existsSync(saved))fail('Eksik yedek: '+a.path);
 if(!fs.existsSync(dst)||digest(dst)!==a.installedSha)fail('Bu dosya 3.4 sonrası değişmiş; güvenli geri alma için durduruldu: '+a.path);
}
for(const a of data.files){
 const dst=path.join(root,a.path),saved=path.join(backup,a.path);
 fs.copyFileSync(saved,dst);console.log('✓ Geri yüklendi: '+a.path);
}
console.log('\n✅ Graphics 3.4 geri alındı. Yedek: '+backup);
