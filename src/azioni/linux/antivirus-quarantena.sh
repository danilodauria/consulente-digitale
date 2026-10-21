#!/bin/bash
# Antivirus - sposta i file trovati dall'ultimo controllo ClamAV in una cartella chiusa (non si aprono più),
# con l'elenco per rimetterli a posto. Non cancella nulla. Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 1 "Quarantena"
rap="$CD_DATI/antivirus/ultimo.txt"
[ -s "$rap" ] || { ok "Nessun file da mettere in quarantena (fate prima un controllo)"; exit 0; }
q="$CD_DATI/antivirus/quarantena/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$q"; chmod 700 "$q"
n=0
while IFS= read -r r; do
    f="${r%: *}"
    [ -f "$f" ] && [ ! -L "$f" ] || continue
    case "$f" in /proc/*|/sys/*|/dev/*|/boot/*|/usr/*|/bin/*|/sbin/*|/lib*/*|/etc/*) attenzione "File del sistema, lasciato al suo posto: $f"; continue ;; esac
    n=$((n + 1))
    if mv -- "$f" "$q/$n.virus" 2>/dev/null; then chmod 000 "$q/$n.virus"; printf '%s\t%s\n' "$n.virus" "$f" >> "$q/elenco.txt"; ok "In quarantena: $f"
    else attenzione "Non riesco a spostare: $f"; fi
done < "$rap"
: > "$rap"
ok "Cartella della quarantena: $q"
info quarantena "$n"
