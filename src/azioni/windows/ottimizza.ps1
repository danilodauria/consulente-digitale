# Ottimizzazione completa consigliata per Windows 10 e 11. Sicura e reversibile (punto di ripristino all'inizio).
Passo 1 8 'Punto di ripristino'
[void](Punto-Ripristino 'Consulente Digitale - prima dell''ottimizzazione')
$prima = Libero-MB
Passo 2 8 'Pulizia dei file temporanei'
foreach ($cart in @($env:TEMP, "$env:SystemRoot\Temp")) {
    Get-ChildItem -LiteralPath $cart -Force -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
Remove-Item "$env:SystemRoot\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
Ok "Spazio liberato: $((Libero-MB) - $prima) MB"
Passo 3 8 'Disco: TRIM (SSD) o deframmentazione (disco meccanico)'
try { Optimize-Volume -DriveLetter $env:SystemDrive.Substring(0, 1) -Verbose -ErrorAction Stop 4>&1 | ForEach-Object { Write-Host "  $_" } } catch { Nota "Ottimizzazione del disco: $($_.Exception.Message)" }
Passo 4 8 'Sensore di memoria (pulizia automatica)'
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '01' 1
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '04' 1
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '08' 1
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '256' 30
Ok 'Sensore di memoria attivo: temporanei e cestino oltre 30 giorni si puliscono da soli.'
Passo 5 8 'Piano energetico'
$batteria = @(Get-CimInstance Win32_Battery).Count -gt 0
if ($batteria) { [void](Nativo 'powercfg.exe' @('/setactive', 'SCHEME_BALANCED')); Ok 'Portatile: piano «Bilanciato».' }
else { [void](Nativo 'powercfg.exe' @('/setactive', 'SCHEME_MIN')); Ok 'Computer fisso: piano «Prestazioni elevate».' }
Passo 6 8 'Programmi all''avvio'
$avvio = @(Get-CimInstance Win32_StartupCommand)
Nota "Programmi che partono con Windows: $($avvio.Count)"
foreach ($a in $avvio) { Voce 'avvio' $a.Name $a.Location '' $a.Command 'Si può spegnere da Gestione attività → Avvio' }
Passo 7 8 'Protezione e cache'
try { Update-MpSignature -ErrorAction Stop; Ok 'Definizioni di Microsoft Defender aggiornate.' } catch { $null = $_ }
Clear-DnsClientCache -ErrorAction SilentlyContinue; Ok 'Cache DNS svuotata.'
Passo 8 8 'Suggerimenti e pubblicità di Windows spenti'
$cdm = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
Salva-Registro @($cdm) 'ottimizza'
foreach ($k in @('SubscribedContent-338388Enabled', 'SubscribedContent-338389Enabled', 'SubscribedContent-353694Enabled', 'SubscribedContent-353696Enabled', 'SilentInstalledAppsEnabled', 'SystemPaneSuggestionsEnabled', 'SoftLandingEnabled')) {
    Imposta-Registro $cdm $k 0
}
Ok 'Niente più app installate da sole né consigli pubblicitari nel menu Start.'
Info 'riavvio' 'consigliato'
Ok 'Ottimizzazione completata. Riavviate quando potete.'
