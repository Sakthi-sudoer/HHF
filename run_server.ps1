# 🌟 LIGHTWEIGHT WINDOWS NATIVE WEB SERVER (POWERSHELL)
# Runs natively on Windows without requiring Node.js or Python.

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")

# Get Local IP Address
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object { $_.IPAddress } | Select-Object -First 1).IPAddress

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🚀 LOCAL DASHBOARD WEB SERVER IS RUNNING!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "• On your PC:      http://localhost:$port/" -ForegroundColor Cyan
if ($ip) {
    Write-Host "• On your Android:  http://$ip:$port/" -ForegroundColor Cyan
    Write-Host "  (Ensure your phone and PC are on the same Wi-Fi network)" -ForegroundColor DarkGray
}
Write-Host "• To stop server:   Press Ctrl+C" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green

try {
    $listener.Start()
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        $filePath = Join-Path $PSScriptRoot $urlPath
        
        # Replace forward slashes with backward slashes for Windows path compatibility
        $filePath = $filePath.Replace("/", "\")

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Match extension for MIME Content-Types
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css" }
                ".js"   { $response.ContentType = "application/javascript" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".json" { $response.ContentType = "application/json" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Error: $_"
} finally {
    $listener.Stop()
}
