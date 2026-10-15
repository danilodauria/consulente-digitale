# -*- coding: utf-8 -*-
"""
Consulente Digitale - Analisi del computer (Windows, Linux, macOS)

Raccoglie SOLO informazioni locali (nessun dato esce dal computer): processore, memoria,
dischi, scheda video, batteria, sistema operativo, firmware (UEFI/BIOS), TPM e Secure Boot.
Il risultato e' un dizionario JSON uguale per i tre sistemi: l'interfaccia (analisi.js)
calcola punteggi, sistema operativo consigliato e programmi adatti.

Solo libreria standard, compatibile Python 3.7+.
Ideato e sviluppato da Danilo D'Auria - Licenza MIT
"""
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time

WINDOWS = sys.platform.startswith("win")
MAC = sys.platform == "darwin"
LINUX = sys.platform.startswith("linux")
NO_WINDOW = 0x08000000 if WINDOWS else 0   # CREATE_NO_WINDOW: niente finestre nere su Windows


def famiglia():
    return "windows" if WINDOWS else ("mac" if MAC else "linux")


def esegui(cmd, timeout=25, entrata=None):
    """Esegue un comando e restituisce il testo prodotto ("" se fallisce)."""
    try:
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout,
                           input=entrata, creationflags=NO_WINDOW)
        return p.stdout.decode("utf-8", "replace")
    except (OSError, subprocess.SubprocessError, ValueError):
        return ""


def leggi(path, default=""):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return default


def powershell(script, timeout=60):
    """Esegue uno script PowerShell e restituisce l'output (UTF-8)."""
    testa = "[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ProgressPreference='SilentlyContinue';"
    return esegui(["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", testa + script],
                  timeout=timeout)


def _num(x, default=0):
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return default


def _lista(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


# ------------------------------------------------------------------------------
#  Generazione del processore: serve per capire eta' del PC e compatibilita' (es. Windows 11)
# ------------------------------------------------------------------------------
def generazione_cpu(nome):
    """Stima marca, generazione e anno approssimativo del processore dal nome commerciale."""
    n = (nome or "").lower()
    info = {"marca": "altro", "generazione": 0, "anno": 0, "fascia": "base"}
    if "apple" in n or re.search(r"\bm[1-9]\b", n):
        m = re.search(r"\bm([1-9])\b", n)
        g = int(m.group(1)) if m else 1
        info.update(marca="apple", generazione=g, anno={1: 2020, 2: 2022, 3: 2023, 4: 2024}.get(g, 2025), fascia="alta")
        if "pro" in n or "max" in n or "ultra" in n:
            info["fascia"] = "top"
        return info
    if "intel" in n:
        info["marca"] = "intel"
        m = re.search(r"core\(tm\)\s*ultra|core ultra", n)
        if m:
            info.update(generazione=15, anno=2024, fascia="alta")
            if re.search(r"ultra\s*[579]\s*2\d\d", n):
                info["anno"] = 2025
            return info
        m = re.search(r"i([3579])[- ](\d{4,5})", n)
        if m:
            num = m.group(2)
            # 5 cifre (i5-10210U, i7-12700H) e 4 cifre che iniziano per 1 (i5-1035G1, i5-1135G7, i5-1235U, i7-1355U)
            # = generazione a due cifre (10-14); le altre 4 cifre (i5-8250U, i3-2100) = una cifra.
            if len(num) == 5 or (len(num) == 4 and num[0] == "1"):
                gen = int(num[:2])
            else:
                gen = int(num[0])
            g = re.search(r"(\d{1,2})(?:th|rd|nd|st)\s+gen", n)     # «13th Gen Intel(R) Core(TM) i5-1335U»
            if g and 1 <= int(g.group(1)) <= 14:
                gen = int(g.group(1))
            info["generazione"] = gen
            info["anno"] = {1: 2010, 2: 2011, 3: 2012, 4: 2013, 5: 2015, 6: 2015, 7: 2016, 8: 2017, 9: 2018, 10: 2019,
                            11: 2020, 12: 2021, 13: 2022, 14: 2023}.get(gen, 2009)
            info["fascia"] = {"3": "base", "5": "media", "7": "alta", "9": "top"}[m.group(1)]
            return info
        m = re.search(r"core\(tm\)\s*([3579])\s*(\d{3})|core\s*([3579])\s*(\d{3})", n)
        if m:   # Core 3/5/7 serie 1 e 2 (2023-2025)
            info.update(generazione=14, anno=2023, fascia="media")
            return info
        if re.search(r"\bn(100|150|200|300|305|50|95|97)\b", n):
            info.update(generazione=12, anno=2023, fascia="base")
            return info
        m = re.search(r"pentium\(r\)?\s*(?:gold|silver)?\s*([5-8])(\d{3})", n)
        if m and "pentium" in n:   # Pentium Gold 6405U/7505/8505 (10a-12a gen.)
            gen = {"5": 9, "6": 10, "7": 11, "8": 12}[m.group(1)]
            info.update(generazione=gen, anno={9: 2018, 10: 2019, 11: 2020, 12: 2022}[gen], fascia="base")
            return info
        if "atom" in n or "celeron" in n or "pentium" in n:
            m = re.search(r"[nj](\d{4})", n)
            if m:
                info.update(generazione=8, anno=2017 + (1 if m.group(1)[0] in "56" else 0))
            elif "silver" in n or "gold" in n:
                info.update(generazione=8, anno=2018)
            else:
                info.update(generazione=2, anno=2010)
            return info
        if "core(tm)2" in n or "core 2" in n or "core2" in n:
            info.update(generazione=0, anno=2007)
        return info
    if "amd" in n or "ryzen" in n:
        info["marca"] = "amd"
        m = re.search(r"ryzen\s*(?:ai\s*)?(?:[3579]|threadripper)\s*(?:pro\s*)?(\d)(\d)(\d)(\d)", n)
        if m:
            serie = int(m.group(1))
            info["generazione"] = serie
            info["anno"] = {1: 2017, 2: 2018, 3: 2019, 4: 2020, 5: 2021, 6: 2022, 7: 2023, 8: 2024, 9: 2024}.get(serie, 2017)
            f = re.search(r"ryzen\s*(?:ai\s*)?([3579])", n)
            info["fascia"] = {"3": "base", "5": "media", "7": "alta", "9": "top"}.get(f.group(1) if f else "5", "media")
            return info
        if "ryzen ai" in n:
            info.update(generazione=9, anno=2024, fascia="alta")
            return info
        if re.search(r"athlon|a[468]-|a1[02]-|e[12]-|phenom|fx-", n):
            info.update(generazione=0, anno=2012)
            if "athlon" in n and re.search(r"\d{4}[ug]", n):
                info.update(generazione=1, anno=2018)
        return info
    if "snapdragon" in n or "qualcomm" in n:
        info.update(marca="qualcomm", generazione=1, anno=2024, fascia="alta")
    return info


# ------------------------------------------------------------------------------
#  Linux
# ------------------------------------------------------------------------------
def _os_release():
    info = {}
    for riga in leggi("/etc/os-release").splitlines():
        if "=" in riga:
            k, v = riga.split("=", 1)
            info[k] = v.strip().strip('"')
    return info


def _gestore_pacchetti():
    for nome in ("apt-get", "dnf", "zypper", "pacman", "apk", "xbps-install", "emerge"):
        if shutil.which(nome):
            return nome.replace("-get", "").replace("-install", "")
    return ""


def analizza_linux():
    r = {}
    osr = _os_release()
    r["sistema"] = {
        "famiglia": "linux", "nome": osr.get("PRETTY_NAME") or "Linux", "id": osr.get("ID", ""),
        "base": osr.get("ID_LIKE", ""), "versione": osr.get("VERSION_ID", ""), "kernel": platform.release(),
        "architettura": platform.machine(), "desktop": os.environ.get("XDG_CURRENT_DESKTOP", ""),
        "sessione": os.environ.get("XDG_SESSION_TYPE", ""), "gestore": _gestore_pacchetti(),
        "flatpak": bool(shutil.which("flatpak")), "snap": bool(shutil.which("snap")),
        "fwupd": bool(shutil.which("fwupdmgr")), "timeshift": bool(shutil.which("timeshift")),
    }
    cpu = {"nome": "", "core": os.cpu_count() or 1, "fisici": 0, "mhz": 0, "flag": []}
    fisici = set()
    for blocco in leggi("/proc/cpuinfo").split("\n\n"):
        d = {}
        for riga in blocco.splitlines():
            if ":" in riga:
                k, v = riga.split(":", 1)
                d[k.strip()] = v.strip()
        if not cpu["nome"]:
            cpu["nome"] = d.get("model name") or d.get("Model") or d.get("Hardware") or ""
            cpu["flag"] = [f for f in (d.get("flags") or "").split() if f in ("avx", "avx2", "avx512f", "sse4_2", "aes", "vmx", "svm", "lm", "popcnt")]
        if d.get("physical id") is not None and d.get("core id") is not None:
            fisici.add((d.get("physical id"), d.get("core id")))
        if d.get("cpu MHz") and not cpu["mhz"]:
            cpu["mhz"] = _num(d.get("cpu MHz"))
    massimo = leggi("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq").strip()
    if massimo:
        cpu["mhz"] = _num(massimo) // 1000
    cpu["fisici"] = len(fisici) or cpu["core"]
    if not cpu["nome"]:
        cpu["nome"] = platform.processor() or platform.machine()
    r["cpu"] = cpu

    mem = {}
    for riga in leggi("/proc/meminfo").splitlines():
        p = riga.split()
        if len(p) >= 2:
            mem[p[0].rstrip(":")] = _num(p[1])
    r["memoria"] = {"totale_mb": mem.get("MemTotal", 0) // 1024, "libera_mb": mem.get("MemAvailable", 0) // 1024,
                    "swap_mb": mem.get("SwapTotal", 0) // 1024, "zram": os.path.exists("/sys/block/zram0"),
                    "swappiness": _num(leggi("/proc/sys/vm/swappiness").strip(), 60)}

    dischi = []
    out = esegui(["lsblk", "-J", "-d", "-b", "-o", "NAME,ROTA,SIZE,MODEL,TRAN,TYPE"])
    try:
        for d in json.loads(out).get("blockdevices", []):
            if d.get("type") != "disk" or str(d.get("name", "")).startswith(("loop", "zram", "ram", "sr")):
                continue
            rota = d.get("rota")
            tipo = "HDD" if rota in (True, "1", 1) else "SSD"
            if str(d.get("name", "")).startswith("nvme") or d.get("tran") == "nvme":
                tipo = "NVMe"
            if d.get("tran") == "usb":
                tipo = "USB"
            if _num(d.get("size")) < 1e9:
                continue
            dischi.append({"nome": (d.get("model") or d.get("name") or "").strip(), "tipo": tipo,
                           "gb": round(_num(d.get("size")) / 1e9), "bus": d.get("tran") or ""})
    except ValueError:
        pass
    r["dischi"] = dischi
    try:
        u = shutil.disk_usage("/")
        r["spazio"] = [{"unita": "/", "totale_gb": round(u.total / 1e9, 1), "libero_gb": round(u.free / 1e9, 1)}]
    except OSError:
        r["spazio"] = []

    gpu = []
    out = esegui(["lspci", "-mm"]) if shutil.which("lspci") else ""
    for riga in out.splitlines():
        if re.search(r'"(VGA compatible controller|3D controller|Display controller)"', riga):
            campi = re.findall(r'"([^"]*)"', riga)
            if len(campi) >= 3:
                gpu.append({"nome": (campi[1] + " " + campi[2]).strip(), "driver": ""})
    if not gpu:
        for card in sorted(os.listdir("/sys/class/drm")) if os.path.isdir("/sys/class/drm") else []:
            if re.match(r"card\d+$", card):
                ven = leggi("/sys/class/drm/%s/device/vendor" % card).strip()
                nome = {"0x8086": "Intel", "0x1002": "AMD", "0x10de": "NVIDIA"}.get(ven, ven)
                if nome:
                    gpu.append({"nome": nome, "driver": ""})
    r["gpu"] = gpu

    r["firmware"] = {"uefi": os.path.isdir("/sys/firmware/efi"),
                     "secure_boot": None, "tpm": "2.0" if leggi("/sys/class/tpm/tpm0/tpm_version_major").strip() == "2"
                     else ("presente" if os.path.exists("/sys/class/tpm/tpm0") else "")}
    sb = esegui(["mokutil", "--sb-state"]) if shutil.which("mokutil") else ""
    if sb:
        r["firmware"]["secure_boot"] = "enabled" in sb.lower()
    r["computer"] = {
        "produttore": leggi("/sys/class/dmi/id/sys_vendor").strip(), "modello": leggi("/sys/class/dmi/id/product_name").strip(),
        "bios": leggi("/sys/class/dmi/id/bios_version").strip(), "bios_data": leggi("/sys/class/dmi/id/bios_date").strip(),
        "telaio": _num(leggi("/sys/class/dmi/id/chassis_type").strip()),
    }
    bat = []
    base = "/sys/class/power_supply"
    for b in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if not b.startswith("BAT"):
            continue
        p = os.path.join(base, b)
        pieno = _num(leggi(p + "/energy_full").strip() or leggi(p + "/charge_full").strip())
        progetto = _num(leggi(p + "/energy_full_design").strip() or leggi(p + "/charge_full_design").strip())
        bat.append({"carica": _num(leggi(p + "/capacity").strip()), "stato": leggi(p + "/status").strip(),
                    "salute": round(100.0 * pieno / progetto) if progetto else 0, "cicli": _num(leggi(p + "/cycle_count").strip())})
    r["batteria"] = bat
    r["portatile"] = bool(bat) or r["computer"]["telaio"] in (8, 9, 10, 11, 14, 30, 31, 32)
    try:
        r["acceso_da_ore"] = round(float(leggi("/proc/uptime").split()[0]) / 3600, 1)
    except (ValueError, IndexError):
        r["acceso_da_ore"] = 0
    return r


# ------------------------------------------------------------------------------
#  Windows (PowerShell + CIM/WMI, senza diritti di amministratore)
# ------------------------------------------------------------------------------
PS_ANALISI = r"""
$ErrorActionPreference='SilentlyContinue'
if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) {
  function Get-CimInstance { param($ClassName, $Namespace='root\cimv2', $Filter); if ($Filter) { Get-WmiObject -Class $ClassName -Namespace $Namespace -Filter $Filter } else { Get-WmiObject -Class $ClassName -Namespace $Namespace } }
}
$cs=Get-CimInstance -ClassName Win32_ComputerSystem
$os=Get-CimInstance -ClassName Win32_OperatingSystem
$cpu=@(Get-CimInstance -ClassName Win32_Processor)[0]
$bios=Get-CimInstance -ClassName Win32_BIOS
$cv=Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$ctl=Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control'
$sb=Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State'
$tpm=$null; try { $t=Get-CimInstance -Namespace 'root\cimv2\security\microsofttpm' -ClassName Win32_Tpm; if ($t) { $tpm=($t.SpecVersion -split ',')[0] } } catch {}
# Senza amministratore Win32_Tpm spesso non risponde: si guarda il dispositivo (ACPI MSFT0101 = TPM 2.0), poi tpmtool
if (-not $tpm) { $d=@(Get-CimInstance -ClassName Win32_PnPEntity | Where-Object { "$($_.DeviceID)" -match '^ACPI\\(MSFT0101|PNP0C31|IFX0102|NTC0702)' -or "$($_.Name)" -match 'Trusted Platform|TPM' }); if ($d.Count -gt 0) { if ((($d | ForEach-Object { "$($_.DeviceID) $($_.Name)" }) -join ' ') -match 'MSFT0101|2\.0') { $tpm='2.0' } else { $tpm='presente' } } }
if (-not $tpm -or $tpm -eq 'presente') { try { $tt = (& tpmtool.exe getdeviceinformation 2>$null) -join ' '; if ($tt -match '2\.0') { $tpm='2.0' } elseif ($tt -match 'True|Vero') { if (-not $tpm) { $tpm='presente' } } } catch { $null = $_ } }
$dischi=@(); try { $dischi=@(Get-PhysicalDisk | ForEach-Object { @{nome="$($_.FriendlyName)"; tipo="$($_.MediaType)"; bus="$($_.BusType)"; gb=[math]::Round($_.Size/1e9); salute="$($_.HealthStatus)"} }) } catch {}
if ($dischi.Count -eq 0) { $dischi=@(Get-CimInstance -ClassName Win32_DiskDrive | ForEach-Object { @{nome="$($_.Model)"; tipo=''; bus="$($_.InterfaceType)"; gb=[math]::Round($_.Size/1e9); salute="$($_.Status)"} }) }
$spazio=@(Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { @{unita="$($_.DeviceID)"; totale_gb=[math]::Round($_.Size/1e9,1); libero_gb=[math]::Round($_.FreeSpace/1e9,1)} })
$gpu=@(Get-CimInstance -ClassName Win32_VideoController | ForEach-Object { @{nome="$($_.Name)"; driver="$($_.DriverVersion)"; ram_mb=[math]::Round($_.AdapterRAM/1048576)} })
$bat=@(Get-CimInstance -ClassName Win32_Battery | ForEach-Object { @{carica=$_.EstimatedChargeRemaining; stato="$($_.BatteryStatus)"; salute=0; cicli=0} })
$banchi=@(Get-CimInstance -ClassName Win32_PhysicalMemory | ForEach-Object { @{gb=[math]::Round($_.Capacity/1073741824); mhz=$_.Speed} })
$slot=(Get-CimInstance -ClassName Win32_PhysicalMemoryArray | Measure-Object -Property MemoryDevices -Sum).Sum
$prob=@(Get-CimInstance -ClassName Win32_PnPEntity -Filter 'ConfigManagerErrorCode<>0' | ForEach-Object { @{nome="$($_.Name)"; codice=$_.ConfigManagerErrorCode} })
$avvio=@(Get-CimInstance -ClassName Win32_StartupCommand).Count
$av=@(); try { $av=@(Get-CimInstance -Namespace 'root\SecurityCenter2' -ClassName AntiVirusProduct | ForEach-Object { "$($_.displayName)" }) } catch {}
$r=@{
 sistema=@{famiglia='windows'; nome="$($os.Caption)"; versione="$($cv.DisplayVersion)"; build="$($os.BuildNumber).$($cv.UBR)"; architettura="$($os.OSArchitecture)"; edizione="$($cv.EditionID)"; installato="$($os.InstallDate)"; winget=[bool](Get-Command winget -ErrorAction SilentlyContinue); antivirus=$av; programmi_avvio=$avvio}
 cpu=@{nome="$($cpu.Name)".Trim(); core=$cpu.NumberOfLogicalProcessors; fisici=$cpu.NumberOfCores; mhz=$cpu.MaxClockSpeed; virtualizzazione=[bool]$cpu.VirtualizationFirmwareEnabled}
 memoria=@{totale_mb=[math]::Round($cs.TotalPhysicalMemory/1048576); libera_mb=[math]::Round($os.FreePhysicalMemory/1024); banchi=$banchi; slot=$slot}
 dischi=$dischi; spazio=$spazio; gpu=$gpu; batteria=$bat; problemi_dispositivi=$prob
 firmware=@{uefi=($ctl.PEFirmwareType -eq 2); secure_boot=($sb.UEFISecureBootEnabled -eq 1); tpm="$tpm"}
 computer=@{produttore="$($cs.Manufacturer)"; modello="$($cs.Model)"; bios="$($bios.SMBIOSBIOSVersion)"; bios_data="$($bios.ReleaseDate)"; seriale="$($bios.SerialNumber)"; tipo=$cs.PCSystemType}
 acceso_da_ore=[math]::Round(((Get-Date)-$os.LastBootUpTime).TotalHours,1)
}
$r | ConvertTo-Json -Depth 5 -Compress
"""


def analizza_windows():
    out = powershell(PS_ANALISI, timeout=90).strip()
    try:
        r = json.loads(out[out.find("{"):]) if "{" in out else {}
    except ValueError:
        r = {}
    r.setdefault("sistema", {"famiglia": "windows", "nome": "Windows " + platform.release()})
    r["sistema"]["famiglia"] = "windows"
    r["sistema"]["release"] = platform.release()
    r["sistema"]["build_python"] = platform.version()
    for k in ("dischi", "spazio", "gpu", "batteria", "problemi_dispositivi"):
        r[k] = _lista(r.get(k))
    for d in r["dischi"]:
        t = str(d.get("tipo") or "")
        bus = str(d.get("bus") or "").lower()
        d["tipo"] = "NVMe" if "nvme" in bus else ("SSD" if t in ("SSD", "4") else ("HDD" if t in ("HDD", "3") else
                                                                                    ("USB" if "usb" in bus else (t or "?"))))
    r.setdefault("cpu", {"nome": platform.processor(), "core": os.cpu_count() or 1})
    r.setdefault("memoria", {"totale_mb": 0})
    r.setdefault("firmware", {})
    r.setdefault("computer", {})
    r["portatile"] = bool(r["batteria"]) or _num(r["computer"].get("tipo")) == 2
    # Salute della batteria: powercfg non serve da amministratore, ma e' lento: lo fa l'azione "batteria"
    return r


# ------------------------------------------------------------------------------
#  macOS
# ------------------------------------------------------------------------------
def analizza_mac():
    r = {}
    ver = esegui(["sw_vers", "-productVersion"]).strip()
    nomi = {"26": "Tahoe", "15": "Sequoia", "14": "Sonoma", "13": "Ventura", "12": "Monterey", "11": "Big Sur",
            "10.15": "Catalina", "10.14": "Mojave", "10.13": "High Sierra"}
    chiave = ver.split(".")[0] if not ver.startswith("10.") else ".".join(ver.split(".")[:2])
    r["sistema"] = {"famiglia": "mac", "nome": ("macOS %s %s" % (nomi.get(chiave, ""), ver)).replace("  ", " "),
                    "versione": ver, "build": esegui(["sw_vers", "-buildVersion"]).strip(), "architettura": platform.machine(),
                    "brew": bool(shutil.which("brew") or os.path.exists("/opt/homebrew/bin/brew") or os.path.exists("/usr/local/bin/brew"))}
    sp = {}
    out = esegui(["system_profiler", "-json", "SPHardwareDataType", "SPDisplaysDataType", "SPPowerDataType", "SPNVMeDataType",
                  "SPSerialATADataType"], timeout=60)
    try:
        sp = json.loads(out) if out else {}
    except ValueError:
        sp = {}
    hw = (sp.get("SPHardwareDataType") or [{}])[0]
    nome_cpu = esegui(["sysctl", "-n", "machdep.cpu.brand_string"]).strip() or hw.get("chip_type") or hw.get("cpu_type", "")
    r["cpu"] = {"nome": nome_cpu, "core": _num(esegui(["sysctl", "-n", "hw.logicalcpu"]).strip(), os.cpu_count() or 1),
                "fisici": _num(esegui(["sysctl", "-n", "hw.physicalcpu"]).strip()), "mhz": 0}
    totale = _num(esegui(["sysctl", "-n", "hw.memsize"]).strip()) // (1024 * 1024)
    r["memoria"] = {"totale_mb": totale, "libera_mb": 0}
    vm = esegui(["vm_stat"])
    pagina = 16384 if "16384" in vm[:120] else 4096
    libere = 0
    for chiave_vm in ("Pages free", "Pages inactive", "Pages speculative"):
        m = re.search(chiave_vm + r":\s+(\d+)", vm)
        if m:
            libere += int(m.group(1))
    r["memoria"]["libera_mb"] = libere * pagina // (1024 * 1024)
    dischi = []
    for k in ("SPNVMeDataType", "SPSerialATADataType"):
        for ctrl in sp.get(k) or []:
            for d in ctrl.get("_items") or []:
                tipo = "NVMe" if k == "SPNVMeDataType" else ("SSD" if "ssd" in str(d.get("spsata_medium_type", "")).lower() else "HDD")
                dischi.append({"nome": d.get("_name", ""), "tipo": tipo, "gb": round(_num(d.get("size_in_bytes")) / 1e9),
                               "salute": d.get("smart_status", "")})
    if not dischi:
        dischi.append({"nome": "Disco interno", "tipo": "SSD" if platform.machine() == "arm64" else "?", "gb": 0})
    r["dischi"] = dischi
    try:
        u = shutil.disk_usage("/")
        r["spazio"] = [{"unita": "Macintosh HD", "totale_gb": round(u.total / 1e9, 1), "libero_gb": round(u.free / 1e9, 1)}]
    except OSError:
        r["spazio"] = []
    r["gpu"] = [{"nome": g.get("sppci_model", g.get("_name", "")), "driver": "", "core": g.get("sppci_cores", "")}
                for g in sp.get("SPDisplaysDataType") or []]
    bat = []
    for p in sp.get("SPPowerDataType") or []:
        info = p.get("sppower_battery_health_info")
        if info:
            carica = p.get("sppower_battery_charge_info", {})
            salute = str(info.get("sppower_battery_health_maximum_capacity", "")).rstrip("%")
            bat.append({"carica": _num(carica.get("sppower_battery_state_of_charge")), "stato": info.get("sppower_battery_health", ""),
                        "salute": _num(salute), "cicli": _num(info.get("sppower_battery_cycle_count"))})
    r["batteria"] = bat
    r["computer"] = {"produttore": "Apple", "modello": hw.get("machine_name", "") + " " + hw.get("machine_model", ""),
                     "bios": hw.get("boot_rom_version", ""), "seriale": hw.get("serial_number", "")}
    r["firmware"] = {"uefi": True, "secure_boot": None, "tpm": "Secure Enclave" if platform.machine() == "arm64" else ""}
    r["portatile"] = "book" in r["computer"]["modello"].lower() or bool(bat)
    up = re.search(r"kern.boottime: \{ sec = (\d+)", esegui(["sysctl", "kern.boottime"]))
    r["acceso_da_ore"] = round((time.time() - int(up.group(1))) / 3600, 1) if up else 0
    return r


# ------------------------------------------------------------------------------
_CACHE = {"t": 0, "r": None}


def analizza(forza=False):
    """Analisi completa del computer (in cache per 10 minuti)."""
    if not forza and _CACHE["r"] and time.time() - _CACHE["t"] < 600:
        return _CACHE["r"]
    t0 = time.time()
    try:
        r = analizza_windows() if WINDOWS else (analizza_mac() if MAC else analizza_linux())
    except Exception as e:     # l'analisi non deve mai bloccare il programma
        r = {"sistema": {"famiglia": famiglia(), "nome": platform.platform()}, "cpu": {"nome": platform.processor()},
             "memoria": {"totale_mb": 0}, "errore": str(e)}
    for k in ("dischi", "spazio", "gpu", "batteria"):
        r.setdefault(k, [])
    r.setdefault("firmware", {})
    r.setdefault("computer", {})
    r["cpu"]["stima"] = generazione_cpu(r["cpu"].get("nome", ""))
    r["cpu"]["arm"] = platform.machine().lower() in ("arm64", "aarch64", "armv7l")
    r["nome_pc"] = platform.node()
    r["python"] = platform.python_version()
    r["durata_s"] = round(time.time() - t0, 1)
    r["quando"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    _CACHE.update(t=time.time(), r=r)
    return r


def riassunto(r=None):
    """Una riga per il cervello digitale (prompt dell'IA)."""
    r = r or analizza()
    disco = ", ".join("%s %s GB" % (d.get("tipo", "?"), d.get("gb", "?")) for d in r.get("dischi", [])[:2]) or "disco sconosciuto"
    gpu = "; ".join(g.get("nome", "") for g in r.get("gpu", [])[:2]) or "scheda video integrata"
    return "%s | %s (%s core) | RAM %s GB | %s | %s | %s %s" % (
        r["sistema"].get("nome", "?"), r["cpu"].get("nome", "?"), r["cpu"].get("core", "?"),
        round(r["memoria"].get("totale_mb", 0) / 1024.0, 1), disco, gpu,
        r["computer"].get("produttore", ""), r["computer"].get("modello", ""))


if __name__ == "__main__":
    print(json.dumps(analizza(True), indent=1, ensure_ascii=False))
