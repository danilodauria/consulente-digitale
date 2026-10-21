#!/bin/bash
# Salvadati - ricerca e recupero dei file (foto, documenti, video, musica) con PhotoRec in automatico.
# Il disco da salvare si LEGGE soltanto; i file trovati vanno nella cartella di lavoro su UN ALTRO disco.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT. PhotoRec: CGSecurity, licenza GPL.
passo 1 4 "Controllo del piano di recupero"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/recupero/piano-$CD_PARAM.sh" ]; then
    attenzione "Piano di recupero non trovato: ripetete l'analisi"; exit 2
fi
# shellcheck source=/dev/null
. "$CD_DATI/recupero/piano-$CD_PARAM.sh"
nota "Unità: $P_DISPOSITIVO · ricerca $P_MODO ($P_SPAZIO)"
nota "Cartella di lavoro: $P_LAVORO"
passo 2 4 "Motore di ricerca"
if ! c_e photorec; then
    installa_pacchetto testdisk >/dev/null 2>&1
fi
c_e photorec || { attenzione "PhotoRec non disponibile: usate «Installa il motore di recupero»"; exit 3; }
if [ -b "$P_DISPOSITIVO" ] && findmnt -rno TARGET -S "$P_DISPOSITIVO" >/dev/null 2>&1; then
    nota "L'unità è montata: va bene, viene solo letta (per sicurezza non scrivete nulla su di essa durante la ricerca)"
fi
passo 3 4 "Ricerca dei file in corso (può durare da pochi minuti a molte ore)"
mkdir -p "$P_LAVORO" || { attenzione "Non riesco a creare la cartella di lavoro"; exit 4; }
cd "$P_LAVORO" || exit 4
photorec /log /d "$P_LAVORO/trovati" /cmd "$P_DISPOSITIVO" "$P_SCELTA,$P_OPZIONI,$P_FILEOPT,$P_SPAZIO,search" >/dev/null 2>&1 &
PR=$!
trap 'kill $PR 2>/dev/null; attenzione "Ricerca interrotta"; exit 130' TERM INT
inizio=$(date +%s)
while kill -0 $PR 2>/dev/null; do
    sleep 10
    n=$(find "$P_LAVORO" -type f ! -name '*.log' ! -name 'report.xml' 2>/dev/null | wc -l)
    mb=$(du -sm "$P_LAVORO" 2>/dev/null | cut -f1)
    min=$(( ($(date +%s) - inizio) / 60 ))
    echo "  … trovati finora $n file ($mb MB) · $min min"
    info trovati "$n"
done
wait $PR; rc=$?
passo 4 4 "Fine della ricerca"
grep -E "Total|recovered|rejected" "$P_LAVORO/photorec.log" 2>/dev/null | sed 's/^/  /'
n=$(find "$P_LAVORO" -type f ! -name '*.log' ! -name 'report.xml' 2>/dev/null | wc -l)
info trovati "$n"
info piano "$CD_PARAM"
# i file devono appartenere a chi usa il computer (la ricerca gira come amministratore)
[ -n "$CD_UTENTE" ] && [ "$CD_UTENTE" != "root" ] && chown -R "$CD_UTENTE": "$P_LAVORO" 2>/dev/null
if [ "$rc" -ne 0 ] && [ "$n" -eq 0 ]; then attenzione "PhotoRec non è riuscito a leggere l'unità (codice $rc)"; exit 5; fi
ok "Trovati $n file: ora Salvadati controlla quali sono integri"
