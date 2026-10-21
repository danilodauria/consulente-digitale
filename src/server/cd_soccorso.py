# -*- coding: utf-8 -*-
"""
Consulente Digitale - «Neura Soccorso»: diagnosi e riparazione dei PC che non si avviano.

Funziona dalla chiavetta di emergenza (SystemRescue, Linux, utente root: CD_SOCCORSO=1). Guarda i dischi del PC guasto
SENZA modificarli e cerca le cause più comuni, nell'ordine in cui le cerca un tecnico:
  1. il disco è vivo? (SMART: se si sta guastando prima si salvano i dati, niente riparazioni)
  2. cosa c'è installato? (Windows, Linux; BitLocker; partizione di avvio EFI)
  3. file system: NTFS «sporco» o ibernato (avvio rapido di Windows), ext2/3/4 con errori
  4. avvio: voce UEFI mancante, file di avvio di Windows/Linux, avvio di riserva, GRUB
  5. Windows bloccato dagli aggiornamenti (pending.xml), disco pieno
  6. nessun disco visto: impostazione RAID/VMD del BIOS; memoria RAM (memtest)
Ogni riparazione proposta ha un identificativo preso SOLO dalla diagnosi (lista bianca): il browser non può chiedere
comandi diversi. Il rischio di ogni intervento è dichiarato; «Ripara tutto» esegue solo quelli a rischio basso.
CD_SOCCORSO_PROVA=1 = diagnosi di prova e riparazioni simulate (per i test).

Solo libreria standard, Python 3.7+. Ideato e sviluppato da Danilo D'Auria - Codice MIT
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid

ATTIVO = os.environ.get("CD_SOCCORSO") == "1"
PROVA = os.environ.get("CD_SOCCORSO_PROVA") == "1"
ESP_GUID = "c12a7328-f81f-11d2-ba4b-00a0c93ec93b"
NTFS_ESITI = {0: "ok", 12: "non_ntfs", 13: "rovinato", 14: "ibernato", 15: "sporco", 16: "bloccato", 18: "sconosciuto", 19: "permessi"}
_ULTIMA = {"problemi": {}, "quando": 0}
_LAVORO = {"fase": "fermo", "righe": [], "fatti": [], "falliti": []}
_LOCK = threading.Lock()


def disponibile():
    return ATTIVO or PROVA


def _run(cmd, timeout=60):
    try:
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
        return p.returncode, p.stdout.decode("utf-8", "replace")
    except (OSError, subprocess.SubprocessError) as e:
        return 127, str(e)


def _c_e(nome):
    return shutil.which(nome) is not None


def _problema(lista, pid, gravita, titolo, spiegazione, soluzione, riparazione=None, rischio="basso", dati=None):
    lista.append({"tipo": pid, "gravita": gravita, "titolo": titolo, "spiegazione": spiegazione, "soluzione": soluzione,
                  "riparazione": riparazione, "rischio": rischio if riparazione else "", "dati": dati or {}})


# --------------------------------------------------------------------------------------------------
#  Montaggio in sola lettura (per guardare dentro le partizioni senza cambiarle)
# --------------------------------------------------------------------------------------------------
class _Sola:
    def __init__(self, dev, fs):
        self.dev, self.fs, self.dir = dev, fs, None

    def __enter__(self):
        self.dir = tempfile.mkdtemp(prefix="neura-")
        opz = ["-o", "ro"]
        if self.fs == "ntfs":
            rc, _ = _run(["mount", "-t", "ntfs3", "-o", "ro", self.dev, self.dir], 30)
            if rc != 0:
                rc, _ = _run(["ntfs-3g", "-o", "ro", self.dev, self.dir], 30)
        else:
            rc, _ = _run(["mount"] + opz + [self.dev, self.dir], 30)
        if rc != 0:
            os.rmdir(self.dir)
            self.dir = None
        return self.dir

    def __exit__(self, *a):
        if self.dir:
            _run(["umount", self.dir], 30)
            try:
                os.rmdir(self.dir)
            except OSError:
                pass


def _esiste(base, *rel):
    """Cerca un percorso ignorando maiuscole/minuscole (FAT e NTFS montati da Linux)."""
    cur = base
    for parte in rel:
        try:
            nomi = os.listdir(cur)
        except OSError:
            return None
        trovato = next((n for n in nomi if n.lower() == parte.lower()), None)
        if trovato is None:
            return None
        cur = os.path.join(cur, trovato)
    return cur


# --------------------------------------------------------------------------------------------------
#  DIAGNOSI
# --------------------------------------------------------------------------------------------------
def _lsblk():
    rc, out = _run(["lsblk", "-J", "-b", "-o", "NAME,PATH,SIZE,TYPE,FSTYPE,LABEL,PARTTYPE,PARTN,MOUNTPOINT,MODEL,TRAN,RM,ROTA,PKNAME"], 20)
    try:
        return json.loads(out)["blockdevices"]
    except (ValueError, KeyError):
        return []


def _boot_device():
    """La chiavetta da cui è partito SystemRescue (da non toccare)."""
    rc, out = _run(["findmnt", "-no", "SOURCE", "/run/archiso/bootmnt"], 10)
    m = re.match(r"(/dev/(?:sd[a-z]+|nvme\d+n\d+|mmcblk\d+))", out.strip())
    return m.group(1) if m else ""


def _smart(dev):
    if not _c_e("smartctl"):
        return None
    rc, out = _run(["smartctl", "-H", "-j", dev], 30)
    try:
        j = json.loads(out)
        return (j.get("smart_status") or {}).get("passed")
    except ValueError:
        return None


def _efi_voci():
    if not os.path.isdir("/sys/firmware/efi") or not _c_e("efibootmgr"):
        return None
    rc, out = _run(["efibootmgr", "-v"], 20)
    return out.lower() if rc == 0 else None


def _diagnosi_vera():
    problemi, sistemi, dischi = [], [], []
    chiavetta = _boot_device()
    voci_efi = _efi_voci()
    uefi = os.path.isdir("/sys/firmware/efi")
    esp_trovate = []
    for d in _lsblk():
        if d.get("type") != "disk" or (d.get("name") or "").startswith(("loop", "zram", "ram", "sr")) or d.get("path") == chiavetta:
            continue
        dev = d.get("path")
        sano = _smart(dev)
        dischi.append({"dev": dev, "nome": (d.get("model") or "").strip(), "dimensione": int(d.get("size") or 0), "smart": sano})
        if sano is False:
            _problema(problemi, "smart", "grave", "Il disco %s si sta guastando" % dev,
                      "Il controllo SMART del disco dice che è in avaria: ogni scrittura può peggiorare la situazione.",
                      "Prima di tutto salvate i dati con Salvadati su un altro disco, poi sostituite il disco. Niente riparazioni su questo disco.")
        for p in d.get("children") or []:
            pdev, fs = p.get("path"), (p.get("fstype") or "").lower()
            ptype = (p.get("parttype") or "").lower()
            if ptype == ESP_GUID or (fs == "vfat" and (p.get("label") or "").upper() in ("SYSTEM", "EFI", "ESP")):
                esp_trovate.append({"dev": pdev, "disco": dev, "n": p.get("partn")})
                continue
            if fs == "bitlocker":
                _problema(problemi, "bitlocker", "info", "Windows cifrato con BitLocker (%s)" % pdev,
                          "Il disco è protetto: da qui non si può guardare dentro né riparare.",
                          "Se Windows chiede la chiave di ripristino, la trovate su account.microsoft.com/devices/recoverykey (dal telefono).")
                sistemi.append({"tipo": "windows", "dev": pdev, "nome": "Windows (BitLocker)"})
                continue
            if fs == "ntfs":
                rc, _ = _run(["ntfs-3g.probe", "--readonly", pdev], 30) if _c_e("ntfs-3g.probe") else (0, "")
                esito = NTFS_ESITI.get(rc, "sconosciuto")
                win = False
                if esito not in ("rovinato", "non_ntfs"):
                    with _Sola(pdev, "ntfs") as m:
                        if m and _esiste(m, "Windows", "System32", "config", "SYSTEM"):
                            win = True
                            sistemi.append({"tipo": "windows", "dev": pdev, "nome": "Windows"})
                            if _esiste(m, "Windows", "WinSxS", "pending.xml"):
                                _problema(problemi, "pending", "medio", "Aggiornamento di Windows rimasto a metà (%s)" % pdev,
                                          "C'è un aggiornamento in sospeso (pending.xml): spesso causa riavvii continui o «Annullamento delle modifiche».",
                                          "Neura mette da parte il file dell'aggiornamento bloccato: al riavvio Windows riparte senza finirlo.",
                                          "pending", "medio", {"dev": pdev})
                            st = os.statvfs(m)
                            if st.f_blocks and st.f_bavail * 100.0 / st.f_blocks < 1.5:
                                _problema(problemi, "pieno", "medio", "Il disco di Windows è pieno (%s)" % pdev,
                                          "Con meno dell'1-2% di spazio Windows può non avviarsi o non aggiornarsi.",
                                          "Neura svuota le cartelle temporanee di Windows e degli aggiornamenti già scaricati.",
                                          "pieno", "basso", {"dev": pdev})
                if esito == "ibernato":
                    _problema(problemi, "ibernato", "medio", "Windows è rimasto «ibernato» (%s)" % pdev,
                              "L'avvio rapido di Windows ha lasciato il disco bloccato: non si può riparare finché è ibernato.",
                              "Neura toglie il file di ibernazione (si perde solo la sessione sospesa, non i documenti).",
                              "ibernato", "medio", {"dev": pdev})
                elif esito in ("sporco", "rovinato") and (win or esito == "rovinato"):
                    _problema(problemi, "ntfs", "medio", "File system di Windows da controllare (%s)" % pdev,
                              "Il disco non è stato chiuso bene o ha degli errori: Windows può bloccarsi all'avvio.",
                              "Neura corregge gli errori più comuni (ntfsfix) e chiede a Windows un controllo completo al prossimo avvio.",
                              "ntfs", "basso", {"dev": pdev})
            elif fs in ("ext2", "ext3", "ext4"):
                rc, out = _run(["dumpe2fs", "-h", pdev], 20)
                stato = re.search(r"Filesystem state:\s*(.+)", out)
                with _Sola(pdev, fs) as m:
                    if m and _esiste(m, "etc", "os-release"):
                        nome = "Linux"
                        try:
                            with open(_esiste(m, "etc", "os-release"), encoding="utf-8", errors="replace") as f:
                                mm = re.search(r'^PRETTY_NAME="?([^"\n]+)', f.read(), re.M)
                                nome = mm.group(1) if mm else nome
                        except OSError:
                            pass
                        grub = bool(_esiste(m, "boot", "grub") or _esiste(m, "boot", "grub2"))
                        sistemi.append({"tipo": "linux", "dev": pdev, "nome": nome, "grub": grub, "disco": dev})
                        st = os.statvfs(m)
                        if st.f_blocks and st.f_bavail * 100.0 / st.f_blocks < 1:
                            _problema(problemi, "pieno_linux", "medio", "Il disco di %s è pieno (%s)" % (nome, pdev),
                                      "Senza spazio libero Linux può non avviare il desktop.",
                                      "Neura svuota la cache dei pacchetti e i registri vecchi.", "pieno_linux", "basso", {"dev": pdev})
                if stato and ("error" in stato.group(1) or "not clean" in stato.group(1)):
                    _problema(problemi, "ext", "medio", "File system Linux con errori (%s)" % pdev,
                              "Il disco ha errori registrati: all'avvio Linux può fermarsi in «emergency mode».",
                              "Neura ripara gli errori con e2fsck (solo quelli sicuri, in automatico).", "ext", "basso", {"dev": pdev})
    # --- avvio UEFI ---
    win = [s for s in sistemi if s["tipo"] == "windows" and "BitLocker" not in s["nome"]]
    lin = [s for s in sistemi if s["tipo"] == "linux"]
    for e in esp_trovate:
        with _Sola(e["dev"], "vfat") as m:
            if not m:
                continue
            bootmgfw = _esiste(m, "EFI", "Microsoft", "Boot", "bootmgfw.efi")
            fallback = _esiste(m, "EFI", "Boot", "bootx64.efi")
            if win and _esiste(m, "EFI", "Microsoft") and not bootmgfw:
                _problema(problemi, "bcd", "grave", "Mancano i file di avvio di Windows (%s)" % e["dev"],
                          "La partizione di avvio non contiene il «Boot Manager» di Windows.",
                          "Si ricrea dal ripristino di Windows: chiavetta di ripristino o installazione → Ripristina → Prompt dei comandi → "
                          "«bcdboot C:\\Windows». Neura vi guida passo per passo.")
            if bootmgfw and not _esiste(m, "EFI", "Microsoft", "Boot", "BCD"):
                _problema(problemi, "bcd", "grave", "Manca la configurazione di avvio di Windows (BCD)",
                          "Il file BCD è sparito o rovinato: Windows dice «0xc000000f» o «Boot Configuration Data».",
                          "Dal ripristino di Windows: Prompt dei comandi → «bcdboot C:\\Windows». Neura vi guida passo per passo.")
            if bootmgfw and voci_efi is not None and "bootmgfw.efi" not in voci_efi:
                _problema(problemi, "efi_win", "grave", "Il PC ha «dimenticato» Windows tra le voci di avvio",
                          "Il file di avvio di Windows c'è, ma il BIOS/UEFI non ha la voce per avviarlo (capita dopo un aggiornamento del BIOS).",
                          "Neura ricrea la voce «Windows Boot Manager» nel firmware UEFI.", "efi_win", "basso", e)
            if bootmgfw and not fallback:
                _problema(problemi, "fallback", "info", "Manca l'avvio di riserva",
                          "Senza il file di riserva (EFI\\Boot\\bootx64.efi) alcuni PC non trovano Windows se perdono le voci di avvio.",
                          "Neura copia il file di avvio di Windows anche nella posizione di riserva.", "fallback", "basso", e)
            if lin and voci_efi is not None:
                for nome in os.listdir(_esiste(m, "EFI") or m):
                    cart = _esiste(m, "EFI", nome)
                    if nome.lower() in ("boot", "microsoft") or not cart:
                        continue
                    shim = _esiste(cart, "shimx64.efi") or _esiste(cart, "grubx64.efi")
                    if shim and ("\\efi\\%s\\" % nome.lower()) not in voci_efi:
                        _problema(problemi, "efi_linux", "grave", "Il PC ha «dimenticato» Linux (%s) tra le voci di avvio" % nome,
                                  "Il file di avvio di Linux c'è, ma il firmware UEFI non ha la voce per avviarlo.",
                                  "Neura ricrea la voce nel firmware UEFI.", "efi_linux", "basso",
                                  dict(e, cartella=nome, file=os.path.basename(shim)))
    for s in lin:
        if s.get("grub") and uefi and not esp_trovate:
            _problema(problemi, "grub", "grave", "Avvio di %s da reinstallare" % s["nome"],
                      "Non c'è la partizione di avvio EFI per Linux.", "Neura reinstalla GRUB (il programma di avvio di Linux).",
                      "grub", "medio", s)
    if not dischi:
        _problema(problemi, "nessun_disco", "grave", "Nessun disco interno trovato",
                  "Il disco non risponde, è scollegato oppure il BIOS è impostato in modalità «RAID/Intel RST/VMD».",
                  "Nel BIOS/UEFI cercate «SATA Mode» o «VMD» e provate «AHCI» (annotate prima com'era). Se il disco non compare nemmeno "
                  "nel BIOS, va controllato o sostituito.")
    elif not sistemi:
        _problema(problemi, "nessun_sistema", "grave", "Nessun sistema operativo trovato sui dischi",
                  "I dischi ci sono ma non contengono Windows o Linux leggibili: forse sono stati cancellati o formattati.",
                  "Usate Salvadati (analisi approfondita) per recuperare i file, poi reinstallate il sistema.")
    _problema(problemi, "memoria", "info", "Controllo della memoria RAM",
              "Se il PC si blocca o si riavvia da solo, la causa può essere la RAM.",
              "Riavviate dalla chiavetta e scegliete «Memtest86+» nel menu: lasciatelo lavorare almeno un giro completo.")
    return {"problemi": problemi, "sistemi": sistemi, "dischi": dischi, "uefi": uefi}


def _diagnosi_prova():
    p = []
    _problema(p, "ibernato", "medio", "Windows è rimasto «ibernato» (/dev/sda3)", "L'avvio rapido di Windows ha lasciato il disco bloccato.",
              "Neura toglie il file di ibernazione.", "ibernato", "medio", {"dev": "/dev/sda3"})
    _problema(p, "pending", "medio", "Aggiornamento di Windows rimasto a metà (/dev/sda3)", "C'è un aggiornamento in sospeso (pending.xml).",
              "Neura mette da parte il file dell'aggiornamento bloccato.", "pending", "medio", {"dev": "/dev/sda3"})
    _problema(p, "efi_win", "grave", "Il PC ha «dimenticato» Windows tra le voci di avvio", "Il file di avvio di Windows c'è, ma manca la voce.",
              "Neura ricrea la voce «Windows Boot Manager».", "efi_win", "basso", {"dev": "/dev/sda1", "disco": "/dev/sda", "n": 1})
    _problema(p, "fallback", "info", "Manca l'avvio di riserva", "Senza il file di riserva alcuni PC non trovano Windows.",
              "Neura copia il file di avvio nella posizione di riserva.", "fallback", "basso", {"dev": "/dev/sda1"})
    _problema(p, "memoria", "info", "Controllo della memoria RAM", "Se il PC si blocca, la causa può essere la RAM.", "Scegliete «Memtest86+» nel menu.")
    return {"problemi": p, "sistemi": [{"tipo": "windows", "dev": "/dev/sda3", "nome": "Windows"}],
            "dischi": [{"dev": "/dev/sda", "nome": "Disco di prova 500 GB", "dimensione": 500107862016, "smart": True}], "uefi": True}


def diagnosi():
    if not disponibile():
        return {"disponibile": False}
    r = _diagnosi_prova() if PROVA else _diagnosi_vera()
    ordine = {"grave": 0, "medio": 1, "info": 2}
    r["problemi"].sort(key=lambda x: ordine.get(x["gravita"], 3))
    mappa = {}
    for p in r["problemi"]:
        if p["riparazione"]:
            p["chiave"] = uuid.uuid4().hex[:12]
            mappa[p["chiave"]] = p
    with _LOCK:
        _ULTIMA["problemi"], _ULTIMA["quando"] = mappa, time.time()
    gravi = [p for p in r["problemi"] if p["gravita"] == "grave"]
    medi = [p for p in r["problemi"] if p["gravita"] == "medio"]
    def minuscola(t):
        return t if t[:2].isupper() else t[0].lower() + t[1:]      # «PC», «BCD» restano maiuscoli
    if gravi:
        r["sintesi"] = "Ho trovato la causa più probabile: %s." % minuscola(gravi[0]["titolo"])
    elif medi:
        r["sintesi"] = "Ho trovato %d problemi da sistemare. Il primo: %s." % (len(medi), minuscola(medi[0]["titolo"]))
    else:
        r["sintesi"] = "Dischi e avvio sembrano a posto. Se il PC non parte, controllate la memoria RAM e i cavi."
    r["disponibile"], r["prova"] = True, PROVA
    r["problemi"] = [dict((k, v) for k, v in p.items() if k != "dati") for p in r["problemi"]]   # i dati interni restano qui
    return r


# --------------------------------------------------------------------------------------------------
#  RIPARAZIONI (solo quelle proposte dalla diagnosi)
# --------------------------------------------------------------------------------------------------
def _scrivi(t):
    with _LOCK:
        _LAVORO["righe"].append(t)


def _cmd(cmd, timeout=600):
    _scrivi("$ " + " ".join(cmd))
    if PROVA:
        return 0
    rc, out = _run(cmd, timeout)
    for r in out.strip().splitlines()[-12:]:
        _scrivi("  " + r)
    return rc


def _rw(dev, fs):
    """Monta in scrittura e restituisce la cartella (o None)."""
    d = tempfile.mkdtemp(prefix="neura-rw-")
    if PROVA:
        return d
    rc = _cmd(["ntfs-3g", dev, d] if fs == "ntfs" else ["mount", dev, d], 60)
    if rc != 0:
        os.rmdir(d)
        return None
    return d


def _smonta(d):
    if PROVA:
        shutil.rmtree(d, ignore_errors=True)
        return
    _run(["umount", d], 60)
    try:
        os.rmdir(d)
    except OSError:
        pass


def _fix(p):
    t, d = p["riparazione"], p["dati"]
    if t == "ibernato":
        m = tempfile.mkdtemp(prefix="neura-h-")
        try:
            return _cmd(["ntfs-3g", "-o", "remove_hiberfile", d["dev"], m]) == 0
        finally:
            _smonta(m)
    if t == "ntfs":
        return _cmd(["ntfsfix", d["dev"]]) == 0     # senza -d: azzera il registro e chiede a Windows chkdsk al prossimo avvio
    if t == "ext":
        return _cmd(["e2fsck", "-p", "-f", d["dev"]], 3600) in (0, 1)
    if t == "pending":
        m = _rw(d["dev"], "ntfs")
        if not m:
            return False
        try:
            f = _esiste(m, "Windows", "WinSxS", "pending.xml")
            if f:
                os.rename(f, f + ".neura-%s" % time.strftime("%Y%m%d%H%M"))
                _scrivi("  pending.xml messo da parte")
            return True
        finally:
            _smonta(m)
    if t == "pieno":
        m = _rw(d["dev"], "ntfs")
        if not m:
            return False
        try:
            for rel in (("Windows", "Temp"), ("Windows", "SoftwareDistribution", "Download")):
                c = _esiste(m, *rel)
                if c:
                    for n in os.listdir(c):
                        x = os.path.join(c, n)
                        shutil.rmtree(x, ignore_errors=True) if os.path.isdir(x) else os.remove(x)
                    _scrivi("  svuotata " + "\\".join(rel))
            return True
        finally:
            _smonta(m)
    if t == "pieno_linux":
        m = _rw(d["dev"], "ext")
        if not m:
            return False
        try:
            for rel in (("var", "cache", "apt", "archives"), ("var", "cache", "pacman", "pkg"), ("var", "cache", "dnf")):
                c = _esiste(m, *rel)
                if c:
                    for n in os.listdir(c):
                        x = os.path.join(c, n)
                        if os.path.isfile(x) and re.search(r"\.(deb|rpm|pkg\.tar\.\w+)$", n):
                            os.remove(x)
                    _scrivi("  svuotata /" + "/".join(rel))
            j = _esiste(m, "var", "log", "journal")
            if j:
                shutil.rmtree(j, ignore_errors=True)
                os.makedirs(j, exist_ok=True)
            return True
        finally:
            _smonta(m)
    if t == "efi_win":
        return _cmd(["efibootmgr", "-c", "-d", d["disco"], "-p", str(d["n"]), "-L", "Windows Boot Manager",
                     "-l", "\\EFI\\Microsoft\\Boot\\bootmgfw.efi"]) == 0
    if t == "efi_linux":
        return _cmd(["efibootmgr", "-c", "-d", d["disco"], "-p", str(d["n"]), "-L", d["cartella"],
                     "-l", "\\EFI\\%s\\%s" % (d["cartella"], d["file"])]) == 0
    if t == "fallback":
        m = _rw(d["dev"], "vfat")
        if not m:
            return False
        try:
            src = _esiste(m, "EFI", "Microsoft", "Boot", "bootmgfw.efi")
            if src and not _esiste(m, "EFI", "Boot", "bootx64.efi"):
                os.makedirs(_esiste(m, "EFI", "Boot") or os.path.join(_esiste(m, "EFI"), "Boot"), exist_ok=True)
                shutil.copy2(src, os.path.join(_esiste(m, "EFI", "Boot"), "bootx64.efi"))
                _scrivi("  copiato bootmgfw.efi → EFI\\Boot\\bootx64.efi")
            return True
        finally:
            _smonta(m)
    if t == "grub":
        m = _rw(d["dev"], "ext")
        if not m:
            return False
        try:
            for x in ("dev", "proc", "sys", "run"):
                _cmd(["mount", "--bind", "/" + x, os.path.join(m, x)])
            g = "grub2" if _esiste(m, "boot", "grub2") else "grub"
            ok = _cmd(["chroot", m, "%s-install" % g, d["disco"]]) == 0
            ok = ok and _cmd(["chroot", m, "%s-mkconfig" % g, "-o", "/boot/%s/grub.cfg" % g]) == 0
            return ok
        finally:
            for x in ("run", "sys", "proc", "dev"):
                _run(["umount", "-l", os.path.join(m, x)], 30)
            _smonta(m)
    return False


def ripara(chiavi, tutte_sicure=False):
    if not disponibile():
        raise ValueError("Neura Soccorso funziona solo dalla chiavetta di emergenza")
    with _LOCK:
        if _LAVORO["fase"] == "in_corso":
            raise ValueError("c'è già una riparazione in corso")
        mappa = dict(_ULTIMA["problemi"])
    if tutte_sicure:
        scelti = [p for p in mappa.values() if p["rischio"] == "basso"]
    else:
        scelti = [mappa[k] for k in (chiavi or []) if isinstance(k, str) and k in mappa]
    if not scelti:
        raise ValueError("nessuna riparazione scelta: ripetete la diagnosi")
    # ordine sicuro: prima il file system, poi l'avvio
    ordine = ["ibernato", "ntfs", "ext", "pending", "pieno", "pieno_linux", "efi_win", "efi_linux", "fallback", "grub"]
    scelti.sort(key=lambda p: ordine.index(p["riparazione"]) if p["riparazione"] in ordine else 99)
    with _LOCK:
        _LAVORO.update({"fase": "in_corso", "righe": [], "fatti": [], "falliti": []})

    def lavora():
        for p in scelti:
            _scrivi("▶ " + p["titolo"])
            try:
                esito = _fix(p)
            except Exception as e:      # una riparazione non deve fermare le altre
                _scrivi("  errore: %s" % e)
                esito = False
            with _LOCK:
                (_LAVORO["fatti"] if esito else _LAVORO["falliti"]).append(p["titolo"])
            _scrivi("  ✔ fatto" if esito else "  ✖ non riuscito")
        with _LOCK:
            _LAVORO["fase"] = "fatto"
            _ULTIMA["problemi"] = {}
    threading.Thread(target=lavora, daemon=True).start()
    return {"avviato": True, "quante": len(scelti)}


def stato():
    with _LOCK:
        return {"fase": _LAVORO["fase"], "righe": list(_LAVORO["righe"]), "fatti": list(_LAVORO["fatti"]), "falliti": list(_LAVORO["falliti"])}


def riavvia():
    if PROVA or not ATTIVO:
        return {"ok": True, "prova": True}
    subprocess.Popen(["systemctl", "reboot"])
    return {"ok": True}
