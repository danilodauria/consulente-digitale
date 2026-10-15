# Ripara i file di sistema: DISM (immagine), SFC (file), controllo del disco in linea.
Passo 1 3 'DISM: controllo e riparazione dell''immagine di Windows (10-20 minuti, serve Internet)'
$c1 = Nativo 'dism.exe' @('/Online', '/Cleanup-Image', '/RestoreHealth')
if ($c1 -eq 0) { Ok 'Immagine di Windows sana.' } else { Attenzione "DISM ha finito con codice $c1" }
Passo 2 3 'SFC: controllo dei file di sistema'
$c2 = Nativo 'sfc.exe' @('/scannow')
if ($c2 -eq 0) { Ok 'File di sistema a posto (o riparati).' } else { Attenzione 'SFC ha trovato problemi: riavviate e ripetete l''azione.' }
Passo 3 3 'Controllo del disco senza riavvio'
[void](Nativo 'chkdsk.exe' @($env:SystemDrive, '/scan'))
Info 'riavvio' 'consigliato'
