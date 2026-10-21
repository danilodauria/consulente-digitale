#!/bin/bash
# Salvadati - installa TestDisk/PhotoRec (CGSecurity, licenza GPL) con Homebrew. Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 1 "Motore di recupero (PhotoRec)"
if c_e photorec; then ok "PhotoRec è già installato"; exit 0; fi
[ -n "$BREW" ] || { attenzione "Serve Homebrew (brew.sh): installatelo dalla pagina «Ottimizza → Strumenti degli esperti»"; exit 1; }
come_utente "$BREW" install testdisk && ok "TestDisk e PhotoRec installati" || { attenzione "Installazione non riuscita"; exit 1; }
