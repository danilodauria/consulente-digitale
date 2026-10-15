# Consulente Digitale - funzioni comuni degli script per Windows (PowerShell 5.1 o successivo)
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
# Regola: negli script non si usa mai «exit»; in caso di errore si imposta $global:CD_CODICE = 1
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { $null = $_ }
$ProgressPreference = 'SilentlyContinue'
if (-not $CD_DATI) { $CD_DATI = Join-Path $env:APPDATA 'ConsulenteDigitale' }
New-Item -ItemType Directory -Force -Path $CD_DATI -ErrorAction SilentlyContinue | Out-Null

function Passo($n, $di, $testo) { Write-Host "@@PASSO|$n|$di|$testo" }
function Voce($fonte, $nome, $attuale, $nuova, $id, $nota) {
    $p = @($fonte, $nome, $attuale, $nuova, $id, $nota) | ForEach-Object { ("$_" -replace '[\r\n|]', ' ').Trim() }
    Write-Host ("@@VOCE|" + ($p -join '|'))
}
function Info($chiave, $valore) { Write-Host "@@INFO|$chiave|$valore" }
function Ok($t) { Write-Host "  ✔ $t" }
function Nota($t) { Write-Host "  • $t" }
function Attenzione($t) { Write-Host "  ⚠ $t" }
function Errore($t) { Write-Host "  ✖ $t"; $global:CD_CODICE = 1 }
function Sono-Amministratore {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function C-E($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Libero-MB { $d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"; return [math]::Round($d.FreeSpace / 1048576) }

# Esegue un programma esterno e scrive l'output pulito (senza barre di avanzamento e caratteri nulli)
function Nativo {
    param([string]$Programma, [string[]]$Argomenti)
    & $Programma @Argomenti 2>&1 | ForEach-Object {
        $s = ("$_" -replace "`0", '').TrimEnd()
        if ($s -eq '' -or $s -match '[█▒■]' -or $s -match '^\s*[-\\|/]\s*$' -or $s -match '^\s*\d{1,3}(\.\d)?\s*%\s*$') { return }
        Write-Host $s
    }
    return $LASTEXITCODE
}

# winget: in alcuni Windows va prima registrato (App Installer)
function Prepara-Winget {
    if (C-E 'winget') { return $true }
    try { Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction Stop } catch { $null = $_ }
    $wg = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\winget.exe'
    if (Test-Path $wg) { Set-Alias -Name winget -Value $wg -Scope Global; return $true }
    return $false
}

function Imposta-Registro($percorso, $nome, $valore, $tipo = 'DWord') {
    if (-not (Test-Path $percorso)) { New-Item -Path $percorso -Force | Out-Null }
    New-ItemProperty -Path $percorso -Name $nome -Value $valore -PropertyType $tipo -Force | Out-Null
}

function Salva-Registro($chiavi, $nomeFile) {
    $dest = Join-Path $CD_DATI ("copie\" + $nomeFile + "-" + (Get-Date -Format 'yyyyMMdd-HHmm'))
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $i = 0
    foreach ($k in $chiavi) {
        $i++
        $reg = $k -replace '^HKCU:\\', 'HKCU\' -replace '^HKLM:\\', 'HKLM\'
        & reg.exe export $reg (Join-Path $dest "$i.reg") /y 2>$null | Out-Null
    }
    Nota "Copia delle impostazioni precedenti: $dest (doppio clic su un file .reg per ripristinarle)"
}

function Punto-Ripristino($descrizione) {
    try {
        Enable-ComputerRestore -Drive "$($env:SystemDrive)\" -ErrorAction SilentlyContinue
        Imposta-Registro 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore' 'SystemRestorePointCreationFrequency' 0
        Checkpoint-Computer -Description $descrizione -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop
        Ok "Punto di ripristino creato: «$descrizione»"
        return $true
    } catch {
        Attenzione "Punto di ripristino non creato: $($_.Exception.Message)"
        return $false
    }
}

# Windows Update tramite le API di sistema (nessun modulo da scaricare)
function Cerca-WindowsUpdate($criterio = 'IsInstalled=0 and IsHidden=0') {
    $sessione = New-Object -ComObject Microsoft.Update.Session
    $sessione.ClientApplicationID = 'Consulente Digitale'
    $cercatore = $sessione.CreateUpdateSearcher()
    $cercatore.Online = $true
    return @{ sessione = $sessione; risultato = $cercatore.Search($criterio) }
}
