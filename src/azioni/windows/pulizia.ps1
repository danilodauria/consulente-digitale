# Pulizia sicura: file temporanei, cache di Windows Update, ottimizzazione recapito, componenti superati.
$prima = Libero-MB
Passo 1 4 'File temporanei'
foreach ($cart in @($env:TEMP, "$env:SystemRoot\Temp")) {
    Get-ChildItem -LiteralPath $cart -Force -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
Ok 'Temporanei eliminati (quelli in uso restano).'
Passo 2 4 'Cache di Windows Update e ottimizzazione recapito'
Stop-Service -Name @('wuauserv', 'bits') -Force -ErrorAction SilentlyContinue
Remove-Item "$env:SystemRoot\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
Start-Service -Name @('bits', 'wuauserv') -ErrorAction SilentlyContinue
try { Delete-DeliveryOptimizationCache -Force -ErrorAction Stop; Ok 'Cache di ottimizzazione recapito svuotata.' } catch { $null = $_ }
Passo 3 4 'Componenti di Windows superati (può richiedere alcuni minuti)'
[void](Nativo 'dism.exe' @('/Online', '/Cleanup-Image', '/StartComponentCleanup', '/NoRestart'))
Passo 4 4 'Miniature e segnalazioni di errore'
Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:ProgramData\Microsoft\Windows\WER\ReportArchive\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:ProgramData\Microsoft\Windows\WER\ReportQueue\*" -Recurse -Force -ErrorAction SilentlyContinue
$dopo = Libero-MB
Info 'liberati_mb' ($dopo - $prima)
Ok "Spazio liberato: $($dopo - $prima) MB. Il Cestino non è stato toccato."
