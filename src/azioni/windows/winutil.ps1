# Chris Titus Tech WinUtil (https://christitus.com/win): si scarica ed esegue lo strumento ufficiale.
Write-Host '=== Consulente Digitale → Chris Titus Tech WinUtil ===' -ForegroundColor Cyan
Write-Host 'Scarico lo strumento ufficiale da christitus.com (serve Internet). Si aprirà la sua finestra.'
Write-Host 'Consiglio: nella scheda «Tweaks» usate il pulsante «Standard» e create prima un punto di ripristino.'
Write-Host ''
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-RestMethod -Uri 'https://christitus.com/win' -UseBasicParsing | Invoke-Expression
} catch {
    Write-Host "Non riuscito: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host 'Controllate la connessione a Internet e riprovate.'
}
