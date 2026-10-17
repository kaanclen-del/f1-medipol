#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const projectRoot=process.cwd();
const backupRoot=path.join(projectRoot,'.kart-rush-backups');
const target=path.join(projectRoot,'components','kart-rush','engine.ts');
if(!fs.existsSync(backupRoot)){console.error('❌ .kart-rush-backups bulunamadı.');process.exit(1);}
const dirs=fs.readdirSync(backupRoot).filter(name=>name.startsWith('circuit-venue-v2-2-')).sort();
if(!dirs.length){console.error('❌ Circuit Venue 2.2 için yedek bulunamadı.');process.exit(1);}
const latest=path.join(backupRoot,dirs[dirs.length-1],'engine.ts');
if(!fs.existsSync(latest)){console.error('❌ Son yedekte engine.ts bulunamadı.');process.exit(1);}
fs.copyFileSync(latest,target);
console.log('✅ Son Circuit Venue 2.2 yedeği geri yüklendi: '+latest);
