# 🌟 AUTOMATIC GIT WATCHER & AUTO-PUSHER
# Monitors local modifications and synchronizes them to GitHub in the background.

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🚀 AUTOMATIC GIT WATCHER & SYNC PATH IS RUNNING!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "• Active Workspace: $PSScriptRoot" -ForegroundColor Cyan
Write-Host "• Check Interval:   Every 10 seconds" -ForegroundColor Cyan
Write-Host "• To terminate:     Press Ctrl+C or stop task" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green

while ($true) {
    # Check if there are modified or untracked changes
    $changes = git status --porcelain
    if ($changes) {
        Write-Host ""
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Change detected! Syncing modifications..." -ForegroundColor Yellow
        
        # Sync changes
        git add .
        git commit -m "auto: sync workspace modifications"
        git push
        
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Successfully pushed to GitHub!" -ForegroundColor Green
    }
    
    Start-Sleep -Seconds 10
}
