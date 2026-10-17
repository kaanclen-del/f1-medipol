#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const https=require('node:https');
const root=process.cwd(),pkg=__dirname;
const fail=(s)=>{console.error('\n❌ Kurulum durduruldu: '+s);process.exitCode=1;};
const hash=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const SOURCE='https://upload.wikimedia.org/wikipedia/commons/f/f5/Williams-Cosworth_FW32_%282010%29.ogg';
function download(url,depth=0){
 return new Promise((resolve,reject)=>{
  if(depth>3)return reject(Error('Çok fazla yönlendirme'));
  const req=https.get(url,{timeout:18000,headers:{'User-Agent':'F1MedipolKartRush/2.7 (CC-BY-SA audio integration; educational game)','Accept':'audio/ogg,application/ogg,*/*'}},res=>{
   const status=res.statusCode||0;
   if([301,302,303,307,308].includes(status)&&res.headers.location){
    const next=new URL(res.headers.location,url);
    res.resume();if(next.protocol!=='https:')return reject(Error('HTTPS yönlendirmesi bekleniyor'));
    return download(next.href,depth+1).then(resolve,reject);
   }
   if(status!==200){res.resume();return reject(Error('HTTP '+status));}
   const chunks=[];let size=0;
   res.on('data',x=>{size+=x.length;if(size>16000000){req.destroy(Error('Ses dosyası aşırı büyük'));return;}chunks.push(x);});
   res.on('end',()=>{const out=Buffer.concat(chunks);if(out.length<10000||out.subarray(0,4).toString()!=='OggS')reject(Error('İndirilen dosya OGG değil'));else resolve(out);});
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('İndirme zaman aşımı')));
  req.on('error',reject);
 });
}
async function main(){
 if(!fs.existsSync(path.join(root,'package.json')))throw Error('Terminali F1 Medipol proje kök dizininde aç.');
 let packageJson;try{packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{throw Error('package.json okunamadı');}
 if(!packageJson.dependencies?.next&&!packageJson.devDependencies?.next)throw Error('Next.js projesi doğrulanamadı');
 const manifest=JSON.parse(fs.readFileSync(path.join(pkg,'manifest.json'),'utf8'));
 const soundFile='components/kart-rush/sound.ts', clientFile='components/kart-rush/KartRushClient.tsx';
 const soundPath=path.join(root,soundFile),clientPath=path.join(root,clientFile);
 if(!fs.existsSync(soundPath)||!fs.existsSync(clientPath))throw Error('Kart Rush ses veya menü dosyası bulunamadı');
 const sh=hash(fs.readFileSync(soundPath)),ch=hash(fs.readFileSync(clientPath));
 const soundOK=sh===manifest.sound.new||manifest.sound.old.includes(sh);
 if(!soundOK)throw Error('sound.ts beklenen Graphics 2.5 / 2.6 sürümünde değil. Mevcut özel değişiklikler korunuyor.');
 let cv='';
 for(const [version,item] of Object.entries(manifest.client))if(ch===item.old||ch===item.new){cv=version;break;}
 if(!cv)throw Error('KartRushClient.tsx tanınmayan sürüm. Üzerine yazılmadı.');
 const entries=[
  {dest:soundFile,from:'sound.payload',want:manifest.sound.new},
  {dest:clientFile,from:'client-'+cv+'.payload',want:manifest.client[cv].new}
 ];
 for(const e of entries){
  e.target=path.join(root,e.dest);e.input=path.join(pkg,'payload',e.from);
  if(!fs.existsSync(e.input)||hash(fs.readFileSync(e.input))!==e.want)throw Error('Paket bütünlüğü hatası: '+e.from);
  e.skip=hash(fs.readFileSync(e.target))===e.want;
 }
 const audioDest='public/kart-rush/audio/f1-v8-fw32-2010.ogg';
 const attrDest='public/kart-rush/audio/ATTRIBUTION.txt';
 const audioPath=path.join(root,audioDest),attrPath=path.join(root,attrDest);
 const attr=fs.readFileSync(path.join(pkg,'ATTRIBUTION.txt'));
 if(fs.existsSync(attrPath)&&hash(fs.readFileSync(attrPath))!==hash(attr))throw Error('ATTRIBUTION.txt dosyası farklı: üzerine yazılmadı.');
 if(fs.existsSync(audioPath)&&fs.readFileSync(audioPath).subarray(0,4).toString()!=='OggS')throw Error('Mevcut F1 ses dosyası geçersiz: üzerine yazılmadı.');
 if(entries.every(e=>e.skip)&&fs.existsSync(attrPath)&&fs.existsSync(audioPath)){
  console.log('✅ Graphics 2.7 zaten kurulu. Değişiklik yapılmadı.');return;
 }
 let audio=null;
 if(!fs.existsSync(audioPath)){
  if(process.env.KR_SKIP_AUDIO_DOWNLOAD!=='1'){
   console.log('Gerçek 2010 F1 V8 kaydı indiriliyor (Wikimedia Commons)...');
   try{audio=await download(SOURCE);console.log('✓ Ses kaydı indirildi: '+(audio.length/1024/1024).toFixed(2)+' MB');}
   catch(e){console.warn('⚠ Ses kaydı indirilemedi ('+e.message+'). Oyun çevrimiçi kaynağı ve yedek sesi deneyecek.');}
  }else console.log('Test modu: dosya indirme atlandı.');
 }
 const targets=[...entries.filter(e=>!e.skip).map(e=>e.dest)];
 if(!fs.existsSync(attrPath))targets.push(attrDest);
 if(audio)targets.push(audioDest);
 if(!targets.length){console.log('✅ Kod güncel; gerçek ses dosyası mevcut değil. Ses kaynağı çevrim içi denenir.');return;}
 const backup=path.join(root,'.kart-rush-backups','g27-gercek-v8-'+new Date().toISOString().replace(/[:.]/g,'-'));
 const original=[];
 try{
  fs.mkdirSync(backup,{recursive:true});
  for(const dest of targets){
   const full=path.join(root,dest),existed=fs.existsSync(full);
   const before=existed?hash(fs.readFileSync(full)):null;
   if(existed){const destBackup=path.join(backup,dest);fs.mkdirSync(path.dirname(destBackup),{recursive:true});fs.copyFileSync(full,destBackup);}
   original.push({dest,existed,before});
  }
  const undo=()=>{
   for(const o of original){
    const dest=path.join(root,o.dest),bak=path.join(backup,o.dest);
    try{if(o.existed)fs.copyFileSync(bak,dest);else if(fs.existsSync(dest))fs.unlinkSync(dest);}catch(err){console.error('Geri yükleme sorunu:',o.dest,err.message);}
   }
  };
  try{
   for(const e of entries.filter(x=>!x.skip)){
    fs.copyFileSync(e.input,e.target);
    if(hash(fs.readFileSync(e.target))!==e.want)throw Error('Yazım doğrulaması başarısız: '+e.dest);
    console.log('✓ '+e.dest);
   }
   fs.mkdirSync(path.dirname(attrPath),{recursive:true});
   if(!fs.existsSync(attrPath)){fs.writeFileSync(attrPath,attr);console.log('✓ '+attrDest);}
   if(audio){fs.writeFileSync(audioPath,audio);console.log('✓ '+audioDest);}
   fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:original.map(o=>({...o,after:fs.existsSync(path.join(root,o.dest))?hash(fs.readFileSync(path.join(root,o.dest))):null}))},null,2),'utf8');
  }catch(err){undo();throw err;}
 }catch(err){throw Error('Dosyalar yedekten geri alındı: '+err.message);}
 console.log('\n✅ GRAPHICS 2.7 — GERÇEK F1 V8 SES YÜKLENDİ');
 console.log('Sert osilatörler kaldırıldı, 2010 F1 V8 kaydı + yumuşak yedek motor sesi ayarlandı.');
 console.log('Yedek: '+backup);
 if(!fs.existsSync(audioPath))console.log('⚠ Gerçek kaydı yerel olarak almak için README.txt içindeki elle indirme adımını uygula.');
 console.log('Build: npm.cmd run build -- --webpack');
}
main().catch(e=>fail(e.message));
