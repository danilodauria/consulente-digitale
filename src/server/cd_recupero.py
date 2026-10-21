# -*- coding: utf-8 -*-
"""
Consulente Digitale - «Salvadati»: recupero di foto, documenti e file cancellati o non più visibili

Come lavorano i professionisti del recupero, e come lavora Salvadati:
  1. ANALISI senza toccare nulla: dischi e chiavette, file system RAW (non riconosciuti), file system che il
     sistema in uso non sa leggere, volumi cifrati, dischi di sistema.
  2. Il disco da salvare si LEGGE soltanto: i file recuperati vanno sempre su UN ALTRO DISCO (controllato qui),
     altrimenti si rischia di sovrascrivere proprio i dati da salvare.
  3. Motore di ricerca: PhotoRec (CGSecurity, licenza GPL) guidato in automatico. «Superficiale» = solo lo spazio
     libero dei file system leggibili (lì stanno i file cancellati); «Approfondita» = tutto il disco, settore per
     settore, anche RAW e formattati.
  4. Controllo di OGNI file recuperato (strutture interne di JPEG, PNG, PDF, documenti Office, video, musica…):
     quelli danneggiati vengono scartati PRIMA di contare i file e lo spazio necessario; i doppioni si tolgono.
  5. Nomi leggibili (data di scatto delle foto, titolo dei documenti) e cartelle ordinate: Foto, Documenti, Video,
     Musica, Archivi. Rapporto stampabile. Copia di sicurezza su un'altra unità con il controllo dello spazio.

Solo libreria standard, Python 3.7+. Ideato e sviluppato da Danilo D'Auria - Codice MIT
"""
import hashlib
import html
import json
import os
import plistlib
import re
import shutil
import struct
import threading
import time
import uuid
import zipfile
import zlib

import cd_sistema

FAM = cd_sistema.famiglia()
PROVA = os.environ.get("CD_RECUPERO_PROVA") == "1"

# --------------------------------------------------------------------------------------------------
#  Tipi di file: categorie e famiglie di PhotoRec (nomi accettati da PhotoRec 7.1 - 7.3)
# --------------------------------------------------------------------------------------------------
CATEGORIE = {
    "foto": {"nome": "Foto", "icona": "🖼️", "estensioni": ["jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff", "heic", "heif", "webp",
                                                         "cr2", "cr3", "nef", "arw", "dng", "raf", "orf", "rw2", "psd"],
             "photorec": ["jpg", "png", "gif", "bmp", "tif", "raf", "orf", "rw2", "psd", "mov"]},
    "documenti": {"nome": "Documenti", "icona": "📄", "estensioni": ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
                                                                   "rtf", "txt", "csv", "epub"],
                  "photorec": ["pdf", "doc", "zip"]},
    "video": {"nome": "Video", "icona": "🎬", "estensioni": ["mp4", "mov", "m4v", "3gp", "avi", "mkv", "webm", "wmv", "mts"],
              "photorec": ["mov", "riff", "mkv", "asf"]},
    "musica": {"nome": "Musica", "icona": "🎵", "estensioni": ["mp3", "m4a", "wav", "flac", "ogg", "wma", "aac"],
               "photorec": ["mp3", "ogg", "flac", "riff", "mov", "asf"]},
    "archivi": {"nome": "Archivi", "icona": "🗜️", "estensioni": ["zip", "7z", "rar"], "photorec": ["zip", "7z", "rar"]},
}
CARTELLA_CAT = {"foto": "Foto", "documenti": "Documenti", "video": "Video", "musica": "Musica", "archivi": "Archivi"}
EST_CAT = {}
for _c, _d in CATEGORIE.items():
    for _e in _d["estensioni"]:
        EST_CAT.setdefault(_e, _c)
RE_ID = re.compile(r"^[a-f0-9]{12}$")


def opzioni_photorec(categorie, modo):
    """Costruisce le scelte per «photorec /cmd»: famiglie di file e spazio da esaminare."""
    fam = []
    for c in categorie:
        for f in CATEGORIE.get(c, {}).get("photorec", []):
            if f not in fam:
                fam.append(f)
    if modo == "approfondita" and "documenti" in categorie:
        fam.append("txt")                      # testi, CSV, RTF: solo nella ricerca approfondita (molti frammenti)
    if not fam:
        fam = ["jpg", "pdf"]
    return "fileopt,everything,disable," + ",".join(f + ",enable" for f in fam)


# --------------------------------------------------------------------------------------------------
#  1) ANALISI dei dischi (sola lettura)
# --------------------------------------------------------------------------------------------------
FS_NOTI = {"ntfs": "NTFS", "vfat": "FAT32", "fat": "FAT", "fat32": "FAT32", "fat16": "FAT16", "fat12": "FAT12", "exfat": "exFAT",
           "ext2": "ext2", "ext3": "ext3", "ext4": "ext4", "btrfs": "Btrfs", "xfs": "XFS", "hfsplus": "HFS+", "hfs": "HFS",
           "apfs": "APFS", "refs": "ReFS", "f2fs": "F2FS", "zfs_member": "ZFS", "udf": "UDF", "iso9660": "ISO9660"}
FS_CIFRATI = {"bitlocker": "BitLocker", "crypto_luks": "LUKS", "filevault": "FileVault"}
FS_SALTA = {"swap", "linux_raid_member", "lvm2_member"}


def _linux_fs_supportati():
    s = set()
    for r in cd_sistema.leggi("/proc/filesystems").splitlines():
        s.add(r.split()[-1].strip().lower())
    try:
        import platform
        moddir = "/lib/modules/%s/kernel/fs" % platform.release()
        if os.path.isdir(moddir):
            s.update(x.lower() for x in os.listdir(moddir))
    except OSError:
        pass
    if shutil.which("ntfs-3g") or shutil.which("mount.ntfs3") or "ntfs3" in s:
        s.add("ntfs")
    if shutil.which("mount.exfat-fuse") or shutil.which("mount.exfat"):
        s.add("exfat")
    if "vfat" in s or "fat" in s:
        s.update({"vfat", "fat", "fat32", "fat16", "fat12"})
    return s


def _stato_partizione(fs, supportati, montata):
    f = (fs or "").lower()
    if not f:
        return "raw", "Nessun file system riconosciuto (RAW): il sistema non riesce a leggerla"
    if f in FS_CIFRATI:
        return "cifrata", "Cifrata con %s: per leggerla serve la chiave di ripristino" % FS_CIFRATI[f]
    if f in FS_SALTA:
        return "speciale", "Area di sistema (%s)" % f
    if supportati is not None and f not in supportati and not montata:
        return "illeggibile", "File system %s: questo sistema non lo sa leggere" % FS_NOTI.get(f, f)
    return "ok", ""


def _analisi_linux():
    out = cd_sistema.esegui(["lsblk", "-J", "-b", "-o", "NAME,PATH,SIZE,TYPE,FSTYPE,LABEL,MOUNTPOINT,MODEL,TRAN,RM,RO,PKNAME,FSAVAIL,FSUSED"], timeout=20)
    try:
        dati = json.loads(out)["blockdevices"]
    except (ValueError, KeyError):
        return []
    supportati = _linux_fs_supportati()
    dischi = []

    def num(x):
        try:
            return int(x)
        except (TypeError, ValueError):
            return 0

    for d in dati:
        if d.get("type") not in ("disk",) or (d.get("name") or "").startswith(("loop", "zram", "ram", "sr")):
            continue
        parts = []
        figli = d.get("children") or []
        sistema = False
        for p in ([d] if not figli else figli):
            mp = p.get("mountpoint") or ""
            if mp in ("/", "/boot", "/boot/efi", "/efi", "/usr", "/home"):
                sistema = True
            stato, nota = _stato_partizione(p.get("fstype"), supportati, bool(mp))
            parts.append({"id": p.get("path") or "/dev/" + p.get("name", ""), "nome": p.get("name"), "etichetta": p.get("label") or "",
                          "fs": FS_NOTI.get((p.get("fstype") or "").lower(), p.get("fstype") or ""), "dimensione": num(p.get("size")),
                          "usato": num(p.get("fsused")), "libero": num(p.get("fsavail")), "montata": mp, "stato": stato, "nota": nota,
                          "intero": not figli})
        dischi.append({"id": d.get("path") or "/dev/" + d.get("name", ""), "nome": (d.get("model") or d.get("name") or "").strip(),
                       "dimensione": num(d.get("size")), "rimovibile": str(d.get("rm")) in ("1", "True", "true") or d.get("tran") == "usb",
                       "bus": (d.get("tran") or "").upper(), "sistema": sistema, "partizioni": parts})
    return dischi


PS_ANALISI = r"""
$ErrorActionPreference='SilentlyContinue'
$r=@{dischi=@()}
$dd=@(Get-Disk)
if ($dd.Count -gt 0) {
  foreach ($d in $dd) {
    $parts=@()
    foreach ($p in @(Get-Partition -DiskNumber $d.Number)) {
      $v=$null; try { $v = $p | Get-Volume } catch {}
      $parts += @{ numero=$p.PartitionNumber; lettera=[string]$p.DriveLetter; dimensione=[int64]$p.Size; tipo=[string]$p.Type; gpt=[string]$p.GptType;
        nascosta=[bool]$p.IsHidden; sistema=([bool]$p.IsSystem -or [bool]$p.IsBoot);
        fs= if ($v) {[string]$v.FileSystem} else {''}; fstipo= if ($v) {[string]$v.FileSystemType} else {''};
        etichetta= if ($v) {[string]$v.FileSystemLabel} else {''}; libero= if ($v) {[int64]$v.SizeRemaining} else {0}; vdim= if ($v) {[int64]$v.Size} else {0} }
    }
    $r.dischi += @{ numero=$d.Number; nome=[string]$d.FriendlyName; dimensione=[int64]$d.Size; bus=[string]$d.BusType; sistema=([bool]$d.IsBoot -or [bool]$d.IsSystem);
      stile=[string]$d.PartitionStyle; salute=[string]$d.HealthStatus; partizioni=$parts }
  }
} else {
  foreach ($d in @(Get-CimInstance Win32_DiskDrive)) {
    $parts=@()
    foreach ($p in @(Get-CimAssociatedInstance -InputObject $d -ResultClassName Win32_DiskPartition)) {
      $l=@(Get-CimAssociatedInstance -InputObject $p -ResultClassName Win32_LogicalDisk) | Select-Object -First 1
      $parts += @{ numero=([int]$p.Index+1); lettera= if ($l) {([string]$l.DeviceID).TrimEnd(':')} else {''}; dimensione=[int64]$p.Size; tipo=[string]$p.Type; gpt='';
        nascosta=$false; sistema=[bool]$p.BootPartition; fs= if ($l) {[string]$l.FileSystem} else {''}; fstipo='';
        etichetta= if ($l) {[string]$l.VolumeName} else {''}; libero= if ($l) {[int64]$l.FreeSpace} else {0}; vdim= if ($l) {[int64]$l.Size} else {0} }
    }
    $r.dischi += @{ numero=[int]$d.Index; nome=[string]$d.Model; dimensione=[int64]$d.Size; bus=[string]$d.InterfaceType; sistema=$false; stile=''; salute='';
      partizioni=$parts }
  }
}
$r.sistema = $env:SystemDrive.TrimEnd(':')
$r | ConvertTo-Json -Depth 6 -Compress
"""


def _analisi_windows():
    out = cd_sistema.powershell(PS_ANALISI, timeout=60)
    try:
        j = json.loads(out.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return []
    lettera_sis = (j.get("sistema") or "C").upper()
    dischi = []
    for d in cd_sistema._lista(j.get("dischi")):
        parts = []
        sistema = bool(d.get("sistema"))
        for p in cd_sistema._lista(d.get("partizioni")):
            lett = (p.get("lettera") or "").strip().strip("\x00")
            if lett.upper() == lettera_sis:
                sistema = True
            tipo = (p.get("tipo") or "").lower()
            gpt = (p.get("gpt") or "").lower()
            if "system" in tipo or "recovery" in tipo or "reserved" in tipo or "c12a7328" in gpt or "e3c9e316" in gpt or "de94bba4" in gpt:
                stato, nota = "speciale", "Partizione di sistema (%s)" % (p.get("tipo") or "EFI/ripristino")
            else:
                fs = (p.get("fs") or "").strip()
                if fs.upper() == "RAW" or (not fs and (p.get("fstipo") or "").lower() in ("unknown", "raw", "")):
                    stato, nota = "raw", "RAW: Windows non riconosce il file system (spesso chiede di «formattare»: NON fatelo)"
                elif fs.lower() in ("bitlocker",):
                    stato, nota = "cifrata", "Cifrata con BitLocker: serve la chiave di ripristino"
                else:
                    stato, nota = "ok", ""
                if not lett and stato == "ok":
                    nota = "Senza lettera di unità"
            parts.append({"id": "\\\\.\\%s:" % lett if lett else "\\\\.\\PhysicalDrive%s#%s" % (d.get("numero"), p.get("numero")),
                          "nome": (lett + ":") if lett else "Partizione %s" % p.get("numero"), "etichetta": p.get("etichetta") or "",
                          "fs": p.get("fs") or "", "dimensione": int(p.get("dimensione") or 0),
                          "usato": max(0, int(p.get("vdim") or 0) - int(p.get("libero") or 0)), "libero": int(p.get("libero") or 0),
                          "montata": (lett + ":\\") if lett else "", "stato": stato, "nota": nota, "intero": False})
        bus = (d.get("bus") or "").upper()
        dischi.append({"id": "\\\\.\\PhysicalDrive%s" % d.get("numero"), "nome": (d.get("nome") or "").strip(), "dimensione": int(d.get("dimensione") or 0),
                       "rimovibile": bus in ("USB", "SD", "MMC", "1394"), "bus": bus, "sistema": sistema, "partizioni": parts,
                       "salute": d.get("salute") or ""})
    return dischi


def _analisi_mac():
    try:
        dati = plistlib.loads(cd_sistema.esegui(["diskutil", "list", "-plist"], timeout=30).encode("utf-8"))
    except Exception:
        return []
    dischi = []
    for d in dati.get("AllDisksAndPartitions", []):
        ident = d.get("DeviceIdentifier", "")
        try:
            info = plistlib.loads(cd_sistema.esegui(["diskutil", "info", "-plist", ident], timeout=20).encode("utf-8"))
        except Exception:
            info = {}
        if info.get("VirtualOrPhysical") == "Virtual" and not info.get("Internal") is False:
            continue          # i contenitori APFS si vedono attraverso il disco fisico
        parts = []
        for p in d.get("Partitions", []) or [d]:
            cont = (p.get("Content") or "").lower()
            mp = p.get("MountPoint") or ""
            if "efi" in cont or "apple_boot" in cont or "recovery" in cont:
                stato, nota = "speciale", "Partizione di sistema (%s)" % p.get("Content")
            elif "apple_apfs" in cont or "apple_hfs" in cont:
                stato, nota = "ok", ""
            elif mp:
                stato, nota = "ok", ""
            elif "linux" in cont or "ntfs" in cont or "microsoft basic data" in cont:
                stato, nota = "illeggibile", "File system %s: il Mac non lo monta" % (p.get("Content") or "")
            else:
                stato, nota = "raw", "Nessun file system riconosciuto"
            parts.append({"id": "/dev/r" + p.get("DeviceIdentifier", ident), "nome": p.get("DeviceIdentifier", ident),
                          "etichetta": p.get("VolumeName") or "", "fs": p.get("Content") or "", "dimensione": int(p.get("Size") or 0),
                          "usato": 0, "libero": 0, "montata": mp, "stato": stato, "nota": nota, "intero": not d.get("Partitions")})
        dischi.append({"id": "/dev/r" + ident, "nome": info.get("MediaName") or ident, "dimensione": int(d.get("Size") or 0),
                       "rimovibile": bool(info.get("RemovableMedia") or info.get("Removable") or info.get("Ejectable")),
                       "bus": info.get("BusProtocol") or "", "sistema": bool(info.get("Internal") and any(x.get("montata") == "/" for x in parts)) or ident == "disk0",
                       "partizioni": parts})
    return dischi


def _analisi_prova():
    """Dati di prova (CD_RECUPERO_PROVA=1): collaudo automatico e foto del vademecum. Con CD_RECUPERO_IMMAGINE
    l'unità «Chiavetta di prova» è un'immagine vera su cui PhotoRec lavora davvero."""
    img = os.environ.get("CD_RECUPERO_IMMAGINE", "")
    dischi = [
        {"id": "prova-ssd", "nome": "Samsung SSD 870 EVO 500GB", "dimensione": 500107862016, "rimovibile": False, "bus": "SATA", "sistema": True,
         "partizioni": [{"id": "prova-c", "nome": "C:", "etichetta": "Windows", "fs": "NTFS", "dimensione": 499000000000, "usato": 210000000000,
                         "libero": 289000000000, "montata": "C:\\", "stato": "ok", "nota": "", "intero": False}]},
        {"id": "prova-hdd", "nome": "WD Elements 1TB (USB)", "dimensione": 1000204886016, "rimovibile": True, "bus": "USB", "sistema": False,
         "partizioni": [{"id": "prova-e", "nome": "E:", "etichetta": "", "fs": "", "dimensione": 1000202273280, "usato": 0, "libero": 0, "montata": "E:\\",
                         "stato": "raw", "nota": "RAW: Windows non riconosce il file system (spesso chiede di «formattare»: NON fatelo)", "intero": False}]},
        {"id": "prova-linux", "nome": "Disco del vecchio PC (ext4)", "dimensione": 250059350016, "rimovibile": True, "bus": "USB", "sistema": False,
         "partizioni": [{"id": "prova-l1", "nome": "Partizione 1", "etichetta": "casa", "fs": "ext4", "dimensione": 250000000000, "usato": 0, "libero": 0,
                         "montata": "", "stato": "illeggibile", "nota": "File system ext4: questo sistema non lo sa leggere", "intero": False}]},
    ]
    if img and os.path.isfile(img):
        dischi.insert(1, {"id": "prova-chiavetta", "nome": "Chiavetta di prova (immagine)", "dimensione": os.path.getsize(img), "rimovibile": True,
                          "bus": "USB", "sistema": False,
                          "partizioni": [{"id": img, "nome": "F:", "etichetta": "FOTO", "fs": "FAT32", "dimensione": os.path.getsize(img), "usato": 600000,
                                          "libero": os.path.getsize(img) - 600000, "montata": "", "stato": "ok", "nota": "", "intero": True}]})
    return dischi


_ULTIMA = {"dischi": [], "quando": 0}


def analizza():
    if PROVA:
        dischi = _analisi_prova()
    elif FAM == "windows":
        dischi = _analisi_windows()
    elif FAM == "mac":
        dischi = _analisi_mac()
    else:
        dischi = _analisi_linux()
    problemi = []
    for d in dischi:
        for p in d["partizioni"]:
            if p["stato"] in ("raw", "illeggibile", "cifrata"):
                problemi.append({"disco": d["nome"], "partizione": p["nome"], "stato": p["stato"], "nota": p["nota"], "id": p["id"]})
    _ULTIMA.update({"dischi": dischi, "quando": time.time()})
    return {"dischi": dischi, "problemi": problemi, "motore": motore(), "sistema": FAM, "prova": PROVA}


def motore():
    """Dov'è PhotoRec (motore di ricerca dei file, CGSecurity, GPL)."""
    cand = [shutil.which("photorec"), shutil.which("photorec_win"), shutil.which("photorec_win.exe")]
    if FAM == "windows":
        base = os.environ.get("LOCALAPPDATA", "")
        for radice in (os.path.join(base, "Microsoft", "WinGet", "Packages"), os.path.join(os.environ.get("ProgramFiles", ""), "TestDisk")):
            if os.path.isdir(radice):
                for r, _, fs in os.walk(radice):
                    if "photorec_win.exe" in fs:
                        cand.append(os.path.join(r, "photorec_win.exe"))
    for c in ("/usr/bin/photorec", "/usr/sbin/photorec", "/opt/homebrew/bin/photorec", "/usr/local/bin/photorec"):
        cand.append(c if os.path.exists(c) else None)
    for c in cand:
        if c and os.path.exists(c):
            return {"pronto": True, "percorso": c}
    return {"pronto": False, "percorso": ""}


# --------------------------------------------------------------------------------------------------
#  2) DESTINAZIONI: solo su un altro disco
# --------------------------------------------------------------------------------------------------
def _disco_di(percorso):
    """Disco fisico (id dell'analisi) che contiene il percorso, oppure ''."""
    p = os.path.abspath(percorso)
    migliore, lung = "", -1
    for d in _ULTIMA["dischi"]:
        for q in d["partizioni"]:
            mp = q.get("montata") or ""
            if mp and (p == mp.rstrip("/\\") or p.lower().startswith(mp.lower().rstrip("/\\") + os.sep) or (len(mp) <= 3 and p.lower().startswith(mp.lower()))):
                if len(mp) > lung:
                    migliore, lung = d["id"], len(mp)
    return migliore


def destinazioni(casa, dati):
    """Cartelle dove salvare: le unità montate (esterne e interne) e la cartella personale, con lo spazio libero."""
    if not _ULTIMA["dischi"]:
        analizza()
    cand = []
    if PROVA:
        dest = os.environ.get("CD_RECUPERO_DEST") or os.path.join(dati, "prova-destinazione")
        os.makedirs(dest, exist_ok=True)
        cand.append({"id": "dest-prova", "percorso": dest, "nome": "Disco esterno di prova", "disco": "prova-ssd", "esterna": True})
    for d in _ULTIMA["dischi"]:
        for q in d["partizioni"]:
            mp = q.get("montata")
            if q["stato"] == "ok" and mp and os.path.isdir(mp) and mp not in ("/boot", "/boot/efi", "/efi"):
                cand.append({"id": "d-%s" % hashlib.sha1(mp.encode("utf-8")).hexdigest()[:10], "percorso": mp,
                             "nome": ("%s %s" % (q.get("nome") or "", q.get("etichetta") or "")).strip() + (" · " + d["nome"] if d["nome"] else ""),
                             "disco": d["id"], "esterna": bool(d["rimovibile"])})
    if casa and os.path.isdir(casa):
        cand.append({"id": "casa", "percorso": casa, "nome": "Cartella personale", "disco": _disco_di(casa), "esterna": False})
    visti, out = set(), []
    for c in cand:
        if c["percorso"] in visti:
            continue
        visti.add(c["percorso"])
        try:
            u = shutil.disk_usage(c["percorso"])
            c["libero"], c["totale"] = u.free, u.total
        except OSError:
            continue
        c["scrivibile"] = os.access(c["percorso"], os.W_OK)
        out.append(c)
    return out


def _cerca_partizione(pid):
    for d in _ULTIMA["dischi"]:
        for q in d["partizioni"]:
            if q["id"] == pid:
                return d, q
        if d["id"] == pid:
            return d, None
    return None, None


# --------------------------------------------------------------------------------------------------
#  3) PIANO di recupero (validato qui: il browser sceglie solo tra elementi dell'analisi)
# --------------------------------------------------------------------------------------------------
def _cartella_piani(dati):
    c = os.path.join(dati, "recupero")
    os.makedirs(c, exist_ok=True)
    return c


def prepara(dati, casa, sorgente, modo, categorie, destinazione):
    if not _ULTIMA["dischi"] or time.time() - _ULTIMA["quando"] > 3600:
        analizza()
    disco, part = _cerca_partizione(str(sorgente or ""))
    if not disco:
        raise ValueError("unità da recuperare non trovata: ripetete l'analisi")
    if modo not in ("superficiale", "approfondita"):
        raise ValueError("tipo di analisi non valido")
    cat = [c for c in (categorie or []) if c in CATEGORIE]
    if not cat:
        raise ValueError("scegliete almeno un tipo di file")
    dest = next((x for x in destinazioni(casa, dati) if x["id"] == destinazione), None)
    if not dest:
        raise ValueError("destinazione non valida")
    if dest["disco"] and dest["disco"] == disco["id"]:
        raise ValueError("la destinazione è sullo STESSO disco da recuperare: sceglietene un'altra (per esempio un disco esterno)")
    if not dest["scrivibile"]:
        raise ValueError("nella destinazione non si può scrivere")
    # dispositivo e partizione per PhotoRec
    stato = part["stato"] if part else "raw"
    if PROVA and part and os.path.isfile(part["id"]):
        dispositivo, scelta = part["id"], "1"
    elif part is None:
        dispositivo, scelta = disco["id"], "partition_none"
    elif FAM == "windows" and "#" in part["id"]:
        dispositivo, scelta = part["id"].split("#")[0], "partition_none"        # partizione senza lettera: tutto il disco
    else:
        dispositivo, scelta = part["id"], ("1" if stato == "ok" else "partition_none")
    spazio = "freespace" if (modo == "superficiale" and stato == "ok") else "wholespace"
    pid = uuid.uuid4().hex[:12]
    lavoro = os.path.join(dest["percorso"], "Salvadati-lavoro-" + pid)
    piano = {"id": pid, "creato": time.time(), "dispositivo": dispositivo, "scelta": scelta, "spazio": spazio, "modo": modo, "categorie": cat,
             "fileopt": opzioni_photorec(cat, modo), "opzioni": "options,paranoid,keep_corrupted_file_no" if modo == "approfondita" else "options,keep_corrupted_file_no",
             "lavoro": lavoro, "destinazione": dest["percorso"], "sorgente_nome": "%s %s" % (disco["nome"], part["nome"] if part else ""),
             "sorgente_stato": stato, "volume": (part or {}).get("montata") or "", "fs": (part or {}).get("fs") or ""}
    c = _cartella_piani(dati)
    with open(os.path.join(c, "piano-%s.json" % pid), "w", encoding="utf-8") as f:
        json.dump(piano, f, ensure_ascii=False, indent=1)
    # stessa cosa per gli script bash (valori già validati; gli apici si tolgono comunque)
    with open(os.path.join(c, "piano-%s.sh" % pid), "w", encoding="utf-8", newline="\n") as f:
        for k in ("dispositivo", "scelta", "spazio", "fileopt", "opzioni", "lavoro", "destinazione", "volume", "fs", "modo"):
            f.write("P_%s='%s'\n" % (k.upper(), str(piano[k]).replace("'", "")))
    return piano


def leggi_piano(dati, pid):
    if not RE_ID.match(str(pid or "")):
        raise ValueError("piano non valido")
    try:
        with open(os.path.join(_cartella_piani(dati), "piano-%s.json" % pid), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        raise ValueError("piano non trovato")


# --------------------------------------------------------------------------------------------------
#  4) CONTROLLO dei file recuperati: si tengono solo quelli leggibili e funzionanti
# --------------------------------------------------------------------------------------------------
def _leggi(path, n=None, da=0):
    with open(path, "rb") as f:
        if da:
            f.seek(da if da >= 0 else max(0, os.path.getsize(path) + da))
        return f.read() if n is None else f.read(n)


def _ok_jpeg(p, dim):
    if dim < 300:
        return False
    with open(p, "rb") as f:
        if f.read(3) != b"\xff\xd8\xff":
            return False
        f.seek(2)
        sof = False
        while True:
            m = f.read(2)
            if len(m) < 2 or m[0] != 0xFF:
                return False
            t = m[1]
            while t == 0xFF:                                  # byte di riempimento
                x = f.read(1)
                if not x:
                    return False
                t = x[0]
            if t in (0xD8, 0x01) or 0xD0 <= t <= 0xD7:
                continue
            ln = f.read(2)
            if len(ln) < 2:
                return False
            n = struct.unpack(">H", ln)[0]
            if n < 2:
                return False
            if t in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                sof = True
            if t == 0xDA:                                     # inizio dei dati dell'immagine
                break
            f.seek(n - 2, 1)
        if not sof:
            return False
    coda = _leggi(p, None, -4096).rstrip(b"\x00").rstrip(b"\xff")
    return coda.endswith(b"\xff\xd9") or b"\xff\xd9" in coda[-64:]


def _ok_png(p, dim):
    with open(p, "rb") as f:
        if f.read(8) != b"\x89PNG\r\n\x1a\n":
            return False
        primo = True
        while True:
            h = f.read(8)
            if len(h) < 8:
                return False
            n, tipo = struct.unpack(">I4s", h)
            if primo and tipo != b"IHDR":
                return False
            primo = False
            if n > dim:
                return False
            corpo = f.read(n)
            crc = f.read(4)
            if len(corpo) < n or len(crc) < 4 or (zlib.crc32(tipo + corpo) & 0xFFFFFFFF) != struct.unpack(">I", crc)[0]:
                return False
            if tipo == b"IEND":
                return True


def _ok_gif(p, dim):
    return _leggi(p, 6) in (b"GIF87a", b"GIF89a") and _leggi(p, None, -64).rstrip(b"\x00").endswith(b";")


def _ok_bmp(p, dim):
    h = _leggi(p, 30)
    if len(h) < 30 or h[:2] != b"BM":
        return False
    tot, off, hdr = struct.unpack("<I4xII", h[2:18])
    return 26 <= off < dim and hdr in (12, 40, 52, 56, 64, 108, 124) and tot <= dim + 1024


def _ok_tiff(p, dim):
    h = _leggi(p, 16)
    if h[:15] == b"FUJIFILMCCD-RAW":
        return dim > 100000
    if h[:4] in (b"IIRO", b"IIU\x00", b"MMOR"):
        return dim > 100000
    if h[:4] == b"II*\x00":
        off = struct.unpack("<I", h[4:8])[0]
    elif h[:4] == b"MM\x00*":
        off = struct.unpack(">I", h[4:8])[0]
    else:
        return False
    if not 8 <= off < dim - 2:
        return False
    n = struct.unpack("<H" if h[0] == 0x49 else ">H", _leggi(p, 2, off))[0]
    return 1 <= n <= 1000


def _ok_pdf(p, dim):
    if not _leggi(p, 1024).lstrip().startswith(b"%PDF-") or dim < 200:
        return False
    coda = _leggi(p, None, -2048)
    return b"%%EOF" in coda and (b"obj" in _leggi(p, 65536) or b"obj" in coda)


def _ok_zip(p, dim):
    try:
        with zipfile.ZipFile(p) as z:
            if not z.namelist():
                return False
            return z.testzip() is None
    except (zipfile.BadZipFile, OSError, RuntimeError, NotImplementedError, EOFError, ValueError, zlib.error):
        return False


def _ok_ole(p, dim):
    h = _leggi(p, 512)
    if h[:8] != b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" or dim < 1536:
        return False
    shift = struct.unpack("<H", h[30:32])[0]
    nfat = struct.unpack("<I", h[44:48])[0]
    return shift in (9, 12) and 0 < nfat < 100000 and nfat * (1 << shift) // 4 * (1 << shift) >= dim // 2


def _ok_mp4(p, dim):
    pos, tipi = 0, set()
    with open(p, "rb") as f:
        while pos < dim:
            f.seek(pos)
            h = f.read(16)
            if len(h) < 8:
                break
            n, t = struct.unpack(">I4s", h[:8])
            if n == 1 and len(h) >= 16:
                n = struct.unpack(">Q", h[8:16])[0]
            elif n == 0:
                n = dim - pos
            if n < 8 or pos + n > dim + 8 or not re.match(rb"^[a-zA-Z0-9 \-_\xa9]{4}$", t):
                return False
            tipi.add(t)
            pos += n
    return b"moov" in tipi and (b"mdat" in tipi or b"moof" in tipi) or (b"ftyp" in tipi and b"meta" in tipi)   # heic: ftyp+meta


def _ok_riff(p, dim):
    h = _leggi(p, 12)
    if h[:4] != b"RIFF" or h[8:12] not in (b"AVI ", b"WAVE", b"AVIX", b"WEBP"):
        return False
    return struct.unpack("<I", h[4:8])[0] + 8 <= dim + 16 and dim > 1000


def _ok_mp3(p, dim):
    h = _leggi(p, 10)
    inizio = 0
    if h[:3] == b"ID3":
        s = h[6:10]
        inizio = 10 + ((s[0] & 0x7F) << 21 | (s[1] & 0x7F) << 14 | (s[2] & 0x7F) << 7 | (s[3] & 0x7F))
    dati = _leggi(p, 8192, inizio) if inizio else _leggi(p, 8192)
    br = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    sr = [44100, 48000, 32000, 0]
    i, buoni = 0, 0
    while i + 4 <= len(dati) and buoni < 3:
        if dati[i] == 0xFF and (dati[i + 1] & 0xFE) == 0xFA:          # MPEG-1 layer III
            b, s = br[dati[i + 2] >> 4], sr[(dati[i + 2] >> 2) & 3]
            if b and s:
                lung = 144000 * b // s + ((dati[i + 2] >> 1) & 1)
                buoni += 1
                i += lung
                continue
        if buoni:
            return False
        i += 1
    return buoni >= 3 or (buoni >= 1 and dim < 20000)


def _ok_testo(p, dim):
    if dim < 64:
        return False
    d = _leggi(p, 65536)
    if d.startswith(b"{\\rtf"):
        return True
    try:
        t = d.decode("utf-8")
    except UnicodeDecodeError:
        t = d.decode("latin-1")
    stampabili = sum(1 for c in t if c.isprintable() or c in "\r\n\t")
    return stampabili / max(1, len(t)) > 0.97 and len(t.split()) >= 8


def _ok_firma(firma, min_dim=1000):
    def f(p, dim):
        return dim >= min_dim and _leggi(p, len(firma)) == firma
    return f


def _ok_ogg(p, dim):
    return _leggi(p, 4) == b"OggS" and b"OggS" in _leggi(p, None, -65536) and dim > 4000


CONTROLLI = {"jpg": _ok_jpeg, "jpeg": _ok_jpeg, "png": _ok_png, "gif": _ok_gif, "bmp": _ok_bmp,
             "tif": _ok_tiff, "tiff": _ok_tiff, "cr2": _ok_tiff, "nef": _ok_tiff, "arw": _ok_tiff, "dng": _ok_tiff, "raf": _ok_tiff,
             "orf": _ok_tiff, "rw2": _ok_tiff, "pdf": _ok_pdf,
             "zip": _ok_zip, "docx": _ok_zip, "xlsx": _ok_zip, "pptx": _ok_zip, "odt": _ok_zip, "ods": _ok_zip, "odp": _ok_zip, "epub": _ok_zip,
             "doc": _ok_ole, "xls": _ok_ole, "ppt": _ok_ole, "mp4": _ok_mp4, "mov": _ok_mp4, "m4v": _ok_mp4, "m4a": _ok_mp4, "3gp": _ok_mp4,
             "heic": _ok_mp4, "heif": _ok_mp4, "avi": _ok_riff, "wav": _ok_riff, "webp": _ok_riff, "mp3": _ok_mp3,
             "mkv": _ok_firma(b"\x1a\x45\xdf\xa3"), "webm": _ok_firma(b"\x1a\x45\xdf\xa3"), "flac": _ok_firma(b"fLaC"), "ogg": _ok_ogg,
             "7z": _ok_firma(b"7z\xbc\xaf\x27\x1c", 32), "rar": _ok_firma(b"Rar!\x1a\x07", 32), "psd": _ok_firma(b"8BPS", 1000),
             "wmv": _ok_firma(b"\x30\x26\xb2\x75\x8e\x66\xcf\x11"), "asf": _ok_firma(b"\x30\x26\xb2\x75\x8e\x66\xcf\x11"),
             "wma": _ok_firma(b"\x30\x26\xb2\x75\x8e\x66\xcf\x11"),
             "txt": _ok_testo, "csv": _ok_testo, "rtf": _ok_testo}


def controlla_file(path):
    """(esito, motivo): "buono" = si apre ed è integro, "danneggiato", "non_verificabile"."""
    est = path.rsplit(".", 1)[-1].lower() if "." in os.path.basename(path) else ""
    try:
        dim = os.path.getsize(path)
    except OSError:
        return "danneggiato", "illeggibile"
    if dim == 0:
        return "danneggiato", "vuoto"
    f = CONTROLLI.get(est)
    if not f:
        return "non_verificabile", est
    try:
        return ("buono", "") if f(path, dim) else ("danneggiato", "struttura interna rovinata")
    except (OSError, struct.error, IndexError, ValueError, MemoryError):
        return "danneggiato", "struttura interna rovinata"


# --------------------------------------------------------------------------------------------------
#  Nomi leggibili: data di scatto (EXIF), titolo dei documenti, titolo dei brani
# --------------------------------------------------------------------------------------------------
def _exif_data(path):
    try:
        with open(path, "rb") as f:
            d = f.read(131072)
        i = d.find(b"Exif\x00\x00")
        if i < 0:
            return ""
        t = d[i + 6:]
        bo = "<" if t[:2] == b"II" else ">"
        off = struct.unpack(bo + "I", t[4:8])[0]

        def ifd(o):
            n = struct.unpack(bo + "H", t[o:o + 2])[0]
            v = {}
            for k in range(n):
                e = t[o + 2 + 12 * k:o + 14 + 12 * k]
                tag, typ, cnt = struct.unpack(bo + "HHI", e[:8])
                val = struct.unpack(bo + "I", e[8:12])[0]
                v[tag] = (typ, cnt, val, e[8:12])
            return v
        a = ifd(off)
        cand = []
        if 0x8769 in a:
            b = ifd(a[0x8769][2])
            for tg in (0x9003, 0x9004):
                if tg in b:
                    cand.append(b[tg])
        if 0x0132 in a:
            cand.append(a[0x0132])
        for typ, cnt, val, _ in cand:
            s = t[val:val + 19].decode("ascii", "replace")
            m = re.match(r"(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)", s)
            if m and m.group(1) not in ("0000",) and 1990 < int(m.group(1)) < 2100:
                return "%s-%s-%s_%s-%s-%s" % m.groups()
    except (OSError, struct.error, IndexError, ValueError):
        return ""
    return ""


def _titolo_doc(path, est):
    try:
        if est in ("docx", "xlsx", "pptx"):
            with zipfile.ZipFile(path) as z:
                x = z.read("docProps/core.xml").decode("utf-8", "replace")
            m = re.search(r"<dc:title>([^<]{2,80})</dc:title>", x)
            return m.group(1) if m else ""
        if est in ("odt", "ods", "odp"):
            with zipfile.ZipFile(path) as z:
                x = z.read("meta.xml").decode("utf-8", "replace")
            m = re.search(r"<dc:title>([^<]{2,80})</dc:title>", x)
            return m.group(1) if m else ""
        if est == "pdf":
            d = _leggi(path, 65536) + _leggi(path, None, -65536)
            m = re.search(rb"/Title\s*\(([^)]{2,80})\)", d)
            if m:
                return m.group(1).decode("latin-1", "replace")
        if est == "mp3":
            d = _leggi(path, 4096)
            i = d.find(b"TIT2")
            if i > 0:
                n = struct.unpack(">I", d[i + 4:i + 8])[0]
                s = d[i + 11:i + 10 + n]
                return s.decode("utf-16" if d[i + 10] in (1, 2) else "latin-1", "replace").strip("\x00")
    except (OSError, KeyError, zipfile.BadZipFile, struct.error, ValueError, IndexError):
        return ""
    return ""


def _pulisci_nome(s):
    s = re.sub(r"[\x00-\x1f<>:\"/\\|?*]+", " ", s).strip(" .")
    return re.sub(r"\s+", " ", s)[:70]


def _correggi_estensione(path, est):
    """PhotoRec chiama .zip anche documenti Office/LibreOffice: si rimette l'estensione giusta."""
    if est != "zip":
        return est
    try:
        with zipfile.ZipFile(path) as z:
            nomi = set(z.namelist())
            if "word/document.xml" in nomi:
                return "docx"
            if "xl/workbook.xml" in nomi:
                return "xlsx"
            if "ppt/presentation.xml" in nomi:
                return "pptx"
            if "mimetype" in nomi:
                mt = z.read("mimetype").decode("ascii", "replace")
                return {"application/vnd.oasis.opendocument.text": "odt", "application/vnd.oasis.opendocument.spreadsheet": "ods",
                        "application/vnd.oasis.opendocument.presentation": "odp", "application/epub+zip": "epub"}.get(mt, "zip")
    except (zipfile.BadZipFile, OSError, KeyError):
        pass
    return est


# --------------------------------------------------------------------------------------------------
#  5) ELABORAZIONE: controllo, doppioni, nomi, cartelle, rapporto
# --------------------------------------------------------------------------------------------------
STATO = {}          # id piano -> avanzamento dell'elaborazione
LOCK = threading.Lock()


def _hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def stato(pid):
    with LOCK:
        return dict(STATO.get(pid) or {"fase": "attesa"})


def elabora(dati, pid, includi_non_verificati=False):
    """Avvia in un thread il controllo dei file trovati da PhotoRec. Restituisce subito."""
    piano = leggi_piano(dati, pid)
    with LOCK:
        if (STATO.get(pid) or {}).get("fase") == "in_corso":
            return stato(pid)
        STATO[pid] = {"fase": "in_corso", "fatti": 0, "totale": 0}
    threading.Thread(target=_elabora, args=(dati, piano, includi_non_verificati), daemon=True).start()
    return stato(pid)


def _elabora(dati, piano, includi_nv):
    pid = piano["id"]
    try:
        base = piano["lavoro"]
        # file che PhotoRec ha già riconosciuto come rovinati («invalid files found and rejected»)
        scartati_motore = 0
        m = re.search(r"(\d+) invalid files found and rejected", cd_sistema.leggi(os.path.join(base, "photorec.log")))
        if m:
            scartati_motore = int(m.group(1))
        trovati = []
        for r, _, fs in os.walk(base):
            for f in fs:
                if f in ("report.xml",) or f.endswith(".log"):
                    continue
                trovati.append(os.path.join(r, f))
        with LOCK:
            STATO[pid]["totale"] = len(trovati)
        finale = os.path.join(piano["destinazione"], "Salvadati " + time.strftime("%Y-%m-%d %H.%M"))
        conteggi = {c: {"file": 0, "byte": 0} for c in CARTELLA_CAT}
        conteggi["altro"] = {"file": 0, "byte": 0}
        scartati, doppioni, nonver, buoni = scartati_motore, 0, 0, []
        visti = set()
        nomi_usati = set()
        for i, p in enumerate(trovati):
            est = p.rsplit(".", 1)[-1].lower() if "." in os.path.basename(p) else ""
            est = _correggi_estensione(p, est)
            cat = EST_CAT.get(est, "altro")
            if cat != "altro" and cat not in piano["categorie"]:
                _togli(p)
                continue
            esito, _ = controlla_file(p)
            if esito == "non_verificabile" and est in ("txt", "csv", "rtf"):
                esito = "buono" if _ok_testo(p, os.path.getsize(p)) else "danneggiato"
            if esito == "danneggiato" or (esito == "non_verificabile" and not includi_nv):
                if esito == "danneggiato":
                    scartati += 1
                else:
                    nonver += 1
                _togli(p)
            else:
                h = _hash(p)
                if h in visti:
                    doppioni += 1
                    _togli(p)
                else:
                    visti.add(h)
                    buoni.append((p, est, cat))
            if i % 25 == 0:
                with LOCK:
                    STATO[pid].update({"fatti": i + 1, "scartati": scartati, "doppioni": doppioni})
        # nomi e cartelle
        elenco = []
        for p, est, cat in buoni:
            nome = ""
            if cat == "foto" and est in ("jpg", "jpeg", "tif", "tiff", "cr2", "nef", "arw", "dng", "orf", "rw2", "raf"):
                d = _exif_data(p)
                nome = ("Foto " + d) if d else ""
            elif cat in ("documenti", "musica"):
                t = _titolo_doc(p, est)
                nome = _pulisci_nome(t) if t else ""
            if not nome:
                nome = "%s %s" % (CATEGORIE.get(cat, {}).get("nome", "File")[:-1] if cat in CATEGORIE else "File", os.path.splitext(os.path.basename(p))[0].lstrip("f"))
            cart = os.path.join(finale, CARTELLA_CAT.get(cat, "Altro"))
            os.makedirs(cart, exist_ok=True)
            dest = os.path.join(cart, "%s.%s" % (nome, est))
            k = 2
            while dest.lower() in nomi_usati or os.path.exists(dest):
                dest = os.path.join(cart, "%s (%d).%s" % (nome, k, est))
                k += 1
            nomi_usati.add(dest.lower())
            try:
                shutil.move(p, dest)
            except OSError:
                continue
            dim = os.path.getsize(dest)
            conteggi[cat if cat in conteggi else "altro"]["file"] += 1
            conteggi[cat if cat in conteggi else "altro"]["byte"] += dim
            elenco.append({"file": os.path.relpath(dest, finale), "categoria": cat, "byte": dim})
        shutil.rmtree(base, ignore_errors=True)
        totale_file = sum(v["file"] for v in conteggi.values())
        totale_byte = sum(v["byte"] for v in conteggi.values())
        esito = {"fase": "fatto", "cartella": finale if totale_file else "", "file": totale_file, "byte": totale_byte, "categorie": conteggi,
                 "scartati": scartati, "doppioni": doppioni, "non_verificati": nonver, "esaminati": len(trovati),
                 "sorgente": piano["sorgente_nome"], "modo": piano["modo"], "quando": time.strftime("%d/%m/%Y %H:%M")}
        if totale_file:
            _rapporto(finale, esito, elenco)
        with open(os.path.join(_cartella_piani(dati), "esito-%s.json" % pid), "w", encoding="utf-8") as f:
            json.dump(esito, f, ensure_ascii=False)
        with LOCK:
            STATO[pid] = esito
    except Exception as e:   # mai lasciare l'elaborazione «in corso» per sempre
        with LOCK:
            STATO[pid] = {"fase": "errore", "errore": str(e)}


def _togli(p):
    try:
        os.remove(p)
    except OSError:
        pass


def _rapporto(cartella, esito, elenco):
    def mb(b):
        return "%.1f MB" % (b / 1048576.0) if b < 1073741824 else "%.2f GB" % (b / 1073741824.0)
    righe = "".join("<tr><td>%s</td><td>%s</td><td style='text-align:right'>%s</td></tr>" % (
        html.escape(e["file"]), html.escape(CATEGORIE.get(e["categoria"], {}).get("nome", "Altro")), mb(e["byte"])) for e in elenco)
    cat = "".join("<li>%s %s: <b>%d</b> file, %s</li>" % (CATEGORIE[c]["icona"], CATEGORIE[c]["nome"], v["file"], mb(v["byte"]))
                  for c, v in esito["categorie"].items() if c in CATEGORIE and v["file"])
    pagina = ("<!doctype html><html lang='it'><head><meta charset='utf-8'><title>Rapporto Salvadati</title>"
              "<style>body{font:15px/1.5 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;color:#111}"
              "table{border-collapse:collapse;width:100%%}td,th{border-bottom:1px solid #ddd;padding:.3rem}h1{color:#0369a1}</style></head><body>"
              "<h1>🛟 Rapporto di recupero — Salvadati</h1><p>Unità: <b>%s</b> · Ricerca %s · %s</p>"
              "<p><b>%d</b> file recuperati, integri e senza doppioni (%s). Scartati perché danneggiati: %d. Doppioni tolti: %d.</p><ul>%s</ul>"
              "<table><tr><th>File</th><th>Tipo</th><th>Dimensione</th></tr>%s</table>"
              "<p style='color:#555;font-size:12px'>Consulente Digitale · Salvadati — ideato e sviluppato da Danilo D'Auria · codice MIT, testi CC BY-NC-SA 4.0. "
              "Ricerca dei file con PhotoRec (CGSecurity, Christophe Grenier, licenza GPL).</p></body></html>") % (
        html.escape(esito["sorgente"]), html.escape(esito["modo"]), esito["quando"], esito["file"], mb(esito["byte"]), esito["scartati"],
        esito["doppioni"], cat, righe)
    with open(os.path.join(cartella, "Rapporto Salvadati.html"), "w", encoding="utf-8") as f:
        f.write(pagina)
    with open(os.path.join(cartella, "elenco.csv"), "w", encoding="utf-8-sig") as f:
        f.write("file;tipo;byte\n" + "".join("%s;%s;%d\n" % (e["file"].replace(";", ","), e["categoria"], e["byte"]) for e in elenco))


# --------------------------------------------------------------------------------------------------
#  6) COPIA di sicurezza su un'altra unità (esterna o interna), con il controllo dello spazio
# --------------------------------------------------------------------------------------------------
COPIE = {}


def copia(dati, casa, pid, destinazione):
    esito = leggi_esito(dati, pid)
    if not esito.get("cartella") or not os.path.isdir(esito["cartella"]):
        raise ValueError("non ci sono file recuperati da copiare")
    dest = next((x for x in destinazioni(casa, dati) if x["id"] == destinazione), None)
    if not dest or not dest["scrivibile"]:
        raise ValueError("destinazione non valida")
    if os.path.abspath(esito["cartella"]).startswith(os.path.abspath(dest["percorso"]) + os.sep) and dest["id"] != "dest-prova":
        raise ValueError("i file sono già su questa unità: sceglietene un'altra")
    if dest["libero"] < esito["byte"] * 1.02 + 50 * 1048576:
        raise ValueError("spazio insufficiente: servono %.1f GB, liberi %.1f GB" % (esito["byte"] / 1073741824.0, dest["libero"] / 1073741824.0))
    arrivo = os.path.join(dest["percorso"], os.path.basename(esito["cartella"]) + " (copia)")
    with LOCK:
        COPIE[pid] = {"fase": "in_corso", "fatti": 0, "totale": esito["file"], "cartella": arrivo}

    def lavora():
        try:
            n = 0
            for r, _, fs in os.walk(esito["cartella"]):
                rel = os.path.relpath(r, esito["cartella"])
                os.makedirs(os.path.join(arrivo, rel), exist_ok=True)
                for f in fs:
                    shutil.copy2(os.path.join(r, f), os.path.join(arrivo, rel, f))
                    n += 1
                    with LOCK:
                        COPIE[pid]["fatti"] = n
            with LOCK:
                COPIE[pid]["fase"] = "fatto"
        except OSError as e:
            with LOCK:
                COPIE[pid].update({"fase": "errore", "errore": str(e)})
    threading.Thread(target=lavora, daemon=True).start()
    return dict(COPIE[pid])


def stato_copia(pid):
    with LOCK:
        return dict(COPIE.get(pid) or {"fase": "attesa"})


def leggi_esito(dati, pid):
    if not RE_ID.match(str(pid or "")):
        raise ValueError("piano non valido")
    s = stato(pid)
    if s.get("fase") == "fatto":
        return s
    try:
        with open(os.path.join(_cartella_piani(dati), "esito-%s.json" % pid), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def stima(piano):
    """Quanto spazio serve, al massimo, per il lavoro di PhotoRec (prima del controllo dei file)."""
    _, part = _cerca_partizione(piano.get("dispositivo", ""))
    if part and part.get("libero") and piano.get("spazio") == "freespace":
        return part["libero"]
    return part["dimensione"] if part else 0
