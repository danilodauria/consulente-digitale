#!/bin/bash
# Kit di emergenza - prepara una chiavetta avviabile con SystemRescue (system-rescue.org, GPL) e Neura Soccorso.
# ATTENZIONE: la chiavetta scelta viene CANCELLATA. Prima di scrivere si ricontrollano tipo, bus e dimensione.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 6 "Controllo della chiavetta"
if ! [[ "$CD_PARAM" =~ ^[a-f0-9]{12}$ ]] || [ ! -f "$CD_DATI/kit/piano-$CD_PARAM.sh" ]; then attenzione "Piano non trovato: ripetete la scelta della chiavetta"; exit 2; fi
# shellcheck source=/dev/null
. "$CD_DATI/kit/piano-$CD_PARAM.sh"
K="$CD_DATI/kit"
if [ "$P_PROVA" = "1" ]; then
    [ -f "$P_DISCO" ] || { attenzione "Immagine di prova mancante"; exit 3; }
    nota "Modalità di prova: si scrive nell'immagine $P_DISCO"
else
    case "$P_DISCO" in /dev/sd[a-z]|/dev/sd[a-z][a-z]|/dev/mmcblk[0-9]|/dev/nvme[0-9]n[0-9]) ;; *) attenzione "Unità non valida: $P_DISCO"; exit 3 ;; esac
    [ -b "$P_DISCO" ] || { attenzione "La chiavetta non è più collegata"; exit 3; }
    rm=$(lsblk -dno RM "$P_DISCO" | tr -d ' '); tran=$(lsblk -dno TRAN "$P_DISCO" | tr -d ' '); dim=$(lsblk -dbno SIZE "$P_DISCO" | tr -d ' ')
    if [ "$dim" != "$P_DIMENSIONE" ] || { [ "$rm" != "1" ] && [ "$tran" != "usb" ]; }; then
        attenzione "La chiavetta è cambiata (dimensione o tipo diversi): ripetete la scelta"; exit 3
    fi
    if lsblk -nro MOUNTPOINT "$P_DISCO" | grep -qE '^(/|/boot|/boot/efi|/home|/usr)$'; then attenzione "È un disco del sistema: mi fermo"; exit 3; fi
    ok "Chiavetta: $P_DISCO ($((dim / 1000000000)) GB, $tran)"
fi

passo 2 6 "SystemRescue: scarico il sistema di soccorso dal sito ufficiale"
mkdir -p "$(dirname "$P_ISO")"
verifica() { [ -z "$P_ISO_SHA256" ] && return 0; [ "$(sha256sum "$P_ISO" | cut -d' ' -f1)" = "$P_ISO_SHA256" ]; }
if [ -f "$P_ISO" ] && verifica; then ok "Già scaricato e verificato"
else
    rm -f "$P_ISO.part"
    if c_e curl; then curl -fL --retry 3 -C - -o "$P_ISO.part" "$P_ISO_URL" 2>&1 | tr '\r' '\n' | awk 'NR % 40 == 0 {print "  … " $1 "%"}'
    else wget -q --show-progress -O "$P_ISO.part" "$P_ISO_URL"; fi
    mv -f "$P_ISO.part" "$P_ISO" 2>/dev/null
    verifica || { rm -f "$P_ISO"; attenzione "Il file scaricato non è integro (SHA-256 diverso): riprovate"; exit 4; }
    ok "Scaricato e verificato (SHA-256)"
fi

passo 3 6 "Cancello e preparo la chiavetta (FAT32, nome $P_ETICHETTA)"
if [ "$P_PROVA" = "1" ]; then
    PART="$P_DISCO"
    mkfs.vfat -F 32 -n "$P_ETICHETTA" "$PART" >/dev/null || { attenzione "Formattazione non riuscita"; exit 5; }
else
    for p in $(lsblk -nrpo NAME "$P_DISCO" | tail -n +2); do umount "$p" 2>/dev/null; done
    wipefs -a "$P_DISCO" >/dev/null 2>&1
    parted -s "$P_DISCO" mklabel msdos mkpart primary fat32 1MiB 100% set 1 boot on || { attenzione "Partizione non creata"; exit 5; }
    partprobe "$P_DISCO" 2>/dev/null; udevadm settle 2>/dev/null; sleep 2
    PART="$(lsblk -nrpo NAME "$P_DISCO" | sed -n 2p)"
    [ -b "$PART" ] || { attenzione "Partizione non trovata"; exit 5; }
    mkfs.vfat -F 32 -n "$P_ETICHETTA" "$PART" >/dev/null || { attenzione "Formattazione non riuscita (manca dosfstools?)"; exit 5; }
fi
ok "Chiavetta pronta"

passo 4 6 "Copio SystemRescue sulla chiavetta"
T="$(mktemp -d)"; ISO_DIR="$T/iso"; USB="$T/usb"; mkdir -p "$ISO_DIR" "$USB"
pulisci() { umount "$USB" 2>/dev/null; umount "$ISO_DIR" 2>/dev/null; rm -rf "$T"; }
trap pulisci EXIT
if ! mount -o loop,ro "$P_ISO" "$ISO_DIR" 2>/dev/null; then
    if c_e xorriso; then xorriso -osirrox on -indev "$P_ISO" -extract / "$ISO_DIR" >/dev/null 2>&1
    elif c_e bsdtar; then bsdtar -xf "$P_ISO" -C "$ISO_DIR"
    elif c_e 7z; then 7z x -y -o"$ISO_DIR" "$P_ISO" >/dev/null
    else attenzione "Non riesco ad aprire il file ISO"; exit 6; fi
fi
MONTATA=0
if mount "$PART" "$USB" 2>/dev/null; then MONTATA=1; fi
scrivi() {   # scrivi <origine> <destinazione relativa sulla chiavetta>
    if [ "$MONTATA" = 1 ]; then mkdir -p "$USB/$(dirname "$2")"; cp -r "$1" "$USB/$2"
    else mmd -D s -i "$PART" "::/$(dirname "$2")" 2>/dev/null; mcopy -s -o -i "$PART" "$1" "::/$2"; fi
}
errori=0
for f in "$ISO_DIR"/* "$ISO_DIR"/.[!.]*; do
    [ -e "$f" ] || continue
    scrivi "$f" "$(basename "$f")" || errori=1
done
[ "$errori" = 0 ] || { attenzione "Copia non riuscita (chiavetta piena o rovinata?)"; exit 6; }
ok "SystemRescue copiato"

passo 5 6 "Aggiungo Neura Soccorso (diagnosi e riparazione automatica)"
N="$T/neura"; mkdir -p "$N"
for d in server web azioni; do [ -d "$P_NEURA/$d" ] && cp -r "$P_NEURA/$d" "$N/"; done
find "$N" -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null
for f in VERSION LICENSE LICENZA-CONTENUTI.md; do
    for b in "$P_NEURA" "$P_NEURA/.."; do [ -f "$b/$f" ] && { cp "$b/$f" "$N/"; break; }; done
done
cp "$K/avvia-neura.sh" "$N/avvia-neura.sh"
scrivi "$N" neura
scrivi "$K/500-neura.yaml" sysrescue.d/500-neura.yaml
scrivi "$K/LEGGIMI-KIT.txt" LEGGIMI-KIT.txt
ok "Neura Soccorso aggiunta"

passo 6 6 "Avvio anche sui PC vecchi (BIOS)"
if [ "$P_PROVA" != "1" ] && c_e syslinux && [ -d "$ISO_DIR/sysresccd/boot/syslinux" ]; then
    sync; umount "$USB" 2>/dev/null; MONTATA=0
    mbr="$(ls /usr/lib/syslinux/bios/mbr.bin /usr/lib/syslinux/mbr/mbr.bin /usr/share/syslinux/mbr.bin 2>/dev/null | head -n1)"
    if syslinux --directory sysresccd/boot/syslinux --install "$PART" 2>/dev/null && [ -n "$mbr" ]; then
        dd bs=440 count=1 conv=notrunc if="$mbr" of="$P_DISCO" 2>/dev/null; ok "Avvio BIOS preparato (syslinux)"
    else nota "Avvio BIOS non preparato: la chiavetta parte sui PC con UEFI (quasi tutti quelli dal 2012)"; fi
else
    nota "La chiavetta parte sui PC con UEFI (quasi tutti quelli dal 2012)"
fi
sync
info kit pronto
ok "Kit di emergenza pronto. Potete togliere la chiavetta: tenetela in un posto sicuro."
