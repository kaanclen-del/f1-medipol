'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
function fail(msg){console.error('\n❌ GERİ ALMA DURDU: '+msg);process.exit(1);}
if(!fs.existsSync(path.join(root,'package.json')))fail('Terminali proje ana klasöründe aç.');
const parent=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(parent))fail('Yedek klasörü yok.');
const names=fs.readdirSync(parent).filter(n=>n.startsWith('graphics2-stage1-')&&fs.existsSync(path.join(parent,n,'restore-index.json'))).sort();
if(!names.length)fail('Graphics 2.0 yedeği bulunamadı.');
const backup=path.join(parent,names[names.length-1]);
const {files}=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8'));
for(const file of files){
 const dest=path.join(root,file.path);
 if(!fs.existsSync(dest))fail('Kurulan dosya bulunamadı: '+file.path);
 const current=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
 if(current!==file.installedSha)fail('Kurulumdan sonra değiştirilmiş dosya tespit edildi: '+file.path+'. Üzerine yazılmadı.');
}
for(const file of files){
 const dest=path.join(root,file.path);
 if(file.hadOriginal){fs.copyFileSync(path.join(backup,file.path),dest);}else{fs.unlinkSync(dest);}
 console.log('↩ '+file.path);
}
fs.renameSync(path.join(backup,'restore-index.json'),path.join(backup,'restore-completed.json'));
console.log('✅ Graphics 2.0 Stage 1 geri alındı.');
