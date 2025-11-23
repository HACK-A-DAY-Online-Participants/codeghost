# CodeGhost Publishing Script
# Quick script to package and test the extension before publishing

Write-Host "`n=== CODEGHOST PUBLISHING HELPER ===" -ForegroundColor Cyan

# 1. Clean and compile
Write-Host "`n[1/5] Cleaning and compiling..." -ForegroundColor Yellow
npm run compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compilation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Compilation successful" -ForegroundColor Green

# 2. Check required files
Write-Host "`n[2/5] Checking required files..." -ForegroundColor Yellow
$required = @("README.md", "CHANGELOG.md", "LICENSE", ".vscodeignore", "package.json")
$missing = @()

foreach ($file in $required) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host "❌ Missing required files: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "✅ All required files present" -ForegroundColor Green

# 3. Check package.json
Write-Host "`n[3/5] Validating package.json..." -ForegroundColor Yellow
$pkg = Get-Content package.json | ConvertFrom-Json

if (-not $pkg.publisher) {
    Write-Host "⚠️  WARNING: 'publisher' not set in package.json" -ForegroundColor Yellow
    Write-Host "   Update package.json with your publisher ID before publishing!" -ForegroundColor Yellow
}

if (-not $pkg.repository) {
    Write-Host "⚠️  WARNING: 'repository' not set in package.json" -ForegroundColor Yellow
}

Write-Host "✅ package.json validated" -ForegroundColor Green

# 4. Package extension
Write-Host "`n[4/5] Packaging extension..." -ForegroundColor Yellow
vsce package

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Packaging failed!" -ForegroundColor Red
    exit 1
}

$vsixFile = Get-ChildItem -Filter "*.vsix" | Select-Object -First 1

if ($vsixFile) {
    Write-Host "✅ Package created: $($vsixFile.Name)" -ForegroundColor Green
    
    # Get package size
    $sizeKB = [math]::Round($vsixFile.Length / 1KB, 2)
    $sizeMB = [math]::Round($vsixFile.Length / 1MB, 2)
    
    if ($sizeMB -lt 1) {
        Write-Host "   Size: $sizeKB KB" -ForegroundColor Cyan
    } else {
        Write-Host "   Size: $sizeMB MB" -ForegroundColor Cyan
    }
    
    if ($sizeMB -gt 10) {
        Write-Host "   ⚠️  Package is large (>10MB). Consider optimizing." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ No .vsix file found!" -ForegroundColor Red
    exit 1
}

# 5. Summary
Write-Host "`n[5/5] Summary" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n✅ CodeGhost is ready to publish!" -ForegroundColor Green
Write-Host "`nPackage: $($vsixFile.Name)" -ForegroundColor Cyan
Write-Host "Version: $($pkg.version)" -ForegroundColor Cyan
Write-Host "Publisher: $($pkg.publisher)" -ForegroundColor Cyan

Write-Host "`n📦 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Test locally:" -ForegroundColor White
Write-Host "      code --install-extension $($vsixFile.Name)" -ForegroundColor Gray
Write-Host "`n   2. Login to marketplace:" -ForegroundColor White
Write-Host "      vsce login YOUR_PUBLISHER_ID" -ForegroundColor Gray
Write-Host "`n   3. Publish:" -ForegroundColor White
Write-Host "      vsce publish" -ForegroundColor Gray
Write-Host "`n   OR upload manually at:" -ForegroundColor White
Write-Host "      https://marketplace.visualstudio.com/manage" -ForegroundColor Gray

Write-Host "`n📚 For detailed instructions, see PUBLISHING-GUIDE.md" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
