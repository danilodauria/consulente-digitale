# Installa Ollama (motore di IA locale): winget, altrimenti l'installatore ufficiale con controllo della firma digitale.
Passo 1 2 'Installazione di Ollama'
$fatto = $false
if (Prepara-Winget) {
    $c = Nativo 'winget' @('install', '--id', 'Ollama.Ollama', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
    $fatto = ($c -eq 0 -or $c -eq -1978335189)
}
if (-not $fatto) {
    $dest = Join-Path $env:TEMP 'OllamaSetup.exe'
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile $dest -UseBasicParsing
        $firma = Get-AuthenticodeSignature -FilePath $dest
        if ($firma.Status -ne 'Valid' -or $firma.SignerCertificate.Subject -notmatch 'Ollama') { Errore 'Firma digitale non valida: installazione annullata.'; Remove-Item $dest -Force }
        else { Ok "Firma verificata: $($firma.SignerCertificate.Subject)"; Start-Process -FilePath $dest -ArgumentList '/SILENT' -Wait; $fatto = $true }
    } catch { Errore "Download non riuscito: $($_.Exception.Message)" }
}
Passo 2 2 'Controllo'
if ($fatto) { Ok 'Ollama installato. Ora scaricate il modello consigliato.' }
