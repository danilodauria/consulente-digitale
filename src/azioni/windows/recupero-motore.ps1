# Salvadati - installa il motore di ricerca dei file: TestDisk/PhotoRec (CGSecurity, Christophe Grenier, licenza GPL)
# con winget, che scarica dal sito ufficiale e controlla l'impronta del pacchetto. Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 2 'Motore di recupero (PhotoRec)'
$pr = Trova-PhotoRec
if ($pr) {
    Ok "PhotoRec è già installato: $pr"
} elseif (Prepara-Winget) {
    $c = Nativo 'winget' @('install', '-e', '--id', 'CGSecurity.TestDisk', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
    $pr = Trova-PhotoRec
    if ($pr) { Ok "TestDisk e PhotoRec installati: $pr" } else { Errore "Installazione non riuscita (codice $c)" }
} else {
    Errore 'winget non disponibile: installate «Programma di installazione app» dal Microsoft Store'
}
Passo 2 2 'Pronto'
if ($pr) { Info 'motore' $pr }
