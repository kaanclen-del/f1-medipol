'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function die(msg){console.error('\n❌ GRAPHICS 2.0 KURULUM DURDU: '+msg);process.exit(1);}
if(!fs.existsSync(path.join(root,'package.json')))die('Komutu f1-medipol proje ana klasöründe çalıştır.');
let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{die('package.json okunamadı.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)die('Next.js uygulaması bulunamadı.');
const actions=[];
for(const item of manifest.files){
 const target=path.join(root,item.path),payload=path.join(__dirname,'payload',item.asset);
 if(!fs.existsSync(payload)||digest(fs.readFileSync(payload))!==item.sha)die('Paket dosyası eksik veya bozuk: '+item.asset);
 const exists=fs.existsSync(target);
 if(item.originalSha&&!exists)die('Gerekli kaynak dosyası bulunamadı: '+item.path);
 const current=exists?digest(fs.readFileSync(target)):null;
 if(current===item.sha){actions.push({...item,target,exists,skip:true});continue;}
 if(item.originalSha&&current!==item.originalSha){
  die(item.path+' beklenen kaynak sürümünden farklı. Çalışan oyunun üzerine eski kod yazmamak için durdum. Güncel kart-rush klasörünü yeniden yükle.');
 }
 actions.push({...item,target,exists,skip:false});
}
const todo=actions.filter(a=>!a.skip);
if(todo.length===0){console.log('✅ Graphics 2.0 Stage 1 zaten kurulu. Dosya değişmedi.');process.exit(0);}
// Backup all files that will change before writing any of them.
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','graphics2-stage1-'+stamp);
const index=[];
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of todo){
  const entry={path:a.path,hadOriginal:a.exists,installedSha:a.sha};
  if(a.exists){const dest=path.join(backup,a.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(a.target,dest);}
  index.push(entry);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:index},null,2),'utf8');
}catch(e){die('Yedekleme başarısız. Hiçbir kaynak dosyası değiştirilmedi. '+e.message);}
const changed=[];
try{
 for(const a of todo){
  fs.mkdirSync(path.dirname(a.target),{recursive:true});
  const buf=fs.readFileSync(path.join(__dirname,'payload',a.asset));
  fs.writeFileSync(a.target,buf);
  if(digest(fs.readFileSync(a.target))!==a.sha)throw Error('Yazılan dosya doğrulanamadı: '+a.path);
  changed.push(a);
  console.log('✓ '+a.path);
 }
}catch(e){
 for(const a of changed.reverse()){
  try{if(a.exists)fs.copyFileSync(path.join(backup,a.path),a.target);else fs.unlinkSync(a.target);}catch(err){console.error('⚠ Geri alma hatası: '+a.path+' '+err.message);}
 }
 die('Dosya yazma hatası, mümkün olanlar geri alındı. '+e.message);
}
console.log('\n✅ KART RUSH GRAPHICS 2.0 — STAGE 1 KURULDU');
console.log('Yeni: 2 doku atlası, shader materyalleri, gelişmiş aerodinamik detaylar.');
console.log('Oyun fiziği, sesler, online lobi ve finiş mantığı değişmedi.');
console.log('Yedek: '+backup);
console.log('Şimdi çalıştır: npm.cmd run build -- --webpack');
