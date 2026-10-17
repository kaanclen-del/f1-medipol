'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const folder = path.join(root,'.arcade-backups');
if (!fs.existsSync(path.join(root,'package.json')) || !fs.existsSync(folder)) {
  console.error('❌ Proje klasöründe değilsin veya yedek bulunamadı.');
  process.exit(1);
}
const backups = fs.readdirSync(folder).filter(name => name.startsWith('gokart-css-fix-')).sort();
if (!backups.length) {
  console.error('❌ CSS düzeltme yedeği bulunamadı.');
  process.exit(1);
}
const latest = path.join(folder, backups[backups.length-1]);
const info = JSON.parse(fs.readFileSync(path.join(latest,'restore-info.json'),'utf8'));
fs.copyFileSync(path.join(latest,'timing.module.css'), info.target);
console.log('✅ Go-Kart CSS eski haline getirildi:',info.target);
