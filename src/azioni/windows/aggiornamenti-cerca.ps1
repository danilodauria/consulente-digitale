# Cerca gli aggiornamenti: Windows Update (sistema e driver), programmi (winget). Non modifica nulla.
Passo 1 3 'Windows Update (sistema, sicurezza, driver)'
$n = 0
try {
    $wu = Cerca-WindowsUpdate
    foreach ($u in $wu.risultato.Updates) {
        $fonte = 'sistema'; if ($u.Type -eq 2) { $fonte = 'driver' }
        $kb = ''; if ($u.KBArticleIDs.Count -gt 0) { $kb = 'KB' + $u.KBArticleIDs.Item(0) }
        $mb = [math]::Round($u.MaxDownloadSize / 1048576)
        Voce $fonte $u.Title '' $kb $u.Identity.UpdateID "$mb MB"
        $n++
    }
    Ok "Windows Update: $n"
} catch { Attenzione "Windows Update non risponde: $($_.Exception.Message)" }

Passo 2 3 'Programmi installati (winget)'
$m = 0
if (Prepara-Winget) {
    $righe = & winget upgrade --include-unknown --accept-source-agreements --disable-interactivity 2>$null | ForEach-Object { "$_" }
    $i = 0; $testa = -1
    for ($i = 0; $i -lt $righe.Count; $i++) { if ($righe[$i] -match '^-{10,}') { $testa = $i - 1; break } }
    if ($testa -ge 0) {
        $h = $righe[$testa]
        $col = @(); $mt = [regex]::Matches($h, '(?<=^|\s)\S'); foreach ($x in $mt) { $col += $x.Index }
        for ($j = $testa + 2; $j -lt $righe.Count; $j++) {
            $r = $righe[$j]
            if ($r.Length -lt $col[$col.Count - 1] -or $r -match '^\d+ ') { continue }
            $campi = @()
            for ($c = 0; $c -lt $col.Count; $c++) {
                $ini = $col[$c]; $fin = $r.Length; if ($c + 1 -lt $col.Count) { $fin = [math]::Min($col[$c + 1], $r.Length) }
                if ($ini -lt $r.Length) { $campi += $r.Substring($ini, $fin - $ini).Trim() } else { $campi += '' }
            }
            if ($campi.Count -ge 4 -and $campi[1]) { Voce 'programmi' $campi[0] $campi[2] $campi[3] $campi[1] 'winget'; $m++ }
        }
    }
    Ok "Programmi da aggiornare: $m"
} else {
    Nota 'winget non disponibile: installate «Programma di installazione app» dal Microsoft Store.'
}

Passo 3 3 'Microsoft Store e riavvio in sospeso'
Nota 'Le app del Microsoft Store si aggiornano con «Installa» (fonte «negozio»).'
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') {
    Info 'riavvio' 'si'; Attenzione 'Windows aspetta già un riavvio per completare aggiornamenti precedenti.'
}
Info 'totale' ($n + $m)
