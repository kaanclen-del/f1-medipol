#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const pack=__dirname;
const die=(message)=>{console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);};
const sha=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))die('Komutu F1 Medipol proje ana klasöründe çalıştır.');
let project;try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{die('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)die('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const actions=[];
for(const f of manifest.files){
 const file=path.join(root,f.dest),payload=path.join(pack,'payload',f.asset);
 if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==f.sha)die('Paket bozuk veya eksik: '+f.asset);
 const exists=fs.existsSync(file),now=exists?sha(fs.readFileSync(file)):null;
 if(now===f.sha){actions.push({...f,file,payload,exists,skip:true});continue;}
 if(f.allowedOriginalSha && now!==f.allowedOriginalSha)
  die(f.dest+' mevcut sürümle eşleşmiyor. Başka oyun değişikliklerinin üzerine yazmamak için dosyalar korunuyor.');
 if(f.dest==='components/kart-rush/venueAudio.ts'&&exists)
  die('venueAudio.ts zaten mevcut ama bu paketten farklı. Dosya üzerine yazılmadı.');
 actions.push({...f,file,payload,exists,skip:false});
}
const todos=actions.filter(a=>!a.skip);
if(!todos.length){console.log('✅ Graphics 2.3 zaten kurulu, dosya değişmedi.');process.exit(0);}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','graphics2-stadyum-v2-3-'+stamp);
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of todos)if(a.exists){const to=path.join(backup,a.dest);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(a.file,to);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:todos.map(a=>({dest:a.dest,existed:a.exists,installedSha:a.sha}))},null,2),'utf8');
}catch(e){die('Yedek alınamadı; kurulum yapılmadı: '+e.message);}
const changed=[];
try{
 for(const a of todos){
  fs.mkdirSync(path.dirname(a.file),{recursive:true});
  const temp=a.file+'.g23-tmp';
  fs.writeFileSync(temp,fs.readFileSync(a.payload));
  fs.renameSync(temp,a.file);
  changed.push(a);
  if(sha(fs.readFileSync(a.file))!==a.sha)throw Error('Yazım doğrulaması başarısız: '+a.dest);
  console.log('✓ '+a.dest);
 }
}catch(e){
 for(const a of changed.reverse())try{
  if(a.exists)fs.copyFileSync(path.join(backup,a.dest),a.file);
  else if(fs.existsSync(a.file))fs.unlinkSync(a.file);
 }catch(error){console.error('⚠ Geri alma hatası: '+a.dest+' '+error.message);}
 die('Yazma sorunu, değişiklikler geri alındı: '+e.message);
}
console.log('\n✅ GRAPHICS 2.3 — BÜYÜK TRİBÜNLER + DOKULAR + KAMERA SESİ KURULDU');
console.log('Asfalt + normal doku atlasları geri geldi; orman/dağ yerine tribün ve pit kompleksi var.');
console.log('Kamera flaşları yaklaşınca yanıp söner, sessiz kalmayacak şekilde ayrı ambiyans modülü eklendi.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
