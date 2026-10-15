# Ripara la connessione a Internet. Le reti Wi-Fi salvate restano.
Passo 1 3 'Cache DNS e indirizzo IP'
Clear-DnsClientCache -ErrorAction SilentlyContinue
[void](Nativo 'ipconfig.exe' @('/flushdns'))
[void](Nativo 'ipconfig.exe' @('/release'))
[void](Nativo 'ipconfig.exe' @('/renew'))
Passo 2 3 'Reimpostazione di Winsock e TCP/IP'
[void](Nativo 'netsh.exe' @('winsock', 'reset'))
[void](Nativo 'netsh.exe' @('int', 'ip', 'reset'))
Passo 3 3 'Prova'
if (Test-Connection -ComputerName 1.1.1.1 -Count 2 -Quiet -ErrorAction SilentlyContinue) { Ok 'Internet raggiungibile.' } else { Attenzione 'Internet non raggiungibile: spegnete il router 30 secondi e riaccendetelo.' }
Info 'riavvio' 'si'
Nota 'Riavviate il computer per completare la riparazione.'
