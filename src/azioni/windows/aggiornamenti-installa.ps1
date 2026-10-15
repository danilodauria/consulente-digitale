# Scarica e installa: Windows Update (sistema e/o driver), programmi con winget, app del Microsoft Store.
$fonti = " $CD_PARAM "; if (-not $CD_PARAM) { $fonti = ' sistema programmi driver firmware negozio ' }
function Vuole($f) { return $fonti.Contains(" $f ") }
$riavvio = $false

if ((Vuole 'sistema') -or (Vuole 'driver') -or (Vuole 'firmware')) {
    Passo 1 3 'Windows Update: cerco'
    try {
        $wu = Cerca-WindowsUpdate
        $scelti = New-Object -ComObject Microsoft.Update.UpdateColl
        foreach ($u in $wu.risultato.Updates) {
            $driver = ($u.Type -eq 2)
            if (($driver -and ((Vuole 'driver') -or (Vuole 'firmware'))) -or ((-not $driver) -and (Vuole 'sistema'))) {
                if (-not $u.EulaAccepted) { $u.AcceptEula() }
                [void]$scelti.Add($u)
            }
        }
        $tot = $scelti.Count
        if ($tot -eq 0) { Ok 'Windows è già aggiornato.' }
        $k = 0
        foreach ($u in $scelti) {
            $k++
            Passo 1 3 "Windows Update $k di ${tot}: $($u.Title)"
            $uno = New-Object -ComObject Microsoft.Update.UpdateColl; [void]$uno.Add($u)
            $sc = $wu.sessione.CreateUpdateDownloader(); $sc.Updates = $uno
            $d = $sc.Download()
            if ($d.ResultCode -ne 2 -and $d.ResultCode -ne 3) { Errore "Download non riuscito (codice $($d.ResultCode))"; continue }
            $ins = $wu.sessione.CreateUpdateInstaller(); $ins.Updates = $uno
            $r = $ins.Install()
            if ($r.ResultCode -eq 2 -or $r.ResultCode -eq 3) { Ok 'Installato' } else { Errore "Installazione non riuscita (codice $($r.ResultCode), HRESULT $($r.HResult))" }
            if ($r.RebootRequired) { $riavvio = $true }
        }
    } catch { Errore "Windows Update: $($_.Exception.Message)" }
}

if (Vuole 'programmi') {
    Passo 2 3 'Programmi (winget)'
    if (Prepara-Winget) {
        $c = Nativo 'winget' @('upgrade', '--all', '--silent', '--include-unknown', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
        Ok 'Programmi aggiornati (quelli aperti si aggiornano alla chiusura).'
    } else { Nota 'winget non disponibile.' }
}

if (Vuole 'negozio') {
    Passo 3 3 'App del Microsoft Store'
    try {
        Get-CimInstance -Namespace 'root\cimv2\mdm\dmmap' -ClassName 'MDM_EnterpriseModernAppManagement_AppManagement01' -ErrorAction Stop |
            Invoke-CimMethod -MethodName UpdateScanMethod -ErrorAction Stop | Out-Null
        Ok 'Richiesta inviata al Microsoft Store: le app si aggiornano nei prossimi minuti.'
    } catch { Nota 'Aprite Microsoft Store → Raccolta → «Ottieni aggiornamenti».' }
}
if ($riavvio -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')) {
    Info 'riavvio' 'si'; Attenzione 'Per completare serve un riavvio: salvate il lavoro e riavviate.'
}
