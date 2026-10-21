# Antivirus - Strumento di rimozione software dannoso di Microsoft (MRT, incluso in Windows e aggiornato ogni mese da Windows Update).
# Controllo completo in automatico, rimozione delle minacce trovate. Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 2 'Strumento di rimozione malware (MRT)'
$mrt = Join-Path $env:windir 'System32\MRT.exe'
if (-not (Test-Path $mrt)) { Errore 'MRT non presente: fate gli aggiornamenti di Windows (arriva con Windows Update)' }
else {
    Nota "Versione: $((Get-Item $mrt).VersionInfo.FileVersion)"
    Passo 2 2 'Controllo completo in corso (può durare più di un''ora)'
    $log = Join-Path $env:windir 'debug\mrt.log'
    $righe = 0; if (Test-Path $log) { $righe = @(Get-Content -LiteralPath $log -ErrorAction SilentlyContinue).Count }
    $p = Start-Process -FilePath $mrt -ArgumentList '/Q', '/F:Y' -PassThru -WindowStyle Hidden
    $inizio = Get-Date
    while (-not $p.HasExited) { Start-Sleep -Seconds 30; Write-Host "  … controllo in corso da $([int]((Get-Date) - $inizio).TotalMinutes) min" }
    $nuove = @(); if (Test-Path $log) { $nuove = @(Get-Content -LiteralPath $log -ErrorAction SilentlyContinue | Select-Object -Skip $righe) }
    $res = $nuove | Where-Object { $_ -match 'Return code|Results Summary|detected|infected|removed' } | Select-Object -Last 8
    foreach ($r in $res) { Write-Host "  $r" }
    switch ($p.ExitCode) {
        0 { Ok 'Nessuna infezione trovata' }
        6 { Ok 'Minacce trovate e rimosse' }
        7 { Attenzione 'Minacce trovate e rimosse in parte: riavviate il PC e ripetete' }
        8 { Attenzione 'Minacce trovate e rimosse: riavviate il PC per finire' }
        default { Nota "MRT ha finito con il codice $($p.ExitCode) (dettagli in $log)" }
    }
    Info mrt $p.ExitCode
}
