#!/bin/bash
# Antivirus - installa (se manca) e aggiorna ClamAV (Cisco Talos, licenza GPL) con Homebrew. Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 2 "Antivirus ClamAV"
nota "Il Mac ha già la sua protezione (XProtect, aggiornata da Apple): ClamAV serve come secondo controllo"
if ! c_e clamscan; then
    [ -n "$BREW" ] || { attenzione "Serve Homebrew (brew.sh): installatelo da «Strumenti degli esperti»"; exit 1; }
    come_utente "$BREW" install clamav || { attenzione "Installazione non riuscita"; exit 1; }
fi
PFX="$("$BREW" --prefix 2>/dev/null)"; PATH="$PFX/bin:$PATH"
conf="$PFX/etc/clamav/freshclam.conf"
if [ ! -f "$conf" ] && [ -f "$conf.sample" ]; then sed 's/^Example/#Example/' "$conf.sample" > "$conf"; fi
mkdir -p "$PFX/var/lib/clamav" 2>/dev/null
passo 2 2 "Scarico le firme dei virus più recenti"
freshclam --stdout 2>&1 | grep -vE '^\s*$' | tail -n 6 | sed 's/^/  /'
v="$(clamscan --version 2>/dev/null)"; info firme "$v"
case "$v" in */*/*) ok "Firme aggiornate: $v" ;; *) attenzione "Firme non aggiornate: controllate la connessione a Internet" ;; esac
