# Sincronizza l'orologio di Windows con l'ora ufficiale (INRiM) e i server di Microsoft.
Passo 1 2 'Configuro i server dell''ora'
Set-Service -Name w32time -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name w32time -ErrorAction SilentlyContinue
[void](Nativo 'w32tm.exe' @('/config', '/manualpeerlist:time.inrim.it,0x8 ntp1.inrim.it,0x8 time.windows.com,0x8', '/syncfromflags:manual', '/update'))
Passo 2 2 'Sincronizzo adesso'
$c = Nativo 'w32tm.exe' @('/resync', '/force')
if ($c -eq 0) { Ok 'Orologio sincronizzato con l''ora ufficiale.' } else { Attenzione "w32tm ha risposto con il codice $c" }
[void](Nativo 'w32tm.exe' @('/query', '/status'))
