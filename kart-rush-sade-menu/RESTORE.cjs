/* Roll back only the last simplified-menu installation. Run from project root. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),folder=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(folder)){console.error('Yedek bulunamadi.');process.exit(1);}
const dirs=fs.readdirSync(folder).filter(x=>x.startsWith('sade-menu-')).sort().reverse();
if(!dirs.length){console.error('Menu yedegi bulunamadi.');process.exit(1);}
const bak=path.join(folder,dirs[0]);
for(const name of ['KartRushClient.tsx','kartRush.module.css']){
 const src=path.join(bak,name),target=path.join(root,'components','kart-rush',name);
 if(!fs.existsSync(src)){console.error('Yedek eksik: '+name);process.exit(1);}
 fs.copyFileSync(src,target);console.log('Geri yuklendi:',name);
}
console.log('Menu eski haline getirildi.');
