# Installa i driver da Windows Update (fonte ufficiale Microsoft) e fa ricercare le periferiche.
Passo 1 3 'Punto di ripristino'
[void](Punto-Ripristino 'Consulente Digitale - prima dei driver')
Passo 2 3 'Driver da Windows Update'
$riavvio = $false
try {
    $wu = Cerca-WindowsUpdate "IsInstalled=0 and IsHidden=0 and Type='Driver'"
    if ($wu.risultato.Updates.Count -eq 0) { Ok 'Nessun driver nuovo su Windows Update.' }
    foreach ($u in $wu.risultato.Updates) {
        Write-Host "  → $($u.Title)"
        if (-not $u.EulaAccepted) { $u.AcceptEula() }
        $uno = New-Object -ComObject Microsoft.Update.UpdateColl; [void]$uno.Add($u)
        $sc = $wu.sessione.CreateUpdateDownloader(); $sc.Updates = $uno; [void]$sc.Download()
        $ins = $wu.sessione.CreateUpdateInstaller(); $ins.Updates = $uno; $r = $ins.Install()
        if ($r.ResultCode -eq 2 -or $r.ResultCode -eq 3) { Ok 'Installato' } else { Errore "Non riuscito (codice $($r.ResultCode))" }
        if ($r.RebootRequired) { $riavvio = $true }
    }
} catch { Errore "Windows Update: $($_.Exception.Message)" }
Passo 3 3 'Ricerca delle periferiche'
[void](Nativo 'pnputil.exe' @('/scan-devices'))
$rimasti = @(Get-CimInstance Win32_PnPEntity -Filter 'ConfigManagerErrorCode<>0' | Where-Object { $_.ConfigManagerErrorCode -ne 45 })
if ($rimasti.Count -gt 0) {
    Attenzione "Restano $($rimasti.Count) dispositivi senza driver: usate lo strumento del produttore (pagina Driver)."
    foreach ($d in $rimasti) { Nota $d.Name }
} else { Ok 'Tutti i dispositivi hanno il driver.' }
if ($riavvio) { Info 'riavvio' 'si' }
