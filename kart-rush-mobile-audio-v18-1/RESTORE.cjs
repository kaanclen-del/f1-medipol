'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const parent=path.join(root,'.kart-rush-backups');
const fail=m=>{console.error('❌ '+m);process.exit(1)};
if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(parent))fail('Proje ana klasörünü ve yedeklerin yerini kontrol et.');
const names=fs.readdirSync(parent).filter(n=>n.startsWith('mobile-audio-v18-1-')).sort();
if(!names.length)fail('V18.1 geri yükleme yedeği bulunamadı.');
const backup=path.join(parent,names[names.length-1]);
const manifest=JSON.parse(fs.readFileSync(path.join(backup,'manifest.json'),'utf8'));
if(path.resolve(manifest.projectRoot)!==path.resolve(root))fail('Yedek farklı bir proje klasörüne ait.');
for(const entry of manifest.entries){
 if(!path.resolve(entry.target).startsWith(path.resolve(root)+path.sep))fail('Proje dışına çıkan geçersiz yedek hedefi.');
 if(entry.existed)fs.copyFileSync(path.join(backup,entry.backup),entry.target);
 else if(fs.existsSync(entry.target))fs.unlinkSync(entry.target);
}
console.log('✅ V18.1 değişiklikleri geri alındı. Yedek:',backup);
