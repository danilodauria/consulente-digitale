# Salvadati - rende di nuovo visibili i file nascosti (per esempio dai virus delle chiavette) su un'unità NON di sistema.
# Toglie solo gli attributi «nascosto», «di sistema» e «sola lettura»: il contenuto non cambia. Ideato da Danilo D'Auria - Codice MIT
Passo 1 3 'Controllo del piano'
$piano = $null
if ($CD_PARAM -match '^[a-f0-9]{12}$') {
    $f = Join-Path $CD_DATI "recupero\piano-$CD_PARAM.json"
    if (Test-Path $f) { $piano = Get-Content -LiteralPath $f -Raw -Encoding UTF8 | ConvertFrom-Json }
}
$vol = if ($piano) { [string]$piano.volume } else { '' }
if (-not $piano -or $vol -notmatch '^[A-Za-z]:\\$') { Errore "Unità non valida: deve avere una lettera (es. E:)" }
elseif ($vol.Substring(0, 2) -ieq $env:SystemDrive) { Errore 'Per sicurezza non si lavora sul disco di Windows' }
else {
    Passo 2 3 "File nascosti su $vol"
    $nascosti = @(Get-ChildItem -LiteralPath $vol -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { ($_.Attributes -band [IO.FileAttributes]::Hidden) -and $_.FullName -notmatch 'System Volume Information|\$RECYCLE\.BIN' })
    Nota "Trovati $($nascosti.Count) file e cartelle nascosti"
    foreach ($x in $nascosti) {
        try { $x.Attributes = $x.Attributes -band -bnot ([IO.FileAttributes]::Hidden -bor [IO.FileAttributes]::System -bor [IO.FileAttributes]::ReadOnly) } catch { $null = $_ }
    }
    Ok "Resi visibili: $($nascosti.Count)"
    Info 'visibili' $nascosti.Count
    Passo 3 3 'Collegamenti sospetti'
    $lnk = @(Get-ChildItem -LiteralPath $vol -Filter *.lnk -Force -ErrorAction SilentlyContinue)
    $ar = Join-Path $vol 'autorun.inf'
    if ($lnk.Count) { Attenzione "Trovati $($lnk.Count) collegamenti (.lnk) nella radice: se non li avete creati voi sono del virus. Fate il controllo antivirus della chiavetta." }
    if (Test-Path -LiteralPath $ar) { Attenzione 'Trovato autorun.inf: tipico dei virus delle chiavette. Il controllo antivirus lo toglie.' }
}
