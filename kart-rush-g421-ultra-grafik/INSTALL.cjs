#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const sha=(buf)=>crypto.createHash('sha256').update(buf).digest('hex');
const currentSha=(file)=>fs.existsSync(file)?sha(fs.readFileSync(file)):null;
const fail=(msg)=>{console.error('\n[ERROR] G4.2.1: '+msg);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Ilk once F1 Medipol proje klasorune gec.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const backup=path.join(root,'.kart-rush-backups','g421-ultra-grafik-'+new Date().toISOString().replace(/[:.]/g,'-'));
const targetFiles=[
 'components/kart-rush/engine.ts',
 'public/kart-rush/materials/surface-albedo-v3-mega.png',
 'public/kart-rush/materials/surface-normal-rough-v3-mega.png',
 'components/kart-rush/KartRushTrack.tsx',
 'components/kart-rush/KartRushClient.tsx'
];
fs.mkdirSync(backup,{recursive:true});
for(const rel of targetFiles){
 const dest=path.join(root,rel);
 if(fs.existsSync(dest)){
  const out=path.join(backup,rel);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(dest,out);
 }
}
const restoreIndex={files:targetFiles.filter(rel=>fs.existsSync(path.join(root,rel))).map(rel=>({path:rel}))};
fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify(restoreIndex,null,2),'utf8');

function patchClient(src){
 let out=src;
 out=out.replace(/if\(saved==='low'\|\|saved==='balanced'\|\|saved==='high'\)/g,"if(saved==='low'||saved==='balanced'||saved==='high'||saved==='ultra')");
 out=out.replace(/\{id:'high',name:'YÜKSEK',desc:'Ultra doku \/ çevre'\}/g,"{id:'high',name:'YÜKSEK',desc:'Güçlü detay'},{id:'ultra',name:'ULTRA',desc:'Maksimum doku / tribün / gökyüzü'}");
 return out;
}
function patchTrack(src){
 let out=src;
 out=out.replace(/graphics==='high'\?'YÜKSEK':graphics==='low'\?'DÜŞÜK':'DENGELİ'/g,"graphics==='ultra'?'ULTRA':graphics==='high'?'YÜKSEK':graphics==='low'?'DÜŞÜK':'DENGELİ'");
 out=out.replace(/\{id:'high',name:'YÜKSEK',desc:'Ultra detay'\}/g,"{id:'high',name:'YÜKSEK',desc:'Güçlü detay'},{id:'ultra',name:'ULTRA',desc:'Tribün / gökyüzü / maksimum detay'}");
 out=out.replace(/\{ability&&<div className=\{s\.powerDescription\}>\{POWER_ICON\[ability\]\} \{DETAILS\[ability\]\} · BOŞLUK \/ E<\/div>\}/g,
 `{ability&&<div className={s.powerDescription} style={{top:'96px',bottom:'auto',left:'50%',transform:'translateX(-50%)',minWidth:'360px',maxWidth:'min(560px, calc(100vw - 32px))',padding:'10px 18px',borderRadius:'14px',textAlign:'center',whiteSpace:'normal',lineHeight:1.25,background:'rgba(10,17,26,.92)',border:'1px solid rgba(255,255,255,.18)',boxShadow:'0 14px 34px rgba(0,0,0,.35)'}}>{POWER_ICON[ability]} {DETAILS[ability]} · BOŞLUK / E</div>}`);
 out=out.replace(/G2\.0 · TEXTURED WORLD/g,'G4.2.1 · ULTRA PACK');
 return out;
}
function writeFileChecked(rel,payload){
 const src=path.join(__dirname,payload.payload);
 const dest=path.join(root,rel);
 const data=fs.readFileSync(src);
 const expected=payload.sha256;
 if(sha(data)!==expected)fail('ZIP bozuk: '+payload.payload);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,data);
 if(currentSha(dest)!==expected)fail('Dosya yazma dogrulamasi basarisiz: '+rel);
 console.log('  + '+rel+' ('+(payload.bytes/1024/1024).toFixed(2)+' MiB)');
}
try{
 for(const f of manifest.files)writeFileChecked(f.path,f);
 const trackPath=path.join(root,'components/kart-rush/KartRushTrack.tsx');
 const clientPath=path.join(root,'components/kart-rush/KartRushClient.tsx');
 if(!fs.existsSync(trackPath))fail('KartRushTrack.tsx bulunamadi.');
 if(!fs.existsSync(clientPath))fail('KartRushClient.tsx bulunamadi.');
 const trackOld=fs.readFileSync(trackPath,'utf8');
 const clientOld=fs.readFileSync(clientPath,'utf8');
 const trackNew=patchTrack(trackOld);
 const clientNew=patchClient(clientOld);
 if(trackNew===trackOld && !trackOld.includes("graphics==='ultra'"))fail('KartRushTrack.tsx beklenen kalipta degil; yama uygulanamadi.');
 if(clientNew===clientOld && !clientOld.includes("id:'ultra'"))fail('KartRushClient.tsx beklenen kalipta degil; yama uygulanamadi.');
 fs.writeFileSync(trackPath,trackNew,'utf8');
 fs.writeFileSync(clientPath,clientNew,'utf8');
}catch(e){
 console.error('Kurulum sirasinda hata:',e.message||e);
 console.error('Yedek:',backup);
 process.exit(1);
}
console.log('\n[OK] G4.2.1 Ultra Grafik Paketi kuruldu.');
console.log('ULTRA grafik secenegi eklendi; pistteki beyaz/parlak asfalt etkisi azaltildi.');
console.log('Tribun, kalabalik, bayrak ve gokyuzu detaylari artirildi.');
console.log('Ozel guc kutusu daha ustte yatay bir yapiya alindi.');
console.log('Yedek: '+backup);
console.log('Sonraki adim: npm.cmd run build -- --webpack');
