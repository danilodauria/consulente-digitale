#!/bin/bash
# Pulizia sicura dell'utente: cache vecchie, registri vecchi, pulizia di Homebrew. Non tocca documenti e foto.
prima=$(libero_mb)
passo 1 3 "Cache vecchie delle app (oltre 7 giorni)"
find "$CD_CASA/Library/Caches" -mindepth 1 -type f -mtime +7 -delete 2>/dev/null
passo 2 3 "Registri vecchi (oltre 14 giorni)"
find "$CD_CASA/Library/Logs" -mindepth 1 -type f -mtime +14 -delete 2>/dev/null
rm -rf "$CD_CASA/Library/Developer/Xcode/DerivedData/"* 2>/dev/null
passo 3 3 "Homebrew"
[ -n "$BREW" ] && come_utente "$BREW" cleanup --prune=30 -s
dopo=$(libero_mb)
info liberati_mb $((dopo - prima))
ok "Spazio liberato: $((dopo - prima)) MB. Ricordate anche di svuotare il Cestino."
