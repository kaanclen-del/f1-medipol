#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const sha=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
const fail=(message)=>{console.error('\n❌ G3.9.1 KURULUM DURDU: '+message);process.exit(1)};
if(!fs.existsSync(path.join(root,'package.json')))fail('Lütfen proje ana klasörüne geçin.');
const original=path.join(root,manifest.target);
const payload=path.join(__dirname,manifest.payload);
if(!fs.existsSync(original)||!fs.statSync(original).isFile())fail('engine.ts bulunamadı: '+manifest.target);
if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==manifest.to_sha256)fail('Paket eksik/hasarlı. ZIP dosyasını tekrar çıkarın.');
const current=sha(fs.readFileSync(original));
if(current===manifest.to_sha256){console.log('✅ Graphics 3.9.1 zaten yüklü. Dosya değişmedi.');process.exit(0)}
if(current!==manifest.from_sha256)fail('G3.9 engine.ts bekleniyor; dosyanın SHA-256 değeri eşleşmedi.\nBulunan: '+current+'\nDosyana dokunulmadı.');
const backup=path.join(root,'.kart-rush-backups','g391-steering-'+new Date().toISOString().replace(/[:.]/g,'-'));
const copy=path.join(backup,manifest.target);
const temp=original+'.g391tmp';
let backedUp=false;
try{
 fs.mkdirSync(path.dirname(copy),{recursive:true});
 fs.copyFileSync(original,copy);
 backedUp=true;
 fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
 fs.copyFileSync(payload,temp);
 if(sha(fs.readFileSync(temp))!==manifest.to_sha256)throw new Error('Geçici dosya doğrulanamadı');
 fs.renameSync(temp,original);
 if(sha(fs.readFileSync(original))!==manifest.to_sha256)throw new Error('Kurulum sonrası dosya doğrulanamadı');
}catch(e){
 try{if(fs.existsSync(temp))fs.unlinkSync(temp)}catch{}
 if(backedUp)try{fs.copyFileSync(copy,original)}catch(re){fail('Yedekten geri dönülemedi: '+re.message+' Yedek: '+copy)}
 fail('Hata; varsa değişiklikler geri alındı: '+e.message);
}
console.log('✓ '+manifest.target);
console.log('\n✅ G3.9.1 ESKİ SÜRÜŞ TEPKİSİ GERİ GELDİ');
console.log('G3.9 bayrakları, lastik yönleri, kokpit, pist ve şampiyona korundu.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
