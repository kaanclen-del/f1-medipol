#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),meta=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const fail=(s)=>{console.error('\n[HATA] G6.2 KURULUM DURDURULDU: '+s);process.exit(1);};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const clean=s=>s.replace(/\r\n/g,'\n');
const cssPatch=fs.readFileSync(path.join(__dirname,'payload/css.patch'),'utf8');
const enginePayload=fs.readFileSync(path.join(__dirname,'payload/engine.payload'),'utf8');
const rules=JSON.parse(fs.readFileSync(path.join(__dirname,'payload/client-rules.json'),'utf8'));
if(!fs.existsSync('package.json'))fail('Komutlari Next.js proje kokunde calistir.');
const pj=JSON.parse(fs.readFileSync('package.json','utf8'));
if(!pj.dependencies?.next&&!pj.devDependencies?.next)fail('Next.js proje kokunde degilsin.');
if(sha(enginePayload)!==meta.engineTargetSha)fail('ZIP motor payload hash uyusmazligi.');
const destinations={};
for(const [key,rel] of Object.entries(meta.targets)){
 const abs=path.join(root,rel);if(!fs.existsSync(abs))fail('Eksik dosya: '+rel);
 destinations[key]={abs,rel,raw:fs.readFileSync(abs,'utf8')};
}
const engine=clean(destinations.engine.raw),track=clean(destinations.client.raw),css=clean(destinations.css.raw);
const engineHash=sha(engine),installedEngine=engineHash===meta.engineTargetSha;
const installedUI=track.includes('GRAFİK KALİTESİ</strong>')&&css.includes('G6.2 — iPhone/Android:');
if(installedEngine&&installedUI){console.log('[OK] G6.2 zaten kurulu; tekrar islem yapilmadi.');process.exit(0);}
if(installedEngine||installedUI)fail('Kismi G6.2 kurulumu algilandi. Otomatik uzerine yazilmiyor, destek icin dosyalari gonder.');
if(engineHash!==meta.engineSourceSha)fail('Motor G6.1 kaynak surumuyle uyusmuyor!\nBulunan SHA256: '+engineHash+'\nBeklenen: '+meta.engineSourceSha+'\nOnce G6.1 kurulu olmali.');
let patchedTrack=track;
for(const {old, new:next} of rules){
 const hits=patchedTrack.split(old).length-1;
 if(hits!==1)fail('KartRushTrack.tsx mevcut arayuzu bu paketle farkli!\nBeklenen kod bulunamadi veya tekrarlandi: '+old.slice(0,95)+'\nAsil dosyalar korunuyor.');
 patchedTrack=patchedTrack.replace(old,next);
}
const originals={engine:engine,client:track,css:css};
const replacements={engine:enginePayload,client:patchedTrack,css:css.trimEnd()+'\n\n'+cssPatch+'\n'};
for(const [k,value] of Object.entries(replacements))if(!value||value.length<500)fail('Beklenmedik bos dosya: '+k);
const backups=path.join(root,'.kart-rush-backups','g620-iphone-rescue-'+new Date().toISOString().replace(/[:.]/g,'-'));
const files=[];
try{
 for(const [k,item] of Object.entries(destinations)){
  const backed=path.join(backups,item.rel);fs.mkdirSync(path.dirname(backed),{recursive:true});
  fs.writeFileSync(backed,item.raw,'utf8');
  files.push({key:k,target:item.rel,originalSha:sha(clean(item.raw)),newSha:sha(clean(replacements[k]))});
 }
 fs.writeFileSync(path.join(backups,'restore-index.json'),JSON.stringify({version:meta.version,files},null,2));
}catch(e){fail('Yedek alinmadi, motor degistirilmedi: '+e.message);}
const written=[];
try{
 for(const [k,item] of Object.entries(destinations)){
  const ending=item.raw.includes('\r\n')?'\r\n':'\n';
  const content=replacements[k].replace(/\n/g,ending);
  const tmp=item.abs+'.g620-tmp';fs.writeFileSync(tmp,content,'utf8');
  if(sha(clean(fs.readFileSync(tmp,'utf8')))!==sha(clean(replacements[k])))throw Error('Checksum: '+k);
  fs.renameSync(tmp,item.abs);written.push(k);
 }
}catch(e){
 for(const k of written){const item=destinations[k];try{fs.writeFileSync(item.abs,item.raw,'utf8');}catch{}}
 fail('Yazma hatasi; degisiklikler geri alindi. '+e.message);
}
console.log('[OK] Kart Rush G6.2 iPhone Mobile Rescue kuruldu.');
console.log('Degisenler: '+files.map(x=>x.target).join(', '));
console.log('Mobil: 30 FPS, dinamik cozunurluk, mobil geometri/2K atlas, hafif 3D yagmur.');
console.log('HUD: DURAKLAT/MENU, buyuk kontroller, ses acma/test, kisa bildirimler.');
console.log('Masaustu Graphics 6.1 korunur.');
console.log('Yedek: '+backups);
console.log('SIMDI: npm.cmd run build -- --webpack');
