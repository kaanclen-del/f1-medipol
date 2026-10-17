"use strict";
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const pkg=__dirname, spec=require(path.join(pkg,'manifest.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const norm=b=>Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
const normSha=b=>sha(norm(b));
function getRoot(){for(let dir=process.cwd(),i=0;i<5;i++,dir=path.dirname(dir)){
 const file=path.join(dir,'package.json');if(fs.existsSync(file)){
  try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.dependencies?.next||data.devDependencies?.next){if(fs.existsSync(path.join(dir,'components/kart-rush/KartRushTrack.tsx')))return dir;}}catch{}
 }if(dir===path.dirname(dir))break;
}throw Error('F1 Medipol proje klasorune gecip calistirin.');}
function atomicSave(dest,buf){const tmp=dest+'.g626tmp';fs.writeFileSync(tmp,buf);fs.renameSync(tmp,dest);}
try{
 const root=getRoot(),targets=Object.entries(spec.files),recs=[];
 for(const [relative,info] of targets){
  const dst=path.join(root,relative),pay=path.join(pkg,info.payload);
  if(!fs.existsSync(dst))throw Error('Eksik kaynak dosyasi: '+relative);
  const actual=fs.readFileSync(dst),pbuf=fs.readFileSync(pay);
  if(sha(pbuf)!==info.payloadRawSha)throw Error('Payload bozulmus: '+relative);
  if(normSha(pbuf)!==info.updated)throw Error('Payload surum hash uyusmazligi: '+relative);
  const state=normSha(actual);
  if(state!==info.original&&state!==info.updated)throw Error('Mevcut dosya farkli; zorla degistirilmeyecek: '+relative+'\nBeklenen G6.2.5 kaynagini yeniden paylasin.');
  recs.push({relative,dst,original:actual,updated:pbuf,isCurrent:state===info.updated,raw:sha(actual),state});
 }
 if(recs.every(r=>r.isCurrent)){
  console.log('[OK] G6.2.6 zaten kurulu. Dosyalara dokunulmadi.');process.exit(0);
 }
 if(recs.some(r=>r.isCurrent))throw Error('Kismi kurulum tespit edildi. Guvenlik icin durduruldu.');
 const d=new Date().toISOString().replace(/[:.]/g,'-');
 const backup=path.join(root,'.kart-rush-backups','g626-iphone-mobile-'+d);
 fs.mkdirSync(backup,{recursive:true});
 const saved=[];
 for(const r of recs){const bpath=path.join(backup,r.relative);fs.mkdirSync(path.dirname(bpath),{recursive:true});fs.writeFileSync(bpath,r.original);if(sha(fs.readFileSync(bpath))!==r.raw)throw Error('Yedek dogrulamasi basarisiz: '+r.relative);saved.push({path:r.relative,originalSha:r.raw,updatedSha:spec.files[r.relative].updated});}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({id:spec.id,files:saved},null,2));
 try{
  for(const r of recs){const content=r.original.includes(13)&&r.original.includes(10)?Buffer.from(r.updated.toString('utf8').replace(/\r?\n/g,'\r\n'),'utf8'):r.updated;atomicSave(r.dst,content);}
  for(const r of recs)if(normSha(fs.readFileSync(r.dst))!==spec.files[r.relative].updated)throw Error('Yazim dogrulanamadi: '+r.relative);
 }catch(err){for(const r of recs)atomicSave(r.dst,r.original);throw err;}
 fs.writeFileSync(path.join(pkg,'last-install.json'),JSON.stringify({root,backup}));
 console.log('[OK] G6.2.6 mobil header, kamera ve dokunmatik iyilestirmeleri kuruldu.');
 console.log('Yedek: '+backup);
 console.log('Degisen dosyalar: '+recs.map(r=>r.relative).join(', '));
 console.log('SIMDI: npm.cmd run build -- --webpack');
}catch(e){console.error('[HATA] G6.2.6 kurulum durduruldu: '+e.message);process.exitCode=1;}
