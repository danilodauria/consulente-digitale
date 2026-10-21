#!/bin/bash
# Antivirus - controllo con ClamAV: rapido (cartelle dell'utente dove arrivano i file), completo, o chiavette e dischi esterni.
# Non cancella nulla: l'elenco dei file infetti va in «antivirus/ultimo.txt»; poi si possono mettere in quarantena.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT. ClamAV: Cisco Talos, licenza GPL.
tipo="$CD_PARAM"; case "$tipo" in rapida|completa|chiavette) ;; *) tipo=rapida ;; esac
passo 1 3 "Preparo il controllo"
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; c_e clamscan || { attenzione "ClamAV non installato: usate prima «Aggiorna l'antivirus»"; exit 1; }
mkdir -p "$CD_DATI/antivirus"
cartelle=()
case "$tipo" in
    rapida)
        for d in Downloads Desktop Documents Library/LaunchAgents; do [ -d "$CD_CASA/$d" ] && cartelle+=("$CD_CASA/$d"); done
        cartelle+=(/tmp)
        [ -d "$CD_CASA/.config/autostart" ] && cartelle+=("$CD_CASA/.config/autostart") ;;
    completa) cartelle=(/) ;;
    chiavette) for d in /Volumes/*; do [ "$d" = "/Volumes/Macintosh HD" ] && continue; [ -d "$d" ] && cartelle+=("$d"); done ;;
esac
[ ${#cartelle[@]} -gt 0 ] || { attenzione "Niente da controllare (nessuna chiavetta collegata?)"; exit 0; }
nota "Cartelle: ${cartelle[*]}"
passo 2 3 "Controllo in corso (rapido: pochi minuti · completo: anche ore)"
rap="$CD_DATI/antivirus/ultimo.txt"; : > "$rap"
clamscan -r -i --no-summary --max-filesize=200M --max-scansize=400M \
    --exclude-dir='^/(dev|System/Volumes|Volumes|private/var/vm)' --exclude-dir="^$CD_DATI/antivirus/quarantena" \
    "${cartelle[@]}" 2>/dev/null | while IFS= read -r r; do
        case "$r" in *": "*" FOUND") echo "$r" >> "$rap"; echo "  ⚠ $r" ;; esac
    done
passo 3 3 "Risultato"
sort -u -o "$rap" "$rap"
n=$(wc -l < "$rap" | tr -d ' ')
info minacce "$n"
[ -n "$CD_UTENTE" ] && [ "$CD_UTENTE" != root ] && chown -R "$CD_UTENTE" "$CD_DATI/antivirus" 2>/dev/null
if [ "$n" -eq 0 ]; then ok "Nessuna minaccia trovata"; voce antivirus "Minacce trovate" 0 ok "" ""
else
    while IFS= read -r r; do f="${r%: *}"; v="${r##*: }"; voce antivirus "${v% FOUND}" "$f" attenzione "" "Da mettere in quarantena"; done < "$rap"
    attenzione "Trovate $n minacce: usate «Metti in quarantena i file infetti»"
fi
