# Salute dei dischi (S.M.A.R.T. tramite Windows) e spazio libero.
Passo 1 2 'Dischi fisici'
foreach ($d in Get-PhysicalDisk -ErrorAction SilentlyContinue) {
    $c = $null; try { $c = $d | Get-StorageReliabilityCounter -ErrorAction Stop } catch { $null = $_ }
    $usura = ''; $ore = '?'; $temp = ''
    if ($c) { if ($c.Wear -ne $null) { $usura = "$($c.Wear)%" }; if ($c.PowerOnHours) { $ore = $c.PowerOnHours }; if ($c.Temperature) { $temp = " · $($c.Temperature)°C" } }
    $consiglio = 'Tutto bene'
    if ("$($d.HealthStatus)" -ne 'Healthy') { $consiglio = 'Fate SUBITO una copia dei dati e sostituite il disco' }
    Voce 'disco' "$($d.FriendlyName) ($($d.MediaType))" "$($d.HealthStatus)" $usura "$($d.DeviceId)" "Ore di accensione: $ore$temp · $consiglio"
}
try {
    Get-CimInstance -Namespace root\wmi -ClassName MSStorageDriver_FailurePredictStatus -ErrorAction Stop | ForEach-Object {
        if ($_.PredictFailure) { Attenzione "Un disco prevede un guasto ($($_.InstanceName)): copia dei dati subito!" }
    }
} catch { $null = $_ }
Passo 2 2 'Spazio libero'
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
    $p = [math]::Round(100 * $_.FreeSpace / [math]::Max(1, $_.Size))
    Nota ("{0}  liberi {1} GB su {2} GB ({3}%)" -f $_.DeviceID, [math]::Round($_.FreeSpace / 1073741824, 1), [math]::Round($_.Size / 1073741824), $p)
    if ($p -lt 10) { Attenzione "$($_.DeviceID) quasi pieno: usate «Pulizia sicura»." }
}
