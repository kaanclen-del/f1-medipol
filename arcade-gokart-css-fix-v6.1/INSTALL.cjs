'use strict';
/*
 * F1 Medipol - Go-Kart Timing CSS Modules build fix V6.1
 * Run from the project root:
 *   node .\arcade-gokart-css-fix-v6.1\INSTALL.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
function stop(message) {
  console.error('\n❌ DÜZELTME DURDU: ' + message);
  process.exitCode = 1;
}
const projectFile = path.join(projectRoot, 'package.json');
const candidates = [
  path.join(projectRoot, 'app', 'arcade', 'gokart-zamanlama', 'timing.module.css'),
  path.join(projectRoot, 'src', 'app', 'arcade', 'gokart-zamanlama', 'timing.module.css')
];
const target = candidates.find(p => fs.existsSync(p));

if (!fs.existsSync(projectFile)) {
  stop('Bu komutu package.json bulunan f1-medipol ana klasöründe çalıştır.');
} else if (!target) {
  stop('Go-Kart timing.module.css bulunamadı. Önce Arcade Go-Kart V6 kurulu olmalı.');
} else {
  const original = fs.readFileSync(target, 'utf8');
  const badSelector = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{\s*\*\s*\{\s*scroll-behavior\s*:\s*auto\s*!important\s*;?\s*\}\s*\}/g;
  const goodRule = '@media(prefers-reduced-motion:reduce){.page,.page *{scroll-behavior:auto!important}}';
  const matches = [...original.matchAll(badSelector)];
  if (matches.length === 0) {
    if (original.includes(goodRule)) {
      console.log('✅ CSS Modules seçicisi zaten düzeltilmiş. Yeni değişiklik yapılmadı.');
    } else {
      stop('Beklenen problemli CSS kuralı bulunamadı. Yerel değişiklikler korunuyor.');
    }
  } else if (matches.length !== 1) {
    stop('Birden fazla eşleşme bulundu; güvenlik için dosya değiştirilmedi.');
  } else {
    const updated = original.replace(badSelector, goodRule);
    const backup = path.join(projectRoot, '.arcade-backups', 'gokart-css-fix-' + new Date().toISOString().replace(/[:.]/g, '-'));
    const backupFile = path.join(backup, 'timing.module.css');
    try {
      fs.mkdirSync(backup, { recursive: true });
      fs.copyFileSync(target, backupFile);
      fs.writeFileSync(path.join(backup, 'restore-info.json'), JSON.stringify({ target, createdAt: new Date().toISOString() }, null, 2), 'utf8');
      const temp = target + '.gokart-css-tmp';
      try {
        fs.writeFileSync(temp, updated, 'utf8');
        fs.renameSync(temp, target);
      } finally {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
      }
      console.log('\n✅ Go-Kart CSS Modules derleme hatası giderildi.');
      console.log('Düzenlenen tek dosya:', target);
      console.log('Yedek:', backup);
      console.log('Şimdi: npm.cmd run build -- --webpack');
    } catch (err) {
      try { if (fs.existsSync(backupFile)) fs.copyFileSync(backupFile, target); } catch {}
      stop('Dosya yazılamadı: ' + err.message);
    }
  }
}
