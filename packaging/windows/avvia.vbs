' Consulente Digitale - avvio senza finestre nere. Ideato e sviluppato da Danilo D'Auria - Codice MIT
Set fso = CreateObject("Scripting.FileSystemObject")
qui = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & qui & "\avvia.ps1""", 0, False
