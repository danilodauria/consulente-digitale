#!/bin/bash
# Salvadati - riparazione del file system di un'unità NON di sistema (fsck / ntfsfix). Da usare DOPO aver salvato i dati.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 3 "Controllo del piano"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/recupero/piano-$CD_PARAM.sh" ]; then attenzione "Piano non trovato"; exit 2; fi
# shellcheck source=/dev/null
. "$CD_DATI/recupero/piano-$CD_PARAM.sh"
DEV="$P_DISPOSITIVO"
[ -b "$DEV" ] || { attenzione "Unità non trovata"; exit 3; }
radice="$(findmnt -no SOURCE / 2>/dev/null)"
case "$radice" in "$DEV"*) attenzione "È il disco del sistema in uso: non si ripara da qui"; exit 4 ;; esac
passo 2 3 "Smonto l'unità"
umount "$DEV" 2>/dev/null
findmnt -rno TARGET -S "$DEV" >/dev/null 2>&1 && { attenzione "L'unità è in uso: chiudete le finestre aperte su di essa"; exit 5; }
fs="$(blkid -o value -s TYPE "$DEV" 2>/dev/null)"
passo 3 3 "Riparazione del file system ($fs)"
case "$fs" in
  vfat) fsck.vfat -a -w "$DEV" ;;
  exfat) fsck.exfat -y "$DEV" ;;
  ntfs) ntfsfix -d "$DEV" && nota "Alla prossima apertura su Windows, lasciate che controlli il disco" ;;
  ext2|ext3|ext4) e2fsck -f -y "$DEV" ;;
  btrfs) btrfs check "$DEV" ;;
  xfs) xfs_repair "$DEV" ;;
  "") attenzione "Nessun file system riconosciuto (RAW): non si può riparare. I dati si recuperano con la ricerca approfondita."; exit 6 ;;
  *) attenzione "File system $fs: riparazione non prevista"; exit 6 ;;
esac
rc=$?
[ $rc -le 1 ] && ok "Controllo terminato (codice $rc)" || attenzione "Il controllo ha segnalato problemi (codice $rc)"
exit 0
