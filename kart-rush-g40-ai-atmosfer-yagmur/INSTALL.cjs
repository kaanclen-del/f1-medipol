#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n[ERROR] G40 KURULUM DURDU: '+message);process.exit(1);};
const sha=(content)=>crypto.createHash('sha256').update(content).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Once F1 Medipol proje klasorune gec.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const files=manifest.files.map(entry=>{
 const target=path.join(root,entry.path),source=path.join(__dirname,entry.payload);
 if(!fs.existsSync(target))fail('Proje dosyasi eksik: '+entry.path);
 if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==entry.to_sha256)fail('ZIP payload bozuk veya eksik: '+entry.payload);
 const actual=sha(fs.readFileSync(target));
 if(actual!==entry.to_sha256&&!entry.from_sha256.includes(actual))
  fail('Uyumsuz kaynak surumu: '+entry.path+'\nBulunan SHA-256: '+actual+'\nBu paket G3.9.3 surumundeki engine.ts uzerine kuruluyor; hicbir dosya degistirilmedi.');
 return {...entry,target,source,actual,needed:actual!==entry.to_sha256};
});
const pending=files.filter(f=>f.needed);
if(!pending.length){console.log('[OK] G40 zaten kurulu. Dosyalar degistirilmedi.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g40-ai-atmosfer-yagmur-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 for(const file of pending){
  const dest=path.join(backup,file.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file.target,dest);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:pending.map(f=>({path:f.path,oldSha:f.actual,newSha:f.to_sha256}))},null,2),'utf8');
}catch(e){fail('Kurulum oncesi yedek olusturulamadi. Hicbir sey degistirilmedi: '+e.message);}
const changed=[];
try{
 for(const file of pending){
  const temp=file.target+'.g40-tmp';
  fs.copyFileSync(file.source,temp);
  if(sha(fs.readFileSync(temp))!==file.to_sha256)throw Error('Kopyalama hatasi: '+file.path);
  fs.renameSync(temp,file.target);
  changed.push(file);
  if(sha(fs.readFileSync(file.target))!==file.to_sha256)throw Error('Yazma dogrulamasi hatasi: '+file.path);
  console.log('✓ '+file.path);
 }
}catch(e){
 for(const file of changed.reverse()){
  try{fs.copyFileSync(path.join(backup,file.path),file.target);}catch(err){console.error('Geri yukleme basarisiz, yedegi kullan:',backup,err.message);}
 }
 fail('Dosyalar mumkun oldugunca eskiye donduruldu: '+e.message);
}
console.log('\n[OK] G40 - AI HIZ DENGESI + YAGMUR/SIS ATMOSFERI KURULDU');
console.log('AI araclari oyuncuya daha yakin duzluk hizlari goruyor ve daha canli hizlaniyor.');
console.log('Yagmurda daha yogun sis, daha guclu yagmur cizgileri ve ekrana dusen su damlasi/lens efekti var.');
console.log('Kuru havada da yeni uzaklik sisi ve daha sinematik atmosfer eklendi.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
