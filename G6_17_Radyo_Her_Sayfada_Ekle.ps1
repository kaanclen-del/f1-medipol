# G6.17 â€“ Safely move the already installed Team Radio to the shared root layout.
# Run from repository root after extracting the ZIP. Idempotent, backups to TEMP.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$layout = Join-Path $root 'app\layout.tsx'
$homePagePath = Join-Path $root 'app\page.tsx'
$radio = Join-Path $root 'components\LegendaryTeamRadio.tsx'

foreach ($path in @($layout, $homePagePath, $radio)) {
  if (!(Test-Path -LiteralPath $path)) {
    throw "Beklenen dosya bulunamadi: $path. Script baska bir dosyayi degistirmedi."
  }
}

$enc = [System.Text.UTF8Encoding]::new($false)
$layoutSource = [System.IO.File]::ReadAllText($layout, [System.Text.Encoding]::UTF8)
$homeSource = [System.IO.File]::ReadAllText($homePagePath, [System.Text.Encoding]::UTF8)

if ($layoutSource -notmatch '</body\s*>') {
  throw 'app/layout.tsx icinde </body> bulunamadi. Proje duzenine ozel kontrol gerekli; hicbir dosya degistirilmedi.'
}
if (($homeSource -match 'LegendaryTeamRadio') -and ($homeSource -notmatch '<LegendaryTeamRadio\s*/>')) {
  throw 'Ana sayfada beklenmeyen LegendaryTeamRadio kullanimi bulundu; hicbir dosya degistirilmedi.'
}
if (($layoutSource -match '<LegendaryTeamRadio\s*/>') -and ($layoutSource -notmatch 'from\s+["'']@/components/LegendaryTeamRadio["'']')) {
  throw 'Layout icinde Team Radio var ama import farkli; hicbir dosya degistirilmedi.'
}

$newHome = [System.Text.RegularExpressions.Regex]::Replace(
  $homeSource, '(?m)^\s*import\s+LegendaryTeamRadio\s+from\s+["'']@/components/LegendaryTeamRadio["''];?\s*\r?\n', ''
)
$newHome = [System.Text.RegularExpressions.Regex]::Replace(
  $newHome, '(?m)^[ \t]*<LegendaryTeamRadio\s*/>[ \t]*\r?\n', ''
)

$newLayout = $layoutSource
if ($newLayout -notmatch 'from\s+["'']@/components/LegendaryTeamRadio["'']') {
  $import = 'import LegendaryTeamRadio from "@/components/LegendaryTeamRadio";'
  # Preserve a possible React/Next.js "use client" directive on the first line.
  $directive = '^(\uFEFF?\s*["'']use client["''];?\s*\r?\n)'
  if ([System.Text.RegularExpressions.Regex]::IsMatch($newLayout, $directive)) {
    $newLayout = [System.Text.RegularExpressions.Regex]::Replace(
      $newLayout, $directive, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $m.Value + $import + "`r`n" }, 1
    )
  } else {
    $newLayout = $import + "`r`n" + $newLayout
  }
}
if ($newLayout -notmatch '<LegendaryTeamRadio\s*/>') {
  # Render exactly once in the shared root layout. This preserves playback during App Router navigation.
  $newLayout = [System.Text.RegularExpressions.Regex]::Replace(
    $newLayout, '</body\s*>', "  <LegendaryTeamRadio />`r`n        </body>", 1
  )
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
if ($newHome -ne $homeSource) {
  $backupHome = Join-Path $env:TEMP "F1Medipol_G617_home_$stamp.tsx.bak"
  Copy-Item -LiteralPath $homePagePath -Destination $backupHome
  [System.IO.File]::WriteAllText($homePagePath, $newHome, $enc)
  Write-Host "Ana sayfadaki eski radyo cagirimi kaldirildi. Yedek: $backupHome" -ForegroundColor Green
} else {
  Write-Host 'Ana sayfada kaldirilacak eski radyo cagirimi bulunmadi.' -ForegroundColor Yellow
}
if ($newLayout -ne $layoutSource) {
  $backupLayout = Join-Path $env:TEMP "F1Medipol_G617_layout_$stamp.tsx.bak"
  Copy-Item -LiteralPath $layout -Destination $backupLayout
  [System.IO.File]::WriteAllText($layout, $newLayout, $enc)
  Write-Host "Team Radio her sayfada calisacak sekilde root layout'a eklendi. Yedek: $backupLayout" -ForegroundColor Green
} else {
  Write-Host 'Root layout daha once guncellenmis, tekrar eklenmedi.' -ForegroundColor Green
}
Write-Host 'G6.17 hazir. npm.cmd run build ile derlemeyi kontrol edin.' -ForegroundColor Cyan

