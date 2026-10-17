#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=process.cwd(), meta=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const die=s=>{console.error('[HATA] G6.2.3: '+s);process.exit(1);};
if(!fs.existsSync(path.join(base,'package.json')))die('F1 Medipol proje ana klasorunden calistir.');
let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));}catch{die('package.json hatali.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)die('Next.js projesi bulunamadi.');
const rows=Object.entries(meta.files).map(([key,m])=>{
 const target=path.resolve(base,m.target),pay=path.join(__dirname,'payload',m.payload);
 if(!target.startsWith(base+path.sep)||!fs.existsSync(target)||!fs.existsSync(pay))die('Gerekli dosya bulunamadi: '+m.target);
 const source=fs.readFileSync(target,'utf8'),next=fs.readFileSync(pay,'utf8');
 if(sha(next)!==m.newSha)die('ZIP payload dogrulama basarisiz: '+m.payload);
 return{...m,target,source,next,sourceSha:sha(source)};
});
if(rows.every(r=>r.sourceSha===r.newSha)){console.log('[OK] G6.2.3 zaten kurulu.');process.exit(0);}
if(rows.some(r=>r.sourceSha===r.newSha))die('Kismi / beklenmeyen kurulum. Dosyalar degistirilmedi.');
for(const r of rows)if(r.sourceSha!==r.originalSha)die(r.target+' G6.2.2 surumuyle eslesmiyor.\nBulunan: '+r.sourceSha+'\nBeklenen: '+r.originalSha+'\nDosyalara dokunulmadi.');
const dir=path.join(base,'.kart-rush-backups');fs.mkdirSync(dir,{recursive:true});
const backup=fs.mkdtempSync(path.join(dir,'g623-landscape-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
try{
 for(const r of rows){const p=path.join(backup,r.target.slice(base.length+1));fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(r.target,p);if(sha(fs.readFileSync(p,'utf8'))!==r.originalSha)throw Error('Yedek dogrulanamadi: '+r.target);}
 fs.writeFileSync(path.join(backup,'index.json'),JSON.stringify({version:meta.version,files:rows.map(({target,originalSha,newSha})=>({target:path.relative(base,target),originalSha,newSha}))},null,2));
}catch(e){die('Yedekleme: '+e.message);}
const written=[];
try{
 for(const r of rows){const eol=r.source.includes('\r\n')?'\r\n':'\n',temp=r.target+'.g623-tmp';
  try{fs.writeFileSync(temp,r.next.replace(/\n/g,eol),'utf8');if(sha(fs.readFileSync(temp,'utf8'))!==r.newSha)throw Error('Hash uyusmazligi');fs.renameSync(temp,r.target);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  written.push(r);
 }
}catch(e){for(const r of written)try{fs.copyFileSync(path.join(backup,path.relative(base,r.target)),r.target);}catch{}die('Kurulum geri alindi: '+e.message);}
console.log('[OK] G6.2.3 iPhone yatay ekran ve baslangic paneli kuruldu.');
console.log('Guncellenen: KartRushTrack.tsx, kartRush.module.css');
console.log('Otomatik yedek: '+backup);
console.log('SIMDI: npm.cmd run build -- --webpack');
