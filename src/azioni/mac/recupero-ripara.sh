#!/bin/bash
# Salvadati - riparazione del file system di un'unità esterna con Utility Disco (diskutil repairVolume).
# Da usare DOPO aver salvato i dati. Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 1 "Riparazione dell'unità"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/recupero/piano-$CD_PARAM.sh" ]; then attenzione "Piano non trovato"; exit 2; fi
# shellcheck source=/dev/null
. "$CD_DATI/recupero/piano-$CD_PARAM.sh"
DEV="${P_DISPOSITIVO/\/dev\/r//dev/}"
if diskutil info "$DEV" 2>/dev/null | grep -qE "Device Location: +Internal|Mount Point: +/$"; then attenzione "Disco interno del Mac: usate Utility Disco → S.O.S."; exit 3; fi
diskutil repairVolume "$DEV" && ok "Riparazione terminata" || attenzione "Utility Disco non è riuscita a riparare l'unità"
