; Consulente Digitale - installatore per Windows 10 e 11 (per l'utente: non servono permessi di amministratore)
; Ideato e sviluppato da Danilo D'Auria - Codice MIT
Unicode true
!include "MUI2.nsh"
!define NOME "Consulente Digitale"
Name "${NOME} ${VERSIONE}"
OutFile "${USCITA}"
InstallDir "$LOCALAPPDATA\Programs\ConsulenteDigitale"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ICON "icona.ico"
!define MUI_UNICON "icona.ico"
!define MUI_WELCOMEPAGE_TITLE "Benvenuti nel ${NOME}"
!define MUI_WELCOMEPAGE_TEXT "Il cervello che sceglie, aggiorna e ottimizza i vostri dispositivi.$\r$\n$\r$\nIdeato e sviluppato da Danilo D'Auria.$\r$\nCodice MIT, contenuti CC BY-NC-SA 4.0.$\r$\n$\r$\nAl primo avvio, se manca, verrà scaricato Python (gratuito, dal sito ufficiale)."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION ApriProgramma
!define MUI_FINISHPAGE_RUN_TEXT "Apri il Consulente Digitale"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENZE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Italian"
VIProductVersion "${VERSIONE}.0"
VIAddVersionKey /LANG=${LANG_ITALIAN} "ProductName" "${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "CompanyName" "Danilo D'Auria"
VIAddVersionKey /LANG=${LANG_ITALIAN} "LegalCopyright" "© 2026 Danilo D'Auria - MIT / CC BY-NC-SA 4.0"
VIAddVersionKey /LANG=${LANG_ITALIAN} "FileDescription" "Installatore del ${NOME}"
VIAddVersionKey /LANG=${LANG_ITALIAN} "FileVersion" "${VERSIONE}"
Function ApriProgramma
  Exec '"$WINDIR\System32\wscript.exe" "$INSTDIR\avvia.vbs"'
FunctionEnd
Section "Programma"
  SetOutPath "$INSTDIR"
  File /r "contenuto\*.*"
  File "icona.ico"
  WriteUninstaller "$INSTDIR\Disinstalla.exe"
  CreateShortcut "$DESKTOP\${NOME}.lnk" "$WINDIR\System32\wscript.exe" '"$INSTDIR\avvia.vbs"' "$INSTDIR\icona.ico"
  CreateDirectory "$SMPROGRAMS\${NOME}"
  CreateShortcut "$SMPROGRAMS\${NOME}\${NOME}.lnk" "$WINDIR\System32\wscript.exe" '"$INSTDIR\avvia.vbs"' "$INSTDIR\icona.ico"
  CreateShortcut "$SMPROGRAMS\${NOME}\Disinstalla.lnk" "$INSTDIR\Disinstalla.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConsulenteDigitale" "DisplayName" "${NOME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConsulenteDigitale" "DisplayVersion" "${VERSIONE}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConsulenteDigitale" "Publisher" "Danilo D'Auria"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConsulenteDigitale" "DisplayIcon" "$INSTDIR\icona.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConsulenteDigitale" "UninstallString" '"$INSTDIR\Disinstalla.exe"'
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\${NOME}.lnk"
  RMDir /r "$SMPROGRAMS\${NOME}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ConsulenteDigitale"
SectionEnd
