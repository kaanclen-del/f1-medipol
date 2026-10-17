'use strict';
/** Restore the last pre-V19 Kart Rush files. Run at Next.js project root. */
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd();
if(!fs.existsSync(path.join(root,'package.json'))){console.error('❌ Terminali f1-medipol ana klasöründe aç.');process.exit(1);}
const folder=path.join(root,'.kart-rush-backups');
const list=fs.existsSync(folder)?fs.readdirSync(folder).filter(d=>d.startsWith('power-finish-v19-')).sort():[];
if(!list.length){console.error('❌ V19 öncesi yedek bulunamadı.');process.exit(1);}
const backup=path.join(folder,list[list.length-1]),info=JSON.parse(fs.readFileSync(path.join(backup,'restore.json'),'utf8'));
for(const file of info.targets){
 const source=path.join(backup,file);
 if(!fs.existsSync(source)){console.error('❌ Yedek eksik: '+file);process.exit(1);}
}
for(const file of info.targets)fs.copyFileSync(path.join(backup,file),path.join(info.dir,file));
console.log('✅ Kart Rush V19 öncesi dosyalar geri yüklendi. Yedek:',backup);
