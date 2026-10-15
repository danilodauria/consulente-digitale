# Crea un punto di ripristino del sistema.
Passo 1 2 'Creo il punto di ripristino'
if (Punto-Ripristino ('Consulente Digitale ' + (Get-Date -Format 'dd/MM/yyyy HH:mm'))) { Info 'metodo' 'ripristino di sistema' } else { $global:CD_CODICE = 1 }
Passo 2 2 'Punti disponibili'
Get-ComputerRestorePoint -ErrorAction SilentlyContinue | Select-Object -Last 5 | ForEach-Object {
    Nota ("{0}  {1}" -f ([Management.ManagementDateTimeConverter]::ToDateTime($_.CreationTime).ToString('dd/MM/yyyy HH:mm')), $_.Description)
}
Nota 'Per tornare indietro: menu Start → scrivete «rstrui» → Invio.'
