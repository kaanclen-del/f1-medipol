#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const fail=s=>{console.error('[HATA] G6.2.2: '+s);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Next.js proje kokunde calistir.');
let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{fail('package.json okunamiyor.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)fail('Bu bir Next.js proje kokunu gibi gorunmuyor.');
const files=[];
for(const [kind,rel] of Object.entries(meta.targets)){
 const abs=path.resolve(root,rel);
 if(!abs.startsWith(root+path.sep))fail('Gecersiz dosya yolu: '+rel);
 if(!fs.existsSync(abs))fail('Kaynak dosya bulunamadi: '+rel);
 const source=fs.readFileSync(abs,'utf8');
 const info=meta.files[kind];
 const payloadFile=path.join(__dirname,'payload',info.payload);
 if(!fs.existsSync(payloadFile))fail('ZIP bozuk: '+info.payload);
 const next=fs.readFileSync(payloadFile,'utf8');
 if(sha(next)!==info.newSha)fail('ZIP dogrulama hatasi: '+info.payload);
 files.push({kind,rel,abs,source,next,sourceSha:sha(source),info});
}
const completed=files.filter(f=>f.sourceSha===f.info.newSha).length;
if(completed===files.length){console.log('[OK] G6.2.2 zaten kurulu. Tekrar islem yapilmadi.');process.exit(0);}
if(completed)fail('Kismi kurulum bulundu. Orijinal dosyalar korunuyor. Degisiklik yapilmadi.');
for(const f of files){
 if(f.sourceSha!==f.info.originalSha)fail(f.rel+' dosyasi bu ZIP icin beklenen surumde degil.\nBulunan: '+f.sourceSha+'\nBeklenen: '+f.info.originalSha+'\nHicbir dosya degistirilmedi.');
}
const base=path.join(root,'.kart-rush-backups');fs.mkdirSync(base,{recursive:true});
const backup=fs.mkdtempSync(path.join(base,'g622-iphone-exact-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
try{
 for(const f of files){const backupPath=path.join(backup,f.rel);fs.mkdirSync(path.dirname(backupPath),{recursive:true});fs.copyFileSync(f.abs,backupPath);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({version:meta.version,files:files.map(f=>({rel:f.rel,originalSha:f.info.originalSha,newSha:f.info.newSha}))},null,2));
 for(const f of files)if(sha(fs.readFileSync(path.join(backup,f.rel),'utf8'))!==f.info.originalSha)throw Error('Yedek bozuk: '+f.rel);
}catch(e){fail('Yedek olusturulamadi. Degisiklik yapilmadi: '+e.message);}
const written=[];
try{
 for(const f of files){
  const eol=f.source.includes('\r\n')?'\r\n':'\n';
  const next=f.next.replace(/\n/g,eol);
  const temp=f.abs+'.g622-writing';
  try{
   fs.writeFileSync(temp,next,'utf8');
   if(sha(fs.readFileSync(temp,'utf8'))!==f.info.newSha)throw Error('Hash kontrolu basarisiz');
   fs.renameSync(temp,f.abs);
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  written.push(f);
 }
}catch(e){
 for(const f of written)try{fs.copyFileSync(path.join(backup,f.rel),f.abs);}catch{}
 fail('Yazma basarisiz, onceki dosyalar geri yüklendi. '+e.message);
}
console.log('[OK] G6.2.2 mevcut F1 Medipol koduna kuruldu.');
console.log('Guncellenenler: '+files.map(f=>f.rel).join(', '));
console.log('Yedek: '+backup);
console.log('SIMDI: npm.cmd run build -- --webpack');
