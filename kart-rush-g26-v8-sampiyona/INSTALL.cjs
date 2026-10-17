#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd(),folder=__dirname;
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const fail=msg=>{console.error('\n❌ KURULUM DURDURULDU: '+msg);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Komutu F1 Medipol proje ana dizininde çalıştır.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}
catch{fail('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const actions=[];
for(const entry of manifest.files){
 const dest=path.join(root,entry.dest),payload=path.join(folder,'payload',entry.asset);
 if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==entry.sha)fail('Paket eksik veya bozuk: '+entry.asset);
 if(!fs.existsSync(dest))fail('Hedef dosya bulunamadı: '+entry.dest);
 const current=sha(fs.readFileSync(dest));
 if(current!==entry.sha&&!entry.allowedSha.includes(current))
  fail('Beklenen sürümle eşleşmiyor: '+entry.dest+'. G2.5 sonrası değişikliklerin üzerine yazılmadı. Dosyanın güncel halini paylaşabilirsin.');
 actions.push({...entry,dest,payload,skip:current===entry.sha});
}
const todos=actions.filter(a=>!a.skip);
if(!todos.length){console.log('✅ Graphics 2.6 zaten kurulu. Dosyalar korunuyor.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g26-v8-sampiyona-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of todos){const b=path.join(backup,a.dest.slice(root.length+1));fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a.dest,b);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:todos.map(a=>({dest:a.dest.slice(root.length+1),installedSha:a.sha}))},null,2),'utf8');
}catch(e){fail('Yedek alınamadı; hiçbir dosya güncellenmedi: '+e.message);}
const changed=[];
try{
 for(const a of todos){
  const tmp=a.dest+'.g26-tmp';fs.writeFileSync(tmp,fs.readFileSync(a.payload));fs.renameSync(tmp,a.dest);
  changed.push(a);
  if(sha(fs.readFileSync(a.dest))!==a.sha)throw Error('Yazım doğrulaması hatası: '+a.dest);
  console.log('✓ '+a.dest.slice(root.length+1));
 }
}catch(e){
 for(const a of changed.reverse())try{fs.copyFileSync(path.join(backup,a.dest.slice(root.length+1)),a.dest);}catch(error){console.error('UYARI: geri yükleme başarısız: '+error.message);}
 fail('Yükleme tamamlanamadı: '+e.message);
}
console.log('\n✅ KART RUSH GRAPHICS 2.6 — V8 + PUANLI ŞAMPİYONA KURULDU');
console.log('ÖNEMLİ: Supabase > SQL Editor içinde SUPABASE_CHAMPIONSHIP.sql dosyasını BİR KEZ çalıştır.');
console.log('Dosya: '+path.join(folder,'SUPABASE_CHAMPIONSHIP.sql'));
console.log('Yedek: '+backup);
console.log('Ardından: npm.cmd run build -- --webpack');
