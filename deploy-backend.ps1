Write-Host "Building and deploying backend (subhsankalp-backend-new)..." -ForegroundColor Cyan

$publishDir = "$PSScriptRoot\Receipt-portal\publish"

Write-Host "Publishing .NET app..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\Receipt-portal"
dotnet publish --configuration Release --output $publishDir --runtime linux-x64 --self-contained false

Write-Host "Creating zip..." -ForegroundColor Yellow
$zipPath = "$PSScriptRoot\backend-release.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
Get-ChildItem -Path $publishDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($publishDir.Length + 1).Replace('\', '/')
    if (-not $_.PSIsContainer) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath) | Out-Null
    }
}
$zip.Dispose()
Write-Host "Zip: $([Math]::Round((Get-Item $zipPath).Length/1MB, 1)) MB"

Write-Host "Deploying to Azure..." -ForegroundColor Yellow
$token = az account get-access-token --query accessToken -o tsv
$kuduUrl = "https://subhsankalp-backend-new.scm.azurewebsites.net/api/zipdeploy"
$response = Invoke-RestMethod -Uri $kuduUrl -Method POST -Headers @{Authorization="Bearer $token"} -InFile $zipPath -ContentType "application/zip"

Write-Host "Done! Backend deployed to subhsankalp-backend-new" -ForegroundColor Green
