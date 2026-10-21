# Installa FFmpeg (build ufficiale di Gyan, catalogo winget): serve a Nonni Teach per montare il podcast in MP3.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 2 'Preparo winget'
if (-not (Prepara-Winget)) {
    Errore 'winget non disponibile: aprite il Microsoft Store e installate «Programma di installazione app», poi riprovate.'
} else {
    Passo 2 2 'Installo FFmpeg'
    $c = Nativo 'winget' @('install', '--id', 'Gyan.FFmpeg', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
    if ($c -eq 0 -or $c -eq -1978335189) { Ok 'FFmpeg installato: Nonni Teach ora crea i podcast in MP3.' } else { Errore "winget ha risposto con il codice $c" }
}
