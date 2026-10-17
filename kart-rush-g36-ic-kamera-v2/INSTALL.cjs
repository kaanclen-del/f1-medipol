#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(m)=>{console.error('\n❌ KURULUM DURDU: '+m);process.exit(1);};
const sha=(buf)=>crypto.createHash('sha256').update(buf).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce F1 Medipol proje klasörünün kökünde terminal aç.');
let pkg; try{pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{fail('package.json okunamadı.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const item=manifest.files[0];
const target=path.join(root,item.path);
const source=path.join(__dirname,'payload',item.asset);
if(!fs.existsSync(target))fail('Proje dosyası bulunamadı: '+item.path);
if(!fs.existsSync(source))fail('Paket eksik: '+item.asset);
const sourceSha=sha(fs.readFileSync(source));
if(sourceSha!==item.sha256)fail('Paket doğrulaması başarısız. ZIP dosyasını yeniden aç.');
const currentSha=sha(fs.readFileSync(target));
if(currentSha===item.sha256){console.log('✅ İç kamera paketi zaten kurulu.');process.exit(0);}
if(!item.allowedOriginalSha256.includes(currentSha)){
 fail('Uyumsuz kaynak sürümü: '+item.path+'\nBulunan SHA-256: '+currentSha+'\nMevcut dosyada önceki elle değişiklikler olabilir. Üzerine yazılmadı.');
}
const backup=path.join(root,'.kart-rush-backups','g36-ic-kamera-v2-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(path.dirname(path.join(backup,item.path)),{recursive:true});
fs.copyFileSync(target,path.join(backup,item.path));
fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:[item.path]},null,2),'utf8');
const tmp=target+'.g36tmp';
fs.copyFileSync(source,tmp);
if(sha(fs.readFileSync(tmp))!==item.sha256){try{fs.unlinkSync(tmp);}catch{} fail('Geçici dosya doğrulaması başarısız oldu.');}
fs.renameSync(tmp,target);
console.log('✓ '+item.path);
console.log('\n✅ GRAPHICS 3.6 — ÇİFT KOKPİT KAMERA KURULDU');
console.log('Yeni iç açılar: HALO KOKPİT + SÜRÜCÜ KOKPİTİ');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
