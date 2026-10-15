# Rapporto della batteria con powercfg.
Passo 1 1 'Lettura della batteria'
if (@(Get-CimInstance Win32_Battery).Count -eq 0) { Nota 'Nessuna batteria: è un computer fisso.'; Info 'salute' 'nessuna' }
else {
    $xml = Join-Path $CD_DATI 'batteria.xml'
    & powercfg.exe /batteryreport /xml /output $xml 2>&1 | Out-Null
    try {
        [xml]$r = Get-Content -LiteralPath $xml -Encoding UTF8
        foreach ($b in $r.BatteryReport.Batteries.Battery) {
            $salute = [math]::Round(100 * [double]$b.FullChargeCapacity / [math]::Max(1, [double]$b.DesignCapacity))
            Voce 'batteria' "$($b.Manufacturer) $($b.Id)" "$salute%" '' '' "Cicli: $($b.CycleCount) · Capacità $($b.FullChargeCapacity) mWh su $($b.DesignCapacity) di fabbrica"
            Info 'salute' $salute; Info 'cicli' $b.CycleCount
        }
        Nota 'Rapporto completo: menu Start → «cmd» → powercfg /batteryreport'
    } catch { Attenzione "Rapporto non leggibile: $($_.Exception.Message)" }
}
