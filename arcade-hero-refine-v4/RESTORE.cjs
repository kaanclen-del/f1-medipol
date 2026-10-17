'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const backupRoot = path.join(root,'.arcade-backups');
function fail(message){ console.error('\n❌ GERİ ALMA DURDU: ' + message); process.exit(1); }
if (!fs.existsSync(path.join(root,'package.json'))) fail('Terminali f1-medipol ana klasöründe aç.');
if (!fs.existsSync(backupRoot)) fail('Geri alınacak yedek klasörü bulunamadı.');
const backups = fs.readdirSync(backupRoot).filter(name => name.startsWith('hero-refine-')).sort();
if (!backups.length) fail('Hero refine için yedek bulunamadı.');
const latest = path.join(backupRoot, backups.at(-1));
const info = path.join(latest, 'backup-info.json');
if (!fs.existsSync(info)) fail('backup-info.json bulunamadı.');
const targetDir = JSON.parse(fs.readFileSync(info,'utf8')).targetDir;
const pageTarget = path.join(targetDir,'page.tsx');
const cssTarget = path.join(targetDir,'arcade.module.css');
fs.copyFileSync(path.join(latest,'page.tsx'), pageTarget);
fs.copyFileSync(path.join(latest,'arcade.module.css'), cssTarget);
console.log('✅ Arcade hero düzeni geri alındı. Yedek:', latest);
