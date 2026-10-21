# Salvadati - riparazione del file system di un'unità NON di sistema con CHKDSK. Da usare DOPO aver salvato i dati:
# CHKDSK può eliminare i file rovinati. Sulle unità RAW non serve (i dati si recuperano con la ricerca approfondita).
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 2 'Controllo del piano'
$piano = $null
if ($CD_PARAM -match '^[a-f0-9]{12}$') {
    $f = Join-Path $CD_DATI "recupero\piano-$CD_PARAM.json"
    if (Test-Path $f) { $piano = Get-Content -LiteralPath $f -Raw -Encoding UTF8 | ConvertFrom-Json }
}
$vol = if ($piano) { [string]$piano.volume } else { '' }
if (-not $piano -or $vol -notmatch '^[A-Za-z]:\\$') { Errore 'Unità non valida: deve avere una lettera (es. E:)' }
elseif ($vol.Substring(0, 2) -ieq $env:SystemDrive) { Errore 'Il disco di Windows si ripara con «Ripara i file di sistema»' }
elseif ($piano.sorgente_stato -eq 'raw') { Errore "Unità RAW: CHKDSK non può ripararla. Recuperate prima i dati con la ricerca approfondita." }
else {
    Passo 2 2 "CHKDSK $($vol.Substring(0,2)) /F"
    $c = Nativo 'chkdsk.exe' @($vol.Substring(0, 2), '/F', '/X')
    if ($c -eq 0) { Ok 'Nessun errore o errori corretti' } else { Attenzione "CHKDSK ha terminato con il codice $c" }
}
