# Kit di emergenza - prepara una chiavetta avviabile (UEFI) con SystemRescue (system-rescue.org, GPL) e Neura Soccorso.
# ATTENZIONE: la chiavetta scelta viene CANCELLATA. Prima di scrivere si ricontrollano numero, bus e dimensione.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 6 'Controllo della chiavetta'
$piano = $null
if ($CD_PARAM -match '^[a-f0-9]{12}$') {
    $f = Join-Path $CD_DATI "kit\piano-$CD_PARAM.json"
    if (Test-Path $f) { $piano = Get-Content -LiteralPath $f -Raw -Encoding UTF8 | ConvertFrom-Json }
}
$K = Join-Path $CD_DATI 'kit'
$disco = $null
if (-not $piano) { Errore 'Piano non trovato: ripetete la scelta della chiavetta' }
else {
    $disco = Get-Disk -Number ([int]$piano.numero) -ErrorAction SilentlyContinue
    if (-not $disco) { Errore 'La chiavetta non è più collegata'; $disco = $null }
    elseif ([int64]$disco.Size -ne [int64]$piano.dimensione -or @('USB', 'SD', 'MMC') -notcontains [string]$disco.BusType -or $disco.IsBoot -or $disco.IsSystem) {
        Errore 'La chiavetta è cambiata (dimensione o tipo diversi) o è un disco del sistema: ripetete la scelta'; $disco = $null
    } else { Ok "Chiavetta: $($disco.FriendlyName) ($([math]::Round($disco.Size / 1e9)) GB, $($disco.BusType))" }
}

$iso = $null
if ($disco) {
    Passo 2 6 'SystemRescue: scarico il sistema di soccorso dal sito ufficiale'
    $iso = [string]$piano.iso
    New-Item -ItemType Directory -Force -Path (Split-Path $iso) | Out-Null
    $buono = $false
    if (Test-Path $iso) { $buono = ((Get-FileHash -LiteralPath $iso -Algorithm SHA256).Hash -eq ([string]$piano.iso_sha256).ToUpper()) }
    if ($buono) { Ok 'Già scaricato e verificato' }
    else {
        Remove-Item -LiteralPath "$iso.part" -ErrorAction SilentlyContinue
        try {
            $j = Start-BitsTransfer -Source $piano.iso_url -Destination "$iso.part" -Asynchronous -DisplayName 'Consulente Digitale - SystemRescue' -ErrorAction Stop
            while (@('Transferring', 'Connecting', 'Queued', 'TransientError') -contains [string]$j.JobState) {
                Start-Sleep -Seconds 5
                if ($j.BytesTotal -gt 0) { Write-Host "  … $([int](100 * $j.BytesTransferred / $j.BytesTotal))%" }
            }
            if ([string]$j.JobState -eq 'Transferred') { Complete-BitsTransfer -BitsJob $j } else { Remove-BitsTransfer -BitsJob $j; throw 'BITS' }
        } catch {
            Nota 'Download con BITS non riuscito: riprovo in modo semplice'
            $ProgressPreference = 'SilentlyContinue'
            try { Invoke-WebRequest -Uri $piano.iso_url -OutFile "$iso.part" -UseBasicParsing -ErrorAction Stop } catch { Errore "Download non riuscito: $($_.Exception.Message)" }
        }
        if (Test-Path "$iso.part") { Move-Item -LiteralPath "$iso.part" -Destination $iso -Force }
        if ((Test-Path $iso) -and (Get-FileHash -LiteralPath $iso -Algorithm SHA256).Hash -eq ([string]$piano.iso_sha256).ToUpper()) { Ok 'Scaricato e verificato (SHA-256)'; $buono = $true }
        else { Remove-Item -LiteralPath $iso -ErrorAction SilentlyContinue; Errore 'Il file scaricato non è integro (SHA-256 diverso): riprovate' }
    }
    if (-not $buono) { $disco = $null }
}

$lettera = $null
if ($disco) {
    Passo 3 6 "Cancello e preparo la chiavetta (FAT32, nome $($piano.etichetta))"
    try {
        if ($disco.IsOffline) { Set-Disk -Number $disco.Number -IsOffline $false }
        if ($disco.IsReadOnly) { Set-Disk -Number $disco.Number -IsReadOnly $false }
        if ($disco.PartitionStyle -ne 'RAW') { Clear-Disk -Number $disco.Number -RemoveData -RemoveOEM -Confirm:$false -ErrorAction Stop }
        Initialize-Disk -Number $disco.Number -PartitionStyle MBR -ErrorAction Stop
        # Windows formatta in FAT32 al massimo 32 GB: la partizione si ferma a 31 GB (bastano e avanzano)
        $dim = [math]::Min([int64]$disco.Size - 2097152, [int64]31 * 1073741824)
        $p = New-Partition -DiskNumber $disco.Number -Size $dim -IsActive -AssignDriveLetter -ErrorAction Stop
        Start-Sleep -Seconds 2
        $null = Format-Volume -Partition $p -FileSystem FAT32 -NewFileSystemLabel ([string]$piano.etichetta) -Confirm:$false -Force -ErrorAction Stop
        $lettera = (Get-Partition -DiskNumber $disco.Number -PartitionNumber $p.PartitionNumber).DriveLetter
        if (-not $lettera) { throw 'nessuna lettera di unità' }
        Ok "Chiavetta pronta: $($lettera):"
    } catch { Errore "Preparazione non riuscita: $($_.Exception.Message)"; $lettera = $null }
}

if ($lettera) {
    $usb = "$($lettera):\"
    Passo 4 6 'Copio SystemRescue sulla chiavetta'
    $img = $null
    try {
        $img = Mount-DiskImage -ImagePath $iso -PassThru -ErrorAction Stop
        $li = ($img | Get-Volume).DriveLetter
        $c = Nativo 'robocopy.exe' @("$($li):\", $usb, '/E', '/R:2', '/W:2', '/NFL', '/NDL', '/NJH', '/NP')
        if ($c -ge 8) { Errore "Copia non riuscita (robocopy $c)" } else { Ok 'SystemRescue copiato' }
    } catch { Errore "Non riesco ad aprire il file ISO: $($_.Exception.Message)" }
    finally { if ($img) { Dismount-DiskImage -ImagePath $iso | Out-Null } }

    if ($global:CD_CODICE -eq 0) {
        Passo 5 6 'Aggiungo Neura Soccorso (diagnosi e riparazione automatica)'
        $n = Join-Path $usb 'neura'
        New-Item -ItemType Directory -Force -Path $n | Out-Null
        foreach ($d in @('server', 'web', 'azioni')) {
            $s = Join-Path $piano.neura $d
            if (Test-Path $s) { $null = Nativo 'robocopy.exe' @($s, (Join-Path $n $d), '/E', '/XD', '__pycache__', '/NFL', '/NDL', '/NJH', '/NJS', '/NP') }
        }
        foreach ($f in @('VERSION', 'LICENSE', 'LICENZA-CONTENUTI.md')) {
            foreach ($b in @($piano.neura, (Split-Path $piano.neura))) { $x = Join-Path $b $f; if (Test-Path $x) { Copy-Item $x $n; break } }
        }
        Copy-Item (Join-Path $K 'avvia-neura.sh') $n
        New-Item -ItemType Directory -Force -Path (Join-Path $usb 'sysrescue.d') | Out-Null
        Copy-Item (Join-Path $K '500-neura.yaml') (Join-Path $usb 'sysrescue.d')
        Copy-Item (Join-Path $K 'LEGGIMI-KIT.txt') $usb
        Ok 'Neura Soccorso aggiunta'
        Passo 6 6 'Controllo finale'
        if ((Test-Path (Join-Path $usb 'EFI\boot\bootx64.efi')) -and (Test-Path (Join-Path $usb 'sysrescue.d\500-neura.yaml'))) {
            Info kit pronto
            Ok 'Kit di emergenza pronto (avvio UEFI). Potete togliere la chiavetta: tenetela in un posto sicuro.'
            Nota 'Se un PC non la vede: nel BIOS/UEFI disattivate «Secure Boot» il tempo necessario.'
        } else { Errore 'Mancano dei file di avvio sulla chiavetta: ripetete' }
    }
}
