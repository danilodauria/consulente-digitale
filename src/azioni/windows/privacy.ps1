# Piu' privacy, meno pubblicita'. Prima salva le impostazioni attuali in file .reg (ripristinabili con un doppio clic).
$chiavi = @('HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager', 'HKCU:\Software\Policies\Microsoft\Windows\Explorer',
    'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection', 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced')
Passo 1 3 'Copia delle impostazioni attuali'
Salva-Registro $chiavi 'privacy'
Passo 2 3 'Pubblicità e suggerimenti'
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy' 'TailoredExperiencesWithDiagnosticDataEnabled' 0
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'ShowSyncProviderNotifications' 0
Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'Start_IrisRecommendations' 0
foreach ($k in @('SubscribedContent-338388Enabled', 'SubscribedContent-338389Enabled', 'SubscribedContent-310093Enabled', 'SubscribedContent-353694Enabled', 'SubscribedContent-353696Enabled', 'SilentInstalledAppsEnabled', 'SystemPaneSuggestionsEnabled')) {
    Imposta-Registro 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' $k 0
}
Ok 'ID pubblicitario, esperienze personalizzate e suggerimenti spenti.'
Passo 3 3 'Dati di diagnostica, cronologia attività e ricerca web nel menu Start'
Imposta-Registro 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 1
Imposta-Registro 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'PublishUserActivities' 0
Imposta-Registro 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' 'UploadUserActivities' 0
Imposta-Registro 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' 'DisableSearchBoxSuggestions' 1
Ok 'Diagnostica al minimo richiesto, cronologia attività spenta, ricerca nel menu Start solo sul computer.'
Nota 'Le modifiche si vedono dopo una disconnessione o un riavvio.'
