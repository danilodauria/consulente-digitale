# Antivirus - Microsoft Defender Offline: il PC si riavvia e controlla il disco PRIMA che parta Windows
# (trova i virus che si nascondono quando Windows è acceso). Circa 15 minuti. Ideato e sviluppato da Danilo D'Auria - Codice MIT
Passo 1 2 'Preparo il controllo all''avvio'
$ok = $true
try { $null = Get-MpComputerStatus -ErrorAction Stop } catch { $ok = $false; Errore 'Microsoft Defender non è attivo: il controllo all''avvio non è disponibile' }
if ($ok) {
    try { Update-MpSignature -ErrorAction Stop; Ok 'Firme aggiornate' } catch { Nota 'Firme non aggiornate: si usano quelle presenti' }
    Passo 2 2 'Riavvio per il controllo (il PC si riavvia tra pochi secondi)'
    Nota 'Alla fine del controllo Windows ripartirà da solo; il risultato è in Sicurezza di Windows → Cronologia protezione.'
    Start-Sleep -Seconds 5
    try { Start-MpWDOScan -ErrorAction Stop } catch { Errore "Avvio non riuscito: $($_.Exception.Message)" }
}
