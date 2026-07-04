param(
  [string]$RepoName = "spirits-pwa"
)

$ErrorActionPreference = "Stop"

function Has-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "Spirits PWA private GitHub publisher" -ForegroundColor Magenta
Write-Host "Repo name: $RepoName" -ForegroundColor Cyan

if (-not (Has-Command git)) {
  throw "Git is not installed or not in PATH."
}

if (-not (Has-Command gh)) {
  Write-Host "GitHub CLI (gh) is missing." -ForegroundColor Yellow
  if (Has-Command winget) {
    Write-Host "Installing GitHub CLI with winget..." -ForegroundColor Cyan
    winget install --id GitHub.cli -e --source winget
    Write-Host "Close and reopen PowerShell if 'gh' is still not found, then run this script again." -ForegroundColor Yellow
  } else {
    Write-Host "Install GitHub CLI from: https://cli.github.com/" -ForegroundColor Yellow
  }
  exit 1
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Logging in to GitHub. Choose GitHub.com, HTTPS, and browser login." -ForegroundColor Cyan
  gh auth login -w
}

if (-not (Test-Path ".git")) {
  git init
  git config user.name "Tony"
  git config user.email "tony@example.local"
  git add .
  git commit -m "Initial Spirits PWA"
}

$branch = (git branch --show-current)
if ($branch -ne "main") {
  git branch -M main
}

gh repo create $RepoName --private --source . --remote origin --push

Write-Host ""
Write-Host "Done. Private GitHub repo created and pushed." -ForegroundColor Green
Write-Host "Open it with:" -ForegroundColor Cyan
gh repo view --web

