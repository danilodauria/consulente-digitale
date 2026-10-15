# Driver e periferiche: dispositivi con problemi, driver su Windows Update, strumenti ufficiali del produttore.
$codici = @{ 1 = 'non configurato bene'; 3 = 'driver danneggiato'; 10 = 'non si avvia'; 12 = 'conflitto di risorse'; 14 = 'serve un riavvio';
    18 = 'driver da reinstallare'; 19 = 'registro danneggiato'; 22 = 'disattivato'; 24 = 'non presente o non funziona'; 28 = 'driver non installato';
    31 = 'non funziona'; 43 = 'fermato per un errore'; 45 = 'non collegato'; 52 = 'firma del driver non valida' }
Passo 1 4 'Dispositivi con problemi'
$prob = @(Get-CimInstance Win32_PnPEntity -Filter 'ConfigManagerErrorCode<>0')
foreach ($d in $prob) {
    if ($d.ConfigManagerErrorCode -eq 45) { continue }
    $t = $codici[[int]$d.ConfigManagerErrorCode]; if (-not $t) { $t = "codice $($d.ConfigManagerErrorCode)" }
    Voce 'periferica' "$($d.Name)" $t '' "$($d.PNPDeviceID)" 'Usate «Installa driver» oppure il sito del produttore'
}
Ok "Dispositivi con problemi: $(@($prob | Where-Object { $_.ConfigManagerErrorCode -ne 45 }).Count)"

Passo 2 4 'Driver disponibili su Windows Update'
try {
    $wu = Cerca-WindowsUpdate "IsInstalled=0 and IsHidden=0 and Type='Driver'"
    foreach ($u in $wu.risultato.Updates) { Voce 'driver' $u.Title "$($u.DriverVerDate)" "$($u.DriverModel)" $u.Identity.UpdateID 'Windows Update' }
    Ok "Driver nuovi: $($wu.risultato.Updates.Count)"
} catch { Attenzione "Windows Update non risponde: $($_.Exception.Message)" }

Passo 3 4 'Scheda video'
foreach ($g in Get-CimInstance Win32_VideoController) {
    $data = ''; try { $data = ([datetime]$g.DriverDate).ToString('dd/MM/yyyy') } catch { $null = $_ }
    $url = ''
    if ($g.Name -match 'NVIDIA') { $url = 'https://www.nvidia.com/it-it/software/nvidia-app/' }
    elseif ($g.Name -match 'AMD|Radeon') { $url = 'https://www.amd.com/it/support/download/drivers.html' }
    elseif ($g.Name -match 'Intel') { $url = 'https://www.intel.it/content/www/it/it/support/detect.html' }
    Voce 'video' $g.Name $g.DriverVersion $data $url 'Driver della scheda video'
}

Passo 4 4 'Strumento ufficiale del produttore'
$cs = Get-CimInstance Win32_ComputerSystem
$prod = "$($cs.Manufacturer)"
$strumenti = @(
    @('LENOVO', 'Lenovo Vantage / System Update', 'https://support.lenovo.com/it/it/solutions/ht003029', 'Lenovo.SystemUpdate'),
    @('Dell', 'Dell Command | Update', 'https://www.dell.com/support/home/it-it', 'Dell.CommandUpdate'),
    @('HP|Hewlett', 'HP Support Assistant', 'https://support.hp.com/it-it/help/hp-support-assistant', ''),
    @('ASUS', 'MyASUS', 'https://www.asus.com/it/support/myasus-deeplink/', ''),
    @('Acer', 'Acer Care Center', 'https://www.acer.com/it-it/support', ''),
    @('MSI|Micro-Star', 'MSI Center', 'https://it.msi.com/Landing/MSI-Center', ''),
    @('Microsoft', 'Surface: driver da Windows Update', 'https://support.microsoft.com/it-it/surface', '')
)
$trovato = $false
foreach ($s in $strumenti) { if ($prod -match $s[0]) { Voce 'strumento' $s[1] $prod $s[3] $s[2] 'Fonte ufficiale del produttore'; $trovato = $true } }
if (-not $trovato) { Nota "Produttore: $prod. Driver dal sito ufficiale cercando il modello: $($cs.Model)" }
if ((Get-CimInstance Win32_Processor | Select-Object -First 1).Name -match 'Intel') {
    Voce 'strumento' 'Intel Driver & Support Assistant' 'Intel' 'Intel.IntelDriverAndSupportAssistant' 'https://www.intel.it/content/www/it/it/support/detect.html' 'Fonte ufficiale Intel'
}
