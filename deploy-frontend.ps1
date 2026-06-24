Write-Host "Building and deploying goldencityaligarh.com frontend..." -ForegroundColor Cyan

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
swa deploy ./build --deployment-token "1032a2819ae9fdf02fc4181f6ff35008f3294158eb34069389435379e5f1bc2003-ede3590e-6e58-40b0-b148-284284099bde00001080c929c500" --env production

Write-Host "Done! Site updated at goldencityaligarh.com" -ForegroundColor Green
