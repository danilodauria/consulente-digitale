# Stato della licenza di Windows (solo lettura, strumenti di Microsoft).
Passo 1 1 'Licenza'
$cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
Nota "Edizione: $($cv.ProductName) ($($cv.EditionID)) $($cv.DisplayVersion)"
try {
    $l = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL AND Name LIKE 'Windows%'" -ErrorAction Stop | Select-Object -First 1
    $stati = @{ 0 = 'non attivato'; 1 = 'attivato'; 2 = 'periodo di prova'; 3 = 'periodo di tolleranza'; 4 = 'non originale'; 5 = 'notifica'; 6 = 'tolleranza estesa' }
    $s = $stati[[int]$l.LicenseStatus]
    Voce 'licenza' 'Windows' $s "$($l.Description)" '' $(if ($l.LicenseStatus -eq 1) { 'Tutto in regola' } else { 'Impostazioni → Sistema → Attivazione' })
    Info 'stato' $s
} catch { [void](Nativo 'cscript.exe' @('//nologo', "$env:SystemRoot\System32\slmgr.vbs", '/dli')) }
Nota 'Solo licenze originali: Microsoft, negozi autorizzati o la licenza digitale legata al vostro account.'
