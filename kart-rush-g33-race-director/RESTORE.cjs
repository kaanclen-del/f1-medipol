#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();const base=path.join(root,'.kart-rush-backups');
const fail=m=>{console.error('❌ '+m);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Proje ana klasöründe çalıştır.');
if(!fs.existsSync(base))fail('Yedek dizini bulunamadı.');
const dirs=fs.readdirSync(base).filter(x=>x.startsWith('g33-race-director-')).sort();
if(!dirs.length)fail('Graphics 3.3 yedeği yok.');
const last=path.join(base,dirs[dirs.length-1]);
const idx=JSON.parse(fs.readFileSync(path.join(last,'restore-index.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const f of idx.files){const dst=path.join(root,f.dest),backup=path.join(last,f.dest);
 if(!fs.existsSync(backup))fail('Yedek eksik: '+f.dest);
 if(!fs.existsSync(dst)||sha(fs.readFileSync(dst))!==f.installedSha)fail(f.dest+' sonradan değiştirilmiş; üzerine yazılmadı. Manuel yedek karşılaştırması yap.');
}
for(const f of idx.files){fs.copyFileSync(path.join(last,f.dest),path.join(root,f.dest));console.log('✓ '+f.dest);}
console.log('✅ Graphics 3.3 geri alındı. Kaynak: '+last);
