#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const die=m=>{console.error('\n❌ KURULUM DURDU: '+m);process.exit(1);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pkg=__dirname;
const cfg=path.join(root,'package.json');
if(!fs.existsSync(cfg))die('F1 Medipol proje ana klasöründe çalıştır.');
let json;try{json=JSON.parse(fs.readFileSync(cfg,'utf8'));}catch{die('package.json okunamıyor.');}
if(!json.dependencies?.next&&!json.devDependencies?.next)die('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pkg,'manifest.json'),'utf8'));
const actions=[];
for(const f of manifest.files){
 const dst=path.join(root,f.dest),src=path.join(pkg,'payload',f.asset);
 if(!fs.existsSync(dst))die('Proje dosyası yok: '+f.dest);
 if(!fs.existsSync(src)||sha(fs.readFileSync(src))!==f.newSha)die('Paket eksik / değiştirilmiş: '+f.asset);
 const current=sha(fs.readFileSync(dst));
 if(current!==f.newSha&&!f.allowedOldSha.includes(current))die('Uyumsuz kaynak: '+f.dest+'\nBulunan SHA-256: '+current+'\n3.2 motoru ve 3.1/3.1.1 yarış ekranı / ses dosyası bekleniyor. Henüz hiçbir dosya değiştirilmedi.');
 actions.push({f,dst,src,current,skip:current===f.newSha});
}
const todo=actions.filter(x=>!x.skip);
if(!todo.length){console.log('✅ Kart Rush 3.3 zaten kurulu. Değişiklik yapılmadı.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g33-race-director-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of todo){const target=path.join(backup,a.f.dest);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(a.dst,target);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:todo.map(a=>({dest:a.f.dest,installedSha:a.f.newSha,oldSha:a.current}))},null,2),'utf8');
}catch(e){die('Yedek alınamadı, kurulum iptal: '+e.message);}
const touched=[];
try{
 for(const a of todo){
  const tmp=a.dst+'.g33-tmp';fs.copyFileSync(a.src,tmp);
  if(sha(fs.readFileSync(tmp))!==a.f.newSha)throw Error('Geçici dosya uyuşmuyor.');
  fs.renameSync(tmp,a.dst);touched.push(a);
  console.log('✓ '+a.f.dest);
 }
}catch(e){
 for(const a of touched.reverse())try{fs.copyFileSync(path.join(backup,a.f.dest),a.dst);}catch(err){console.error('Yedek geri yüklenemedi: '+a.f.dest,err.message);}
 die('Kurulum başarısız, dosyalar geri yüklendi: '+e.message);
}
console.log('\n✅ KART RUSH 3.3 — DAHA HIZLI BOTLAR + FREECAM TANITIM + SESLER KURULDU');
console.log('Başlangıç sesleri varsayılan açık; grafik ve şampiyona SQL değişmedi.');
console.log('Yedek: '+backup);
console.log('Şimdi: npm.cmd run build -- --webpack');
