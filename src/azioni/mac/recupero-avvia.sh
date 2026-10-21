#!/bin/bash
# Salvadati - ricerca e recupero dei file con PhotoRec in automatico (il disco da salvare si legge soltanto).
# Sul Mac servono i permessi di amministratore e, per i dischi interni, l'«Accesso completo al disco».
# Ideato e sviluppato da Danilo D'Auria - Codice MIT. PhotoRec: CGSecurity, licenza GPL.
passo 1 4 "Controllo del piano di recupero"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/recupero/piano-$CD_PARAM.sh" ]; then attenzione "Piano non trovato: ripetete l'analisi"; exit 2; fi
# shellcheck source=/dev/null
. "$CD_DATI/recupero/piano-$CD_PARAM.sh"
nota "Unità: $P_DISPOSITIVO · ricerca $P_MODO ($P_SPAZIO)"
passo 2 4 "Motore di ricerca"
PR="$(command -v photorec || ls /opt/homebrew/bin/photorec /usr/local/bin/photorec 2>/dev/null | head -n1)"
[ -n "$PR" ] || { attenzione "PhotoRec non installato: usate «Installa il motore di recupero»"; exit 3; }
passo 3 4 "Ricerca dei file in corso (può durare da pochi minuti a molte ore)"
mkdir -p "$P_LAVORO" && cd "$P_LAVORO" || exit 4
"$PR" /log /d "$P_LAVORO/trovati" /cmd "$P_DISPOSITIVO" "$P_SCELTA,$P_OPZIONI,$P_FILEOPT,$P_SPAZIO,search" >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; exit 130' TERM INT
inizio=$(date +%s)
while kill -0 $PID 2>/dev/null; do
    sleep 10
    n=$(find "$P_LAVORO" -type f ! -name '*.log' ! -name 'report.xml' 2>/dev/null | wc -l | tr -d ' ')
    echo "  … trovati finora $n file · $(( ($(date +%s) - inizio) / 60 )) min"
    info trovati "$n"
done
wait $PID; rc=$?
passo 4 4 "Fine della ricerca"
grep -E "Total|recovered|rejected" "$P_LAVORO/photorec.log" 2>/dev/null | sed 's/^/  /'
n=$(find "$P_LAVORO" -type f ! -name '*.log' ! -name 'report.xml' 2>/dev/null | wc -l | tr -d ' ')
info trovati "$n"; info piano "$CD_PARAM"
[ -n "$CD_UTENTE" ] && [ "$CD_UTENTE" != "root" ] && chown -R "$CD_UTENTE" "$P_LAVORO" 2>/dev/null
if [ "$rc" -ne 0 ] && [ "$n" -eq 0 ]; then
    attenzione "PhotoRec non ha potuto leggere l'unità (codice $rc). Per i dischi interni: Impostazioni di Sistema → Privacy e sicurezza → Accesso completo al disco."
    exit 5
fi
ok "Trovati $n file: ora Salvadati controlla quali sono integri"
