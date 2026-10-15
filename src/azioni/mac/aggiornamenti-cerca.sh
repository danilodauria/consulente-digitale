#!/bin/bash
# Cerca aggiornamenti: macOS e app Apple, programmi Homebrew, App Store (se c'è «mas»). Non modifica nulla.
passo 1 3 "Aggiornamenti di Apple (può richiedere un minuto)"
n=0
while IFS= read -r riga; do
    titolo="$(echo "$riga" | sed -n 's/.*Title: \([^,]*\), Version: \([^,]*\).*/\1|\2/p')"
    if [ -n "$titolo" ]; then
        voce sistema "${titolo%%|*}" "" "${titolo##*|}" "" "Apple"
        n=$((n+1))
    fi
done < <(softwareupdate -l 2>&1)
ok "Aggiornamenti di Apple: $n"
passo 2 3 "Programmi Homebrew"
m=0
if [ -n "$BREW" ]; then
    come_utente "$BREW" update >/dev/null 2>&1
    while read -r nome att _ nuova; do
        [ -n "$nome" ] && voce programmi "$nome" "${att//[()]/}" "$nuova" "$nome" "Homebrew" && m=$((m+1))
    done < <(come_utente "$BREW" outdated --verbose 2>/dev/null)
    ok "Programmi da aggiornare: $m"
else
    nota "Homebrew non installato: i programmi scaricati dal web si aggiornano da soli o dal loro menu."
fi
passo 3 3 "App Store"
if c_e mas; then
    while read -r id resto; do [ -n "$id" ] && voce negozio "$resto" "" "" "$id" "App Store" && m=$((m+1)); done < <(mas outdated 2>/dev/null)
else
    nota "Le app dell'App Store si aggiornano dall'App Store → Aggiornamenti."
fi
info totale $((n+m))
