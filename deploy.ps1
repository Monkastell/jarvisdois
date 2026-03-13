Write-Host "🚀 Iniciando deploy..." -ForegroundColor Cyan

Write-Host "📦 Apagando dist antiga..." -ForegroundColor Yellow
if (Test-Path dist) {
    Remove-Item -Recurse -Force dist
    Write-Host "   ✅ Dist removida" -ForegroundColor Green
}

Write-Host "🔨 Fazendo build..." -ForegroundColor Yellow
npm run build

Write-Host "✅ Build concluído. Arquivos em dist/:" -ForegroundColor Green
Get-ChildItem dist

Write-Host "📤 Fazendo deploy para Firebase..." -ForegroundColor Yellow
firebase deploy --only hosting

Write-Host "🎉 Deploy finalizado!" -ForegroundColor Green