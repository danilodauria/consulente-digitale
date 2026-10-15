# Sensori avanzati: installa (se manca) e avvia LibreHardwareMonitor (libero, MPL-2.0), che legge temperature dei core,
# ventole e tensioni. Il Consulente poi legge i suoi valori in sola lettura. Serve l'amministratore per il driver dei sensori.
Passo 1 3 'Cerco LibreHardwareMonitor'
$exe = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:ProgramFiles", "$env:LOCALAPPDATA\Programs" -Filter 'LibreHardwareMonitor.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $exe) {
    Passo 2 3 'Installo LibreHardwareMonitor con winget'
    if (Prepara-Winget) {
        [void](Nativo 'winget' @('install', '--id', 'LibreHardwareMonitor.LibreHardwareMonitor', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'))
        $exe = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:ProgramFiles" -Filter 'LibreHardwareMonitor.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    }
}
if (-not $exe) { Errore 'LibreHardwareMonitor non trovato: installatelo da Programmi consigliati e riprovate.' }
else {
    Passo 3 3 'Avvio LibreHardwareMonitor'
    if (-not (Get-Process -Name 'LibreHardwareMonitor' -ErrorAction SilentlyContinue)) { Start-Process -FilePath $exe.FullName -WindowStyle Minimized }
    Start-Sleep -Seconds 6
    $n = @(Get-CimInstance -Namespace 'root\LibreHardwareMonitor' -ClassName Sensor -ErrorAction SilentlyContinue).Count
    if ($n -gt 0) { Ok "Sensori disponibili: $n. Tenete aperto LibreHardwareMonitor (anche ridotto a icona)." ; Info 'sensori' $n }
    else { Attenzione 'LibreHardwareMonitor è aperto ma non ha ancora pubblicato i sensori: riprovate tra poco. Se Microsoft Defender lo segnala, non forzate.' }
}
