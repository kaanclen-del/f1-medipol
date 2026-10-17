#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd(),pkg=__dirname;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{console.error('\n❌ KURULUM DURDU: '+s);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Komutu F1 Medipol proje kök dizininde çalıştır.');
let project;try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}
catch{fail('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
let manifest;try{manifest=JSON.parse(fs.readFileSync(path.join(pkg,'manifest.json'),'utf8'));}
catch{fail('manifest.json okunamadı.');}
const actions=[];
for(const item of manifest.files){
 const target=path.join(root,item.dest),payload=path.join(pkg,'payload',item.asset);
 if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==item.sha)fail('Paket hasarlı: '+item.asset);
 if(!fs.existsSync(target))fail('Dosya eksik: '+item.dest);
 const current=sha(fs.readFileSync(target));
 if(current!==item.sha && current!==item.allowedOriginalSha)
  fail(item.dest+' beklenen Graphics 2.6/2.7 sürümüyle eşleşmiyor. Mevcut dosya KORUNDU.');
 actions.push({...item,target,payload,skip:current===item.sha});
}
const todo=actions.filter(a=>!a.skip);
if(!todo.length){console.log('✅ Graphics 2.8 zaten kurulu. Hiçbir değişiklik yapılmadı.');process.exit(0);}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','g28-motor-flas-start-'+stamp);
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of todo){
  const to=path.join(backup,a.dest);fs.mkdirSync(path.dirname(to),{recursive:true});
  fs.copyFileSync(a.target,to);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:todo.map(a=>({dest:a.dest,after:a.sha}))},null,2),'utf8');
}catch(e){fail('Yedek oluşturulamadı. Dosyalar değiştirilmedi: '+e.message);}
const applied=[];
try{
 for(const a of todo){
  const temp=a.target+'.g28-tmp';
  fs.copyFileSync(a.payload,temp);
  fs.renameSync(temp,a.target);
  applied.push(a);
  if(sha(fs.readFileSync(a.target))!==a.sha)throw Error('Doğrulama başarısız: '+a.dest);
  console.log('✓ '+a.dest);
 }
}catch(e){
 for(const a of applied.reverse())try{fs.copyFileSync(path.join(backup,a.dest),a.target);}catch(err){console.error('⚠ Geri yükleme hatası: '+a.dest+' '+err.message);}
 fail('Kurulum geri alındı: '+e.message);
}
console.log('\n✅ GRAPHICS 2.8 — 5 SANİYELİK TAM GAZ + GÜÇLÜ FLAŞLAR + 5 START SESİ KURULDU');
console.log('Pist dokuları, takım kaplamaları, şampiyona sistemi ve diğer oyun dosyaları korundu.');
console.log('Yedek: '+backup);
console.log('Sonraki adım: npm.cmd run build -- --webpack');
