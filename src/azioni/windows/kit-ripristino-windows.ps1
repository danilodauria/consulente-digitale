# Kit di emergenza - apre lo strumento ufficiale «Unità di ripristino» di Windows (RecoveryDrive.exe). Ideato da Danilo D'Auria - Codice MIT
Passo 1 1 'Unità di ripristino di Windows'
$rd = Join-Path $env:windir 'System32\RecoveryDrive.exe'
if (Test-Path $rd) { Start-Process $rd; Ok 'Si è aperta la finestra di Windows: serve una chiavetta da almeno 16 GB (verrà cancellata).' }
else { Errore 'Strumento non presente in questa edizione di Windows' }
