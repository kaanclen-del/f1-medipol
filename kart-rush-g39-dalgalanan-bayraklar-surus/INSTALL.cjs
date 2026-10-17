#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fail=message=>{console.error('\n❌ G3.9 KURULUM DURDU: '+message);process.exit(1);};
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const src=path.join(__dirname,manifest.payload);
const dest=path.join(root,manifest.target);
if(!fs.existsSync(path.join(root,'package.json')))fail('Lütfen VS Code terminalini F1 Medipol proje ana klasöründe aç.');
if(!fs.existsSync(src)||sha(fs.readFileSync(src))!==manifest.new_sha256)fail('ZIP içindeki paket hasarlı veya eksik.');
if(!fs.existsSync(dest))fail('Oyun motoru dosyası bulunamadı: '+manifest.target);
const current=sha(fs.readFileSync(dest));
if(current===manifest.new_sha256){console.log('✅ Graphics 3.9 zaten kurulu; hiçbir dosya değiştirilmedi.');process.exit(0);}
if(current!==manifest.original_sha256){
 fail('engine.ts dosyan mevcut G3.8.1 sürümüyle eşleşmiyor.\n'+
   'Beklenen SHA-256: '+manifest.original_sha256+'\nBulunan SHA-256: '+current+'\n'+
   'Dosyana dokunulmadı. Bu çıktıyı paylaş; uyumlu yama hazırlayalım.');
}
const backup=path.join(root,'.kart-rush-backups','g39-bayrak-direksiyon-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupFile=path.join(backup,manifest.target);
const tmp=dest+'.g39tmp';
let backedUp=false;
try{
 fs.mkdirSync(path.dirname(backupFile),{recursive:true});
 fs.copyFileSync(dest,backupFile);
 backedUp=true;
 fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
 fs.copyFileSync(src,tmp);
 if(sha(fs.readFileSync(tmp))!==manifest.new_sha256)throw new Error('Geçici paket dosyası doğrulanamadı.');
 fs.renameSync(tmp,dest);
 if(sha(fs.readFileSync(dest))!==manifest.new_sha256)throw new Error('Kurulum sonrası dosya doğrulanamadı.');
}catch(e){
 try{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}catch{}
 if(backedUp)try{fs.copyFileSync(backupFile,dest);}catch(restoreError){
  fail('Kurulum başarısız ve geri yükleme de başarısız: '+restoreError.message+'\nYedek: '+backupFile);
 }
 fail('Kurulum güvenli biçimde durdu: '+e.message);
}
console.log('✓ '+manifest.target);
console.log('\n✅ GRAPHICS 3.9 — DALGALANAN BAYRAKLAR + DOĞRU LASTİKLER + YUMUŞAK DÖNÜŞ');
console.log('✓ GPU üzerinde kumaş dalga animasyonu ve daha sık büyük bayraklar');
console.log('✓ Tüm kameralarda A=sol, D=sağ ön lastik görünümü');
console.log('✓ Kademeli direksiyon, daha az sert araç dönüşü');
console.log('✓ Önceki kokpit, pist, takım kaplamaları, şampiyona ve HUD korunur');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
