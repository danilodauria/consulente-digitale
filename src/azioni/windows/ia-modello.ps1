# Scarica un modello di IA per Ollama. CD_PARAM = nome del modello (es. qwen3.5:4b)
$exe = (Get-Command ollama -ErrorAction SilentlyContinue).Source
if (-not $exe) { $exe = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe' }
if (-not (Test-Path $exe)) { Errore 'Ollama non è installato: premete prima «Installa il motore di IA».' }
else {
    Passo 1 2 'Avvio del motore'
    try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null } catch { Start-Process -FilePath $exe -ArgumentList 'serve' -WindowStyle Hidden; Start-Sleep -Seconds 5 }
    Passo 2 2 "Scarico $CD_PARAM (può richiedere diversi minuti)"
    $ultimo = ''
    & $exe pull $CD_PARAM 2>&1 | ForEach-Object { ("$_" -replace ([string][char]27 + '\[[0-9;?]*[A-Za-z]'), '') -split "`r" } | ForEach-Object {
        $s = $_.Trim(); if ($s -and $s -ne $ultimo) { $ultimo = $s; Write-Host $s }
    }
    if ($LASTEXITCODE -eq 0) { Ok 'Modello pronto: il cervello digitale ora pensa da solo, anche senza Internet.' } else { Errore 'Download non riuscito.' }
}
