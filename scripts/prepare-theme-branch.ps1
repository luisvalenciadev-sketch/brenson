param(
  [string]$ThemeDir = ".\brenson-theme",
  [string]$TargetRoot = ".",
  [switch]$DryRun = $true
)

function Fail($msg) { Write-Error $msg; exit 1 }

try { $src = (Resolve-Path $ThemeDir).Path } catch { Fail "ThemeDir '$ThemeDir' not found." }
try { $dst = (Resolve-Path $TargetRoot).Path } catch { Fail "TargetRoot '$TargetRoot' not found." }

Write-Host "Source: $src"
Write-Host "Target: $dst"
Write-Host "DryRun: $DryRun"

# Folders to copy (Shopify expects these at repo root)
$folders = @('assets','config','layout','locales','sections','snippets','templates')

foreach ($f in $folders) {
  $srcF = Join-Path $src $f
  if (-not (Test-Path $srcF)) { Write-Warning "Source folder missing: $srcF — skipping"; continue }

  # destination folder
  $dstF = Join-Path $dst $f
  if ($DryRun) {
    Write-Host "Would copy: $srcF => $dstF"
  } else {
    if (Test-Path $dstF) {
      Write-Host "Removing existing: $dstF"
      Remove-Item $dstF -Recurse -Force
    }
    Write-Host "Copying: $srcF => $dstF"
    Copy-Item -Path $srcF -Destination $dstF -Recurse -Force
  }
}

Write-Host "Done. Review files, `git add` and commit on the target branch as needed."