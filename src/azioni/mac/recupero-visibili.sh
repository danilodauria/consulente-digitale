#!/bin/bash
# Salvadati - rende di nuovo visibili i file nascosti su un'unità esterna (chflags nohidden). Ideato da Danilo D'Auria - Codice MIT
passo 1 1 "File nascosti"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/recupero/piano-$CD_PARAM.sh" ]; then attenzione "Piano non trovato"; exit 2; fi
# shellcheck source=/dev/null
. "$CD_DATI/recupero/piano-$CD_PARAM.sh"
case "$P_VOLUME" in /Volumes/?*) ;; *) attenzione "Si lavora solo sulle unità esterne (/Volumes/...)"; exit 3 ;; esac
n=$(find "$P_VOLUME" -flags hidden 2>/dev/null | wc -l | tr -d ' ')
chflags -R nohidden "$P_VOLUME" 2>/dev/null
ok "Resi visibili: $n file e cartelle"; info visibili "$n"
