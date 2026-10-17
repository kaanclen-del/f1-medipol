#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n❌ G3.9.3 KURULUM DURDU: '+message);process.exit(1);};
const sha=(content)=>crypto.createHash('sha256').update(content).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce F1 Medipol proje klasörüne geç.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const files=manifest.files.map(entry=>{
 const target=path.join(root,entry.path),source=path.join(__dirname,entry.payload);
 if(!fs.existsSync(target))fail('Proje dosyası eksik: '+entry.path);
 if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==entry.to_sha256)fail('ZIP payload bozuk veya eksik: '+entry.payload);
 const actual=sha(fs.readFileSync(target));
 if(actual!==entry.to_sha256&&!entry.from_sha256.includes(actual))
  fail('Uyumsuz kaynak sürümü: '+entry.path+'\nBulunan SHA-256: '+actual+'\nG3.9.2 engine ve G3.4 venueAudio sürümleri bekleniyor; hiçbir dosya değiştirilmedi.');
 return {...entry,target,source,actual,needed:actual!==entry.to_sha256};
});
const pending=files.filter(f=>f.needed);
if(!pending.length){console.log('✅ G3.9.3 zaten kurulu. Dosyalar değiştirilmedi.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g393-hiz-ai-tribun-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 for(const file of pending){
  const dest=path.join(backup,file.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file.target,dest);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:pending.map(f=>({path:f.path,oldSha:f.actual,newSha:f.to_sha256}))},null,2),'utf8');
}catch(e){fail('Kurulum öncesi yedek oluşturulamadı. Hiçbir şey değiştirilmedi: '+e.message);}
const changed=[];
try{
 for(const file of pending){
  const temp=file.target+'.g393-tmp';
  fs.copyFileSync(file.source,temp);
  if(sha(fs.readFileSync(temp))!==file.to_sha256)throw Error('Kopyalama hatası: '+file.path);
  fs.renameSync(temp,file.target);
  changed.push(file);
  if(sha(fs.readFileSync(file.target))!==file.to_sha256)throw Error('Yazma doğrulaması hatası: '+file.path);
  console.log('✓ '+file.path);
 }
}catch(e){
 for(const file of changed.reverse())try{fs.copyFileSync(path.join(backup,file.path),file.target);}catch(err){console.error('Geri yükleme başarısız, yedeği kullan:',backup,err.message);}
 fail('Dosyalar mümkün olduğunca eskiye döndürüldü: '+e.message);
}
console.log('\n✅ G3.9.3 — HIZ, RAKİP DENGESİ VE TRİBÜN SESİ KURULDU');
console.log('280 km/sa standart ve uzun; hızlı yarış 300 km/sa, turbo daha yüksek.');
console.log('AI düz yol ve viraj temposu artırıldı; tribün geçişlerinde kalabalık + alkış.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
