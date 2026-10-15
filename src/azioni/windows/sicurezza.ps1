# Controllo sicurezza (solo lettura).
Passo 1 1 'Controlli'
$av = @(); try { $av = @(Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop) } catch { $null = $_ }
if ($av.Count -gt 0) { Voce 'controllo' 'Antivirus' (($av | ForEach-Object { $_.displayName }) -join ', ') 'ok' '' '' } else { Voce 'controllo' 'Antivirus' 'non trovato' 'attenzione' '' 'Attivate Microsoft Defender' }
try {
    $mp = Get-MpComputerStatus -ErrorAction Stop
    $giorni = [int]((Get-Date) - $mp.AntivirusSignatureLastUpdated).TotalDays
    Voce 'controllo' 'Protezione in tempo reale' $(if ($mp.RealTimeProtectionEnabled) { 'attiva' } else { 'spenta' }) $(if ($mp.RealTimeProtectionEnabled) { 'ok' } else { 'attenzione' }) '' ''
    Voce 'controllo' 'Definizioni antivirus' "$giorni giorni fa" $(if ($giorni -le 3) { 'ok' } else { 'attenzione' }) '' ''
} catch { $null = $_ }
foreach ($p in Get-NetFirewallProfile -ErrorAction SilentlyContinue) {
    Voce 'controllo' "Firewall ($($p.Name))" $(if ($p.Enabled) { 'attivo' } else { 'spento' }) $(if ($p.Enabled) { 'ok' } else { 'attenzione' }) '' ''
}
try {
    $bl = (New-Object -ComObject Shell.Application).NameSpace("$($env:SystemDrive)\").Self.ExtendedProperty('System.Volume.BitLockerProtection')
    $s = 'non disponibile'
    if (@(1, 3, 5) -contains [int]$bl) { $s = 'attivo' } elseif ([int]$bl -eq 2) { $s = 'spento' }
    Voce 'controllo' 'Cifratura del disco (BitLocker)' $s $(if ($s -eq 'attivo') { 'ok' } else { 'consiglio' }) '' 'Su un portatile protegge i dati in caso di furto'
} catch { $null = $_ }
$uac = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -ErrorAction SilentlyContinue).EnableLUA
Voce 'controllo' 'Controllo account utente (UAC)' $(if ($uac -eq 1) { 'attivo' } else { 'spento' }) $(if ($uac -eq 1) { 'ok' } else { 'attenzione' }) '' ''
try {
    $ultimo = (New-Object -ComObject Microsoft.Update.AutoUpdate).Results.LastInstallationSuccessDate
    $g = [int]((Get-Date) - $ultimo).TotalDays
    Voce 'controllo' 'Ultimi aggiornamenti installati' "$g giorni fa" $(if ($g -le 35) { 'ok' } else { 'attenzione' }) '' ''
} catch { $null = $_ }
$cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$build = [int]$cv.CurrentBuildNumber
$stato = 'info'; $nota = ''
if ($build -lt 22000) { $stato = 'attenzione'; $nota = 'Windows 10 non riceve più aggiornamenti di sicurezza gratuiti: passate a Windows 11 (se compatibile) o a Linux' }
Voce 'controllo' 'Versione di Windows' "$($cv.ProductName) $($cv.DisplayVersion) (build $build)" $stato '' $nota
$admin = 'no'; if (Sono-Amministratore) { $admin = 'sì' }
Voce 'controllo' 'State usando un account amministratore' $admin 'info' '' 'Per l''uso di tutti i giorni è più sicuro un account standard'
