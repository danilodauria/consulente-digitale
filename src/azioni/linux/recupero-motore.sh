#!/bin/bash
# Salvadati - installa il motore di ricerca dei file: TestDisk/PhotoRec (CGSecurity, Christophe Grenier, licenza GPL)
# dai repository ufficiali della distribuzione. Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 2 "Motore di recupero (PhotoRec)"
if c_e photorec; then
    ok "PhotoRec è già installato: $(photorec /version 2>/dev/null | head -n1)"
else
    installa_pacchetto testdisk && ok "TestDisk e PhotoRec installati" || { attenzione "Installazione non riuscita"; exit 1; }
fi
passo 2 2 "Strumenti per i file system"
c_e ntfsfix || installa_pacchetto ntfs-3g >/dev/null 2>&1
c_e fsck.vfat || installa_pacchetto dosfstools >/dev/null 2>&1
c_e fatattr || installa_pacchetto fatattr >/dev/null 2>&1
ok "Pronto"
