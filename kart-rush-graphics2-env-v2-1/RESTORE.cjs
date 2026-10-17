#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=process.cwd();
const backupRoot=path.join(root,'.kart-rush-backups');
const target=path.join(root,'components','kart-rush','engine.ts');
if(!fs.existsSync(backupRoot)){console.error('❌ Geri yüklenecek yedek klasörü bulunamadı.');process.exit(1);}
const dirs=fs.readdirSync(backupRoot).filter(name=>name.startsWith('graphics2-env-v2-1-')).sort();
if(!dirs.length){console.error('❌ Graphics 2.1 için yedek bulunamadı.');process.exit(1);}
const latest=path.join(backupRoot,dirs[dirs.length-1],'engine.ts');
if(!fs.existsSync(latest)){console.error('❌ Son yedekte engine.ts bulunamadı.');process.exit(1);}
fs.copyFileSync(latest,target);
console.log('✅ Son Graphics 2.1 yedeği geri yüklendi: '+latest);
