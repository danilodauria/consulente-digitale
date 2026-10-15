# Consulente Digitale - avvio su Windows (cerca Python 3.7+ oppure scarica quello ufficiale, poi apre il programma)
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
$ErrorActionPreference = 'Stop'
$QUI = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:CD_SHARE_DIR = Join-Path $QUI 'app'
$server = Join-Path $env:CD_SHARE_DIR 'server\cd_server.py'
function Avviso($t) { Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show($t, 'Consulente Digitale') | Out-Null }
function Python-Valido($p) {
    if (-not $p -or -not (Test-Path $p) -or $p -match 'WindowsApps') { return $false }
    try { $v = & $p -c "import sys;print(sys.version_info[0]*100+sys.version_info[1])" 2>$null; return ([int]$v -ge 307) } catch { return $false }
}
$py = $null
$candidati = @((Join-Path $QUI 'python\pythonw.exe'))
foreach ($c in @('pythonw', 'python')) { $x = Get-Command $c -ErrorAction SilentlyContinue; if ($x) { $candidati += $x.Source } }
$launcher = Get-Command py -ErrorAction SilentlyContinue
if ($launcher) { try { $p = & py -3 -c "import sys;print(sys.executable)" 2>$null; if ($p) { $candidati += ($p -replace 'python\.exe$', 'pythonw.exe'); $candidati += $p } } catch { $null = $_ } }
foreach ($c in $candidati) { $pw = $c -replace 'python\.exe$', 'pythonw.exe'; if (Python-Valido $c) { if (Test-Path $pw) { $py = $pw } else { $py = $c }; break } }
if (-not $py) {
    # Python ufficiale «embeddable» da python.org, controllato con la firma digitale della Python Software Foundation
    $arch = 'amd64'; if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $arch = 'arm64' } elseif (-not [Environment]::Is64BitOperatingSystem) { $arch = 'win32' }
    $ver = '3.12.10'
    $url = "https://www.python.org/ftp/python/$ver/python-$ver-embed-$arch.zip"
    $zip = Join-Path $env:TEMP "python-$ver-embed.zip"
    $dest = Join-Path $QUI 'python'
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $dest -Force
        Remove-Item $zip -Force
        $firma = Get-AuthenticodeSignature (Join-Path $dest 'python.exe')
        if ($firma.Status -ne 'Valid' -or $firma.SignerCertificate.Subject -notmatch 'Python Software Foundation') { Remove-Item $dest -Recurse -Force; throw 'firma digitale di Python non valida' }
        $py = Join-Path $dest 'pythonw.exe'
    } catch {
        Avviso "Per funzionare il Consulente Digitale ha bisogno di Python (gratuito).`n`nNon sono riuscito a scaricarlo: $($_.Exception.Message)`n`nCollegatevi a Internet e riprovate, oppure installate Python da python.org o dal Microsoft Store."
        exit 1
    }
}
Start-Process -FilePath $py -ArgumentList @("`"$server`"", '--apri') -WindowStyle Hidden
