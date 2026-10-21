# Antivirus - aggiorna le firme di Microsoft Defender (incluso in Windows, gratuito). Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 2 'Quale antivirus protegge il PC'
$altri = @()
try { $altri = @(Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop | Where-Object { $_.displayName -notmatch 'Defender' }) } catch { $null = $_ }
foreach ($a in $altri) { Nota "Antivirus installato: $($a.displayName) (si aggiorna da solo)" }
$mp = $null
try { $mp = Get-MpComputerStatus -ErrorAction Stop } catch { $null = $_ }
if (-not $mp) { Errore 'Microsoft Defender non risponde: forse è spento da un altro antivirus.' }
else {
    if ($mp.AMRunningMode -match 'Passive') { Nota 'Defender è in modalità «passiva»: la protezione principale è l''altro antivirus' }
    Passo 2 2 'Scarico le firme dei virus più recenti'
    $prima = $mp.AntivirusSignatureVersion
    $fatto = $false
    try { Update-MpSignature -ErrorAction Stop; $fatto = $true } catch { Nota "Aggiornamento diretto non riuscito: provo con MpCmdRun ($($_.Exception.Message))" }
    if (-not $fatto) {
        $cmd = Join-Path $env:ProgramFiles 'Windows Defender\MpCmdRun.exe'
        if (Test-Path $cmd) { $c = Nativo $cmd @('-SignatureUpdate'); $fatto = ($c -eq 0) }
    }
    $dopo = (Get-MpComputerStatus).AntivirusSignatureVersion
    if ($fatto) { Ok "Firme aggiornate: $prima → $dopo"; Info firme $dopo } else { Errore 'Aggiornamento non riuscito: controllate la connessione a Internet' }
}
