# Antivirus - controllo con Microsoft Defender: rapido, completo o delle chiavette/dischi esterni.
# Le minacce trovate vanno in quarantena (Sicurezza di Windows → Cronologia protezione, si possono ripristinare).
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 4 'Preparo il controllo'
$tipo = $CD_PARAM; if (@('rapida', 'completa', 'chiavette') -notcontains $tipo) { $tipo = 'rapida' }
$ok = $true
try { $null = Get-MpComputerStatus -ErrorAction Stop } catch { $ok = $false; Errore 'Microsoft Defender non è attivo su questo PC (forse c''è un altro antivirus: usate quello).' }
if ($ok) {
    Passo 2 4 'Aggiorno le firme dei virus'
    try { Update-MpSignature -ErrorAction Stop; Ok 'Firme aggiornate' } catch { Nota 'Firme non aggiornate (senza Internet?): controllo con quelle che ci sono' }
    $inizio = Get-Date
    $testo = 'Controllo rapido (pochi minuti)'
    if ($tipo -eq 'completa') { $testo = 'Controllo completo di tutto il disco (può durare ore)' }
    if ($tipo -eq 'chiavette') { $testo = 'Controllo delle chiavette e dei dischi esterni' }
    Passo 3 4 $testo
    try {
        if ($tipo -eq 'completa') { Start-MpScan -ScanType FullScan -ErrorAction Stop }
        elseif ($tipo -eq 'rapida') { Start-MpScan -ScanType QuickScan -ErrorAction Stop }
        else {
            $unita = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2' | ForEach-Object { $_.DeviceID + '\' })
            $unita += @(Get-Disk -ErrorAction SilentlyContinue | Where-Object { $_.BusType -eq 'USB' } | Get-Partition -ErrorAction SilentlyContinue | Where-Object { $_.DriveLetter } | ForEach-Object { "$($_.DriveLetter):\" })
            $unita = @($unita | Select-Object -Unique)
            if ($unita.Count -eq 0) { Attenzione 'Nessuna chiavetta o disco esterno collegato' }
            foreach ($u in $unita) { Nota "Controllo $u"; Start-MpScan -ScanType CustomScan -ScanPath $u -ErrorAction Stop }
        }
    } catch { Errore "Controllo interrotto: $($_.Exception.Message)" }
    Passo 4 4 'Risultato'
    $trovate = @(Get-MpThreatDetection -ErrorAction SilentlyContinue | Where-Object { $_.InitialDetectionTime -ge $inizio })
    $nomi = @{}
    foreach ($m in Get-MpThreat -ErrorAction SilentlyContinue) { $nomi[[string]$m.ThreatID] = $m.ThreatName }
    if ($trovate.Count -eq 0) { Ok 'Nessuna minaccia trovata'; Voce 'antivirus' 'Minacce trovate' '0' 'ok' '' '' }
    foreach ($t in $trovate) {
        $nome = $nomi[[string]$t.ThreatID]; if (-not $nome) { $nome = "Minaccia $($t.ThreatID)" }
        $dove = (@($t.Resources) -join ', ') -replace '^file:_', ''
        $stato = 'attenzione'; if ($t.ActionSuccess) { $stato = 'ok' }
        Voce 'antivirus' $nome $dove $stato '' $(if ($t.ActionSuccess) { 'Messa in quarantena' } else { 'Serve un intervento: provate il controllo all''avvio' })
    }
    Info minacce $trovate.Count
}
