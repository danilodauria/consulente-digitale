# Installa un programma consigliato con winget (catalogo di Microsoft). CD_PARAM = "winget:Id.Del.Pacchetto"
$id = $CD_PARAM -replace '^winget:', ''
Passo 1 2 'Preparo winget'
if (-not (Prepara-Winget)) {
    Errore 'winget non disponibile: aprite il Microsoft Store e installate «Programma di installazione app», poi riprovate.'
    Start-Process 'ms-windows-store://pdp/?productid=9NBLGGH4NNS1'
} else {
    Passo 2 2 "Installo $id"
    $c = Nativo 'winget' @('install', '--id', $id, '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
    if ($c -eq 0 -or $c -eq -1978335189) { Ok 'Installato: lo trovate nel menu Start.' } else { Errore "winget ha risposto con il codice $c" }
}
