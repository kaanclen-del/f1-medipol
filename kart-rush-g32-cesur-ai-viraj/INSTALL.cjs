#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const pkg=__dirname;
const fail=(msg)=>{console.error('\n❌ KURULUM DURDU: '+msg);process.exit(1);};
const sha=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('F1 Medipol projesinin ana klasöründe çalıştır.');
let data;try{data=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}
catch(e){fail('package.json okunamadı: '+e.message);}
if(!data.dependencies?.next&&!data.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
const m=JSON.parse(fs.readFileSync(path.join(pkg,'manifest.json'),'utf8'));
const target=path.join(root,m.target),payload=path.join(pkg,m.payload);
if(!fs.existsSync(target))fail(m.target+' dosyası yok.');
if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==m.newSha)fail('Paketin engine.payload dosyası eksik veya bozuk.');
const currentSha=sha(fs.readFileSync(target));
if(currentSha===m.newSha){console.log('✅ Kart Rush 3.2 zaten kurulu. Dosyalar değişmedi.');process.exit(0);}
if(currentSha!==m.oldSha)fail('Beklenmeyen Kart Rush motor sürümü. Hiçbir dosyaya dokunulmadı.\nMevcut engine.ts SHA-256: '+currentSha+'\nBu kodu gönder, kendi sürümüne uygun düzeltme yapalım.');
const backups=path.join(root,'.kart-rush-backups');
const folder=path.join(backups,'g32-cesur-ai-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(folder,{recursive:true});
 fs.copyFileSync(target,path.join(folder,'engine.ts'));
 fs.writeFileSync(path.join(folder,'restore-index.json'),JSON.stringify({dest:m.target,oldSha:m.oldSha,newSha:m.newSha,created:new Date().toISOString()},null,2));
}catch(e){fail('Yedek alınamadı; kurulum iptal edildi: '+e.message);}
const tmp=target+'.g32-tmp';
try{
 fs.copyFileSync(payload,tmp);
 if(sha(fs.readFileSync(tmp))!==m.newSha)throw Error('Geçici dosya doğrulaması başarısız.');
 fs.renameSync(tmp,target);
 if(sha(fs.readFileSync(target))!==m.newSha)throw Error('Kurulu dosya doğrulaması başarısız.');
}catch(e){
 try{fs.copyFileSync(path.join(folder,'engine.ts'),target);}catch{}
 try{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}catch{}
 fail('Kurulum başarısız, önceki engine.ts geri yüklendi: '+e.message);
}
console.log('✓ components/kart-rush/engine.ts');
console.log('\n✅ KART RUSH 3.2 — CESUR AI + GERÇEKÇİ VİRAJ ÇİZGİLERİ KURULDU');
console.log('Kolay, normal ve zor botların tamamı geç frenleme, iç apex ve dış hat denemeleri yapar.');
console.log('Yanlış hamlede pist dışına taşma ve zaman kaybı olabilir.');
console.log('G3.1 yağmur, grafik, şampiyona ve motor sesi dosyalarına dokunulmadı.');
console.log('Yedek: '+folder);
console.log('Kontrol: npm.cmd run build -- --webpack');
