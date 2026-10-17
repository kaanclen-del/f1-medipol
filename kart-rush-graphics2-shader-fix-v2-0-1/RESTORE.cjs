'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const target=path.join(root,'components','kart-rush','engine.ts');
const pointer=path.join(root,'.kart-rush-backups','graphics2-shader-current.json');
const hash=(x)=>crypto.createHash('sha256').update(x).digest('hex');
function fail(msg){console.error('\n❌ GERİ ALMA DURDU: '+msg);process.exit(1);}
if(!fs.existsSync(pointer)||!fs.existsSync(target))fail('Bu kurulumun yedeği bulunamadı.');
const {backupFile,sourceSha,targetSha}=JSON.parse(fs.readFileSync(pointer,'utf8'));
if(!fs.existsSync(backupFile))fail('Yedek dosyası bulunamadı.');
if(hash(fs.readFileSync(target))!==targetSha)fail('engine.ts kurulumdan sonra değiştirilmiş; üzerine yazılmadı.');
if(hash(fs.readFileSync(backupFile))!==sourceSha)fail('Yedek dosyasının doğrulaması başarısız.');
fs.copyFileSync(backupFile,target);
fs.unlinkSync(pointer);
console.log('✅ Shader düzeltmesi geri alındı.');
