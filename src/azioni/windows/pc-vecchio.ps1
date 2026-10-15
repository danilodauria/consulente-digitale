# Modalita' PC vecchio: effetti grafici al minimo, indicizzazione leggera su disco meccanico, registrazione giochi spenta.
$chiavi = @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize',
    'HKCU:\Control Panel\Desktop', 'HKCU:\System\GameConfigStore')
Passo 1 4 'Copia delle impostazioni attuali'
[void](Punto-Ripristino 'Consulente Digitale - modalità PC vecchio')
Salva-Registro $chiavi 'pc-vecchio'
Passo 2 4 'Effetti grafici'
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' 'VisualFXSetting' 2
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 0
Imposta-Registro 'HKCU:\Control Panel\Desktop\WindowMetrics' 'MinAnimate' '0' 'String'
Imposta-Registro 'HKCU:\Control Panel\Desktop' 'FontSmoothing' '2' 'String'
Imposta-Registro 'HKCU:\Control Panel\Desktop' 'MenuShowDelay' '100' 'String'
Ok 'Effetti per le migliori prestazioni (il testo resta nitido).'
Passo 3 4 'Disco meccanico: indicizzazione più leggera'
$hdd = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { "$($_.MediaType)" -eq 'HDD' }).Count -gt 0
if ($hdd) {
    Set-Service -Name WSearch -StartupType Manual -ErrorAction SilentlyContinue
    Ok 'Disco meccanico: la ricerca di Windows parte solo quando serve.'
    Nota 'Il miglior acceleratore per questo PC: un SSD (anche economico) al posto del disco meccanico.'
} else { Ok 'Disco SSD: indicizzazione lasciata attiva.' }
Passo 4 4 'Registrazione dei giochi in sottofondo'
Imposta-Registro 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0
Imposta-Registro 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' 'AllowGameDVR' 0
Ok 'Registrazione in sottofondo spenta.'
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1073741824)
if ($ram -lt 4) { Attenzione "RAM $ram GB: Windows 10/11 sarà comunque lento. Valutate Linux leggero (FeniceOS, Linux Lite) o più RAM." }
Info 'riavvio' 'consigliato'
