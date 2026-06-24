Write-Host "Building and deploying goldencityaligarh.com frontend..." -ForegroundColor Cyan

# Load token from local config (not in git)
$configFile = "$PSScriptRoot\.deploy-secrets.ps1"
if (Test-Path $configFile) {
    . $configFile
} else {
    Write-Host "ERROR: .deploy-secrets.ps1 not found!" -ForegroundColor Red
    Write-Host "Create it with: `$SWA_TOKEN = 'your-token-here'" -ForegroundColor Yellow
    exit 1
}

Set-Location "$PSScriptRoot\Frontend"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host "Building..." -ForegroundColor Yellow
$env:VITE_API_BASE_URL = "https://subhsankalp-backend-new.azurewebsites.net/api"
$env:VITE_API_BASE_URL_HTTP = "https://subhsankalp-backend-new.azurewebsites.net/api"
$env:VITE_APP_NAME = "Goldencity CRM"
$env:VITE_APP_VERSION = "1.0.0"
$env:VITE_NODE_ENV = "production"
$env:VITE_ENABLE_SWAGGER = "false"
$env:VITE_ENABLE_DEBUG = "false"
$env:VITE_COMPANY_NAME = "Subh Sankalp Estate"
npm run build

Write-Host "Deploying to goldencityaligarh.com..." -ForegroundColor Yellow
swa deploy ./build --deployment-token $SWA_TOKEN --env production

Write-Host "Done! Site updated at goldencityaligarh.com" -ForegroundColor Green
