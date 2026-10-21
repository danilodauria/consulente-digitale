#!/bin/bash
# Salvadati - rende di nuovo visibili i file nascosti (per esempio da un virus delle chiavette) su un'unità FAT/exFAT/NTFS.
# Non tocca il contenuto dei file. Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 2 "Controllo del piano"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/recupero/piano-$CD_PARAM.sh" ]; then attenzione "Piano non trovato"; exit 2; fi
# shellcheck source=/dev/null
. "$CD_DATI/recupero/piano-$CD_PARAM.sh"
[ -n "$P_VOLUME" ] && [ -d "$P_VOLUME" ] || { attenzione "L'unità non è montata: apritela prima nel gestore dei file"; exit 3; }
case "$P_VOLUME" in /|/usr*|/etc*|/boot*|/home|/var*) attenzione "Per sicurezza non si lavora sul disco del sistema"; exit 4 ;; esac
passo 2 2 "File nascosti su $P_VOLUME"
case "$(echo "$P_FS" | tr 'A-Z' 'a-z')" in
  *fat*)
    c_e fatattr || installa_pacchetto fatattr >/dev/null 2>&1
    if c_e fatattr; then
        n=0
        while IFS= read -r -d '' f; do
            case "$f" in *"System Volume Information"*|*'$RECYCLE.BIN'*) continue ;; esac
            fatattr -h -s "$f" 2>/dev/null && n=$((n+1))      # toglie «nascosto» e «di sistema» (innocuo sugli altri)
        done < <(find "$P_VOLUME" -mindepth 1 -print0 2>/dev/null)
        ok "Controllati e resi visibili: $n file e cartelle"; info visibili "$n"
    else
        nota "Su Linux i file con l'attributo «nascosto» di Windows si vedono già: apritela nel gestore dei file"
    fi ;;
  *)
    nota "Su Linux i file nascosti di Windows (NTFS) si vedono già; i file che iniziano con il punto si mostrano con Ctrl+H nel gestore dei file" ;;
esac
# collegamenti sospetti lasciati dai virus delle chiavette
lnk=$(find "$P_VOLUME" -maxdepth 2 -iname '*.lnk' 2>/dev/null | wc -l)
[ "$lnk" -gt 0 ] && attenzione "Trovati $lnk collegamenti (.lnk): se non li avete creati voi, sono del virus. Fate un controllo antivirus."
exit 0
