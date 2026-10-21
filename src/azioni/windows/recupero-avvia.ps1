# Salvadati - ricerca e recupero dei file (foto, documenti, video, musica) con PhotoRec in automatico.
# L'unità da salvare si LEGGE soltanto; i file trovati vanno nella cartella di lavoro su UN ALTRO disco.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT. PhotoRec: CGSecurity, licenza GPL.
Passo 1 4 'Controllo del piano di recupero'
$piano = $null
if ($CD_PARAM -match '^[a-f0-9]{12}$') {
    $f = Join-Path $CD_DATI "recupero\piano-$CD_PARAM.json"
    if (Test-Path $f) { $piano = Get-Content -LiteralPath $f -Raw -Encoding UTF8 | ConvertFrom-Json }
}
if (-not $piano) { Errore "Piano di recupero non trovato: ripetete l'analisi" }
else {
    Nota "Unità: $($piano.dispositivo) · ricerca $($piano.modo) ($($piano.spazio))"
    Nota "Cartella di lavoro: $($piano.lavoro)"
    Passo 2 4 'Motore di ricerca'
    $pr = Trova-PhotoRec
    if (-not $pr -and (Prepara-Winget)) {
        Nota 'Installo PhotoRec (TestDisk) con winget...'
        Nativo 'winget' @('install', '-e', '--id', 'CGSecurity.TestDisk', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity') | Out-Null
        $pr = Trova-PhotoRec
    }
    if (-not $pr) { Errore 'PhotoRec non disponibile: usate «Installa il motore di recupero»' }
    else {
        Passo 3 4 'Ricerca dei file in corso (può durare da pochi minuti a molte ore)'
        New-Item -ItemType Directory -Force -Path $piano.lavoro | Out-Null
        $cmd = "$($piano.scelta),$($piano.opzioni),$($piano.fileopt),$($piano.spazio),search"
        $arg = "/log /d `"$(Join-Path $piano.lavoro 'trovati')`" /cmd $($piano.dispositivo) $cmd"
        $p = Start-Process -FilePath $pr -ArgumentList $arg -WorkingDirectory $piano.lavoro -WindowStyle Hidden -PassThru
        $inizio = Get-Date
        while (-not $p.HasExited) {
            Start-Sleep -Seconds 10
            $f = @(Get-ChildItem -LiteralPath $piano.lavoro -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'report.xml' -and $_.Extension -ne '.log' })
            $mb = [math]::Round((($f | Measure-Object Length -Sum).Sum) / 1048576)
            Write-Host ("  … trovati finora {0} file ({1} MB) · {2} min" -f $f.Count, $mb, [int]((Get-Date) - $inizio).TotalMinutes)
            Info 'trovati' $f.Count
        }
        Passo 4 4 'Fine della ricerca'
        $log = Join-Path $piano.lavoro 'photorec.log'
        if (Test-Path $log) { Get-Content $log | Select-String -Pattern 'Total|recovered|rejected' | ForEach-Object { Write-Host "  $_" } }
        $n = @(Get-ChildItem -LiteralPath $piano.lavoro -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'report.xml' -and $_.Extension -ne '.log' }).Count
        Info 'trovati' $n
        Info 'piano' $CD_PARAM
        if ($n -eq 0 -and $p.ExitCode -ne 0) { Errore "PhotoRec non è riuscito a leggere l'unità (codice $($p.ExitCode))" }
        else { Ok "Trovati $n file: ora Salvadati controlla quali sono integri" }
    }
}
