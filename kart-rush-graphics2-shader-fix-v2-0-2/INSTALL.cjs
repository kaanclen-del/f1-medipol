#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=process.cwd();
const target=path.join(root,'components','kart-rush','engine.ts');
if(!fs.existsSync(target)){
  console.error('❌ KURULUM DURDU: components/kart-rush/engine.ts bulunamadı.');
  process.exit(1);
}
let src=fs.readFileSync(target,'utf8');
if(!src.includes('vec4 packed=texture2D(uNormalRoughAtlas,uv);') && !src.includes('roughness=packed.a;')){
  console.log('✅ Shader hotfix zaten uygulanmış veya hedef satırlar bulunamadı.');
  process.exit(0);
}
const backupDir=path.join(root,'.kart-rush-backups','g2-shader-hotfix-v2-0-2-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(backupDir,{recursive:true});
fs.copyFileSync(target,path.join(backupDir,'engine.ts'));
let out=src
  .replaceAll('vec4 packed=texture2D(uNormalRoughAtlas,uv);','vec4 normalRoughSample=texture2D(uNormalRoughAtlas,uv);')
  .replaceAll('vec2 perturb=packed.xy*2.0-1.0;','vec2 perturb=normalRoughSample.xy*2.0-1.0;')
  .replaceAll('roughness=packed.a;','roughness=normalRoughSample.a;');
if(out===src){
  console.error('❌ KURULUM DURDU: Shader satırları güncellenemedi. Dosyalar değiştirilmedi.');
  process.exit(1);
}
fs.writeFileSync(target+'.tmp',out,'utf8');
fs.renameSync(target+'.tmp',target);
console.log('✅ Graphics 2.0.2 shader hotfix uygulandı.');
console.log('Yedek:',backupDir);
console.log('Sonraki adım: npm.cmd run build -- --webpack');
