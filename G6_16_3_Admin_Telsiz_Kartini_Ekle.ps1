# G6.16.3 – Safely add Team Radio shortcut to existing admin dashboard.
# Only app/admin/page.tsx is modified; other admin modules are preserved.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root 'app\admin\page.tsx'
$teamRadioPage = Join-Path $root 'app\admin\team-radio\page.tsx'

if (!(Test-Path -LiteralPath $target)) {
  throw "app/admin/page.tsx bulunamadi. Lutfen scripti proje ana klasorune cikarin."
}
if (!(Test-Path -LiteralPath $teamRadioPage)) {
  throw "Team Radio admin sayfasi bulunamadi. Once G6.16.1 ve G6.16.2 paketlerini kurun."
}

$source = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
if ($source.Contains('href="/admin/team-radio"') -or $source.Contains("href='/admin/team-radio'")) {
  Write-Host "Telsiz Arsivi karti zaten ekli; degisiklik yapilmadi." -ForegroundColor Green
  exit 0
}

$anchor = '<div className="admin-module-grid">'
if (!$source.Contains($anchor)) {
  throw "Yonetim modul grid'i beklenen sekilde bulunamadi. Dosya degistirilmedi. app/admin/page.tsx dosyasini paylasin."
}

$nl = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }
$card = @'
              {/* G6.16.3 · TEAM RADIO YONETIM KISAYOLU */}
              <Link
                href="/admin/team-radio"
                className="admin-module"
                style={{
                  background:
                    "radial-gradient(circle at 88% 12%, rgba(255, 73, 94, .23), transparent 45%), linear-gradient(145deg, #291721, #131820)",
                }}
              >
                <div className="module-icon">📻</div>
                <span>OPENF1 · TEAM RADIO</span>
                <h3>Telsiz Arşivi</h3>
                <p>
                  Yıl, Grand Prix, seans ve pilot seçerek OpenF1
                  telsizlerini ara, dinle ve yayın listesini yönet.
                </p>
                <strong>ARŞİVİ YÖNET →</strong>
              </Link>
'@
$card = [System.Text.RegularExpressions.Regex]::Replace($card.TrimEnd(), "`r?`n", $nl)
$updated = $source.Replace($anchor, $anchor + $nl + $card)

$backup = Join-Path $env:TEMP ("F1Medipol_admin_G6163_{0}.tsx.bak" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
[System.IO.File]::WriteAllText($target, $updated, [System.Text.UTF8Encoding]::new($false))
Write-Host "Telsiz Arsivi kisayolu admin paneline eklendi." -ForegroundColor Green
Write-Host "Degisen dosya: $target"
Write-Host "Yedek: $backup"
