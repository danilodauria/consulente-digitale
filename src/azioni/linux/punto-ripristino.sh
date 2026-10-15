#!/bin/bash
# Crea un punto di ripristino: Timeshift o Snapper se presenti, altrimenti copia delle impostazioni di sistema.
passo 1 2 "Creo il punto di ripristino"
if c_e timeshift; then
    timeshift --create --comments "Consulente Digitale" --tags O && ok "Istantanea Timeshift creata." && info metodo timeshift && exit 0
fi
if c_e snapper; then
    snapper create --description "Consulente Digitale" && ok "Istantanea Snapper creata." && info metodo snapper && exit 0
fi
dest="/var/backups/consulente-digitale"
mkdir -p "$dest"
data="$(date +%Y%m%d-%H%M)"
tar -czf "$dest/etc-$data.tar.gz" /etc 2>/dev/null
case "$GESTORE" in
    apt) dpkg --get-selections > "$dest/pacchetti-$data.txt" ;;
    dnf) rpm -qa > "$dest/pacchetti-$data.txt" ;;
    pacman) pacman -Qqe > "$dest/pacchetti-$data.txt" ;;
esac
ok "Copia delle impostazioni di sistema in $dest"
passo 2 2 "Consiglio"
nota "Per vere «fotografie» del sistema installa Timeshift (Programmi consigliati)."
info metodo copia
