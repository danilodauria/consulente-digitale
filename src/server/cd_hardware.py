# -*- coding: utf-8 -*-
"""
Consulente Digitale - Ispettore hardware e sensori (alla maniera di HWiNFO, CPU-Z e GPU-Z, scritto da zero)

dettagli()  -> descrizione approfondita e stabile del computer: processore (core, thread, cache, istruzioni,
               zoccolo), scheda madre e BIOS, banchi di memoria (tipo, velocità, produttore, codice, slot liberi),
               schede video (memoria, driver), dischi (bus, firmware), batteria, slot e porte, rete e audio.
sensori()   -> lettura in diretta: uso di ogni core, frequenza, temperature, ventole, tensioni, memoria,
               dischi (attività e temperatura), rete, scheda video, batteria. Su Windows e macOS una piccola
               «sonda» resta accesa in sottofondo (un solo processo) e si spegne da sola 60 s dopo l'ultima lettura.

Tutto in sola lettura e senza permessi di amministratore. Dove il sistema nasconde un dato senza permessi
(temperature dei core su Windows, banchi di memoria su alcuni Linux) lo si dice, e si propone il modo ufficiale
per averlo (LibreHardwareMonitor su Windows, l'azione «Lettura completa della scheda madre»).
Solo libreria standard, compatibile Python 3.7+.
Ideato e sviluppato da Danilo D'Auria - Licenza MIT
"""
import glob
import json
import os
import re
import shutil
import subprocess
import threading
import time

import cd_sistema
from cd_sistema import esegui, leggi, powershell, _num, _lista

FAM = cd_sistema.famiglia()


# ==============================================================================
#  Dettagli (cache 10 minuti)
# ==============================================================================
_DET = {"t": 0, "d": None}


def _kb(x):
    return _num(str(x).replace("K", "").strip())


def dettagli_linux():
    d = {"cpu": {}, "cache": [], "scheda": {}, "memoria": {"moduli": []}, "gpu": [], "dischi": [], "rete": [], "audio": [], "porte": [], "slot": []}
    # processore
    try:
        lc = json.loads(esegui(["lscpu", "-J"]) or "{}").get("lscpu", [])
        L = dict((x.get("field", "").rstrip(":"), x.get("data")) for x in lc)
    except ValueError:
        L = {}
    info = {}
    for riga in leggi("/proc/cpuinfo").split("\n\n")[0].splitlines():
        if ":" in riga:
            k, v = riga.split(":", 1)
            info[k.strip()] = v.strip()
    flags = (info.get("flags") or "").split()
    d["cpu"] = {"nome": L.get("Model name") or info.get("model name", ""), "produttore": L.get("Vendor ID", ""),
                "famiglia": L.get("CPU family", ""), "modello": L.get("Model", ""), "stepping": L.get("Stepping", ""),
                "core": _num(L.get("Core(s) per socket")) * max(1, _num(L.get("Socket(s)"), 1)), "thread": _num(L.get("CPU(s)")),
                "socket": _num(L.get("Socket(s)"), 1), "mhz_max": _num(L.get("CPU max MHz")), "mhz_min": _num(L.get("CPU min MHz")),
                "microcodice": info.get("microcode", ""), "virtualizzazione": L.get("Virtualization", ""), "bit": "64" if "lm" in flags else "32",
                "istruzioni": [f.upper() for f in ("mmx", "sse", "sse2", "ssse3", "sse4_1", "sse4_2", "avx", "avx2", "avx512f", "fma", "aes", "sha_ni", "vmx", "svm") if f in flags]}
    for idx in sorted(glob.glob("/sys/devices/system/cpu/cpu0/cache/index*")):
        d["cache"].append({"livello": "L" + leggi(idx + "/level").strip(), "tipo": leggi(idx + "/type").strip(),
                           "kb": _kb(leggi(idx + "/size").strip()), "vie": _num(leggi(idx + "/ways_of_associativity").strip())})
    # scheda madre (DMI, leggibile da tutti) e memoria tramite udev (systemd 250+, senza root)
    dmi = lambda k: leggi("/sys/class/dmi/id/" + k).strip()
    d["scheda"] = {"produttore": dmi("board_vendor"), "modello": dmi("board_name"), "versione": dmi("board_version"),
                   "bios_produttore": dmi("bios_vendor"), "bios": dmi("bios_version"), "bios_data": dmi("bios_date"),
                   "sistema": (dmi("sys_vendor") + " " + dmi("product_name")).strip(), "telaio": _num(dmi("chassis_type"))}
    ud = esegui(["udevadm", "info", "-p", "/sys/class/dmi/id"]) if shutil.which("udevadm") else ""
    props = dict(re.findall(r"^E: (MEMORY_[A-Z0-9_]+)=(.*)$", ud, re.M))
    n = _num(props.get("MEMORY_ARRAY_NUM_DEVICES"))
    d["memoria"]["slot"] = n
    d["memoria"]["max_gb"] = round(_num(props.get("MEMORY_ARRAY_MAX_CAPACITY")) / 1073741824) if props.get("MEMORY_ARRAY_MAX_CAPACITY") else 0
    for i in range(n or 16):
        p = "MEMORY_DEVICE_%d_" % i
        if p + "LOCATOR" not in props and p + "SIZE" not in props:
            continue
        size = _num(props.get(p + "SIZE"))
        d["memoria"]["moduli"].append({"posizione": props.get(p + "LOCATOR", ""), "banco": props.get(p + "BANK_LOCATOR", ""),
                                       "gb": round(size / 1073741824) if size else 0, "tipo": props.get(p + "MEMORY_TYPE", ""),
                                       "mhz": _num(props.get(p + "CONFIGURED_SPEED_MTS") or props.get(p + "SPEED_MTS")),
                                       "produttore": props.get(p + "MANUFACTURER", ""), "codice": props.get(p + "PART_NUMBER", "").strip(),
                                       "formato": props.get(p + "FORM_FACTOR", ""), "tensione_mv": _num(props.get(p + "CONFIGURED_VOLTAGE"))})
    if not d["memoria"]["moduli"]:
        d["memoria"]["nota"] = "I banchi di memoria si leggono con «Lettura completa della scheda madre» (amministratore)."
    # schede video
    for card in sorted(glob.glob("/sys/class/drm/card[0-9]")):
        dev = card + "/device"
        ven = leggi(dev + "/vendor").strip()
        nome = {"0x8086": "Intel", "0x1002": "AMD", "0x10de": "NVIDIA"}.get(ven, ven)
        vram = _num(leggi(dev + "/mem_info_vram_total").strip())
        d["gpu"].append({"nome": nome, "vram_mb": vram // 1048576 if vram else 0, "driver": os.path.basename(os.path.realpath(dev + "/driver")) if os.path.exists(dev + "/driver") else "",
                         "pcie": leggi(dev + "/current_link_speed").strip() + (" x" + leggi(dev + "/current_link_width").strip() if os.path.exists(dev + "/current_link_width") else ""),
                         "id": ven + ":" + leggi(dev + "/device").strip()})
    if shutil.which("lspci"):
        nomi = [l.split(": ", 1)[1] for l in esegui(["lspci"]).splitlines() if re.search(r"VGA|3D controller|Display", l) and ": " in l]
        for i, g in enumerate(d["gpu"]):
            if i < len(nomi):
                g["nome"] = nomi[i]
        d["audio"] = [l.split(": ", 1)[1] for l in esegui(["lspci"]).splitlines() if "Audio" in l and ": " in l]
    if shutil.which("nvidia-smi"):
        q = esegui(["nvidia-smi", "--query-gpu=name,memory.total,driver_version,pcie.link.gen.current,pcie.link.width.current", "--format=csv,noheader,nounits"])
        for riga in q.splitlines():
            p = [x.strip() for x in riga.split(",")]
            if len(p) >= 3:
                d["gpu"].append({"nome": p[0], "vram_mb": _num(p[1]), "driver": "nvidia " + p[2], "pcie": "Gen%s x%s" % (p[3], p[4]) if len(p) > 4 else ""})
    # dischi
    try:
        for b in json.loads(esegui(["lsblk", "-J", "-d", "-b", "-o", "NAME,MODEL,SIZE,ROTA,TRAN,REV,TYPE"]) or "{}").get("blockdevices", []):
            if b.get("type") != "disk" or str(b.get("name", "")).startswith(("loop", "zram", "ram", "sr")) or _num(b.get("size")) < 1e9:
                continue
            nome = b.get("name", "")
            tipo = "NVMe" if nome.startswith("nvme") else ("HDD" if b.get("rota") in (True, "1", 1) else "SSD")
            if b.get("tran") == "usb":
                tipo = "USB"
            d["dischi"].append({"nome": (b.get("model") or nome).strip(), "dispositivo": "/dev/" + nome, "tipo": tipo, "bus": (b.get("tran") or "").upper(),
                                "gb": round(_num(b.get("size")) / 1e9), "firmware": (b.get("rev") or "").strip()})
    except ValueError:
        pass
    for n in sorted(os.listdir("/sys/class/net")) if os.path.isdir("/sys/class/net") else []:
        if n == "lo" or not os.path.exists("/sys/class/net/%s/device" % n):
            continue
        d["rete"].append({"nome": n, "tipo": "Wi-Fi" if os.path.isdir("/sys/class/net/%s/wireless" % n) else "Ethernet",
                          "velocita_mbps": _num(leggi("/sys/class/net/%s/speed" % n).strip())})
    if shutil.which("lsusb"):
        d["usb"] = [l.split(": ", 1)[1] if ": " in l else l for l in esegui(["lsusb"]).splitlines() if "root hub" not in l][:30]
    return d


PS_DETTAGLI = r"""
$ErrorActionPreference='SilentlyContinue'
$c=@(Get-CimInstance Win32_Processor)[0]
$cache=@(Get-CimInstance Win32_CacheMemory | ForEach-Object { @{livello="L$($_.Level - 2)"; kb=[int]$_.InstalledSize; tipo="$($_.Purpose)"} })
$bb=Get-CimInstance Win32_BaseBoard; $bi=Get-CimInstance Win32_BIOS; $cs=Get-CimInstance Win32_ComputerSystem; $en=Get-CimInstance Win32_SystemEnclosure
$arr=Get-CimInstance Win32_PhysicalMemoryArray
$tipi=@{20='DDR';21='DDR2';24='DDR3';26='DDR4';30='LPDDR4';34='DDR5';35='LPDDR5'}
$mod=@(Get-CimInstance Win32_PhysicalMemory | ForEach-Object { $t=$tipi[[int]$_.SMBIOSMemoryType]; if(-not $t){$t="tipo $($_.SMBIOSMemoryType)"}
  @{posizione="$($_.DeviceLocator)"; banco="$($_.BankLabel)"; gb=[math]::Round($_.Capacity/1073741824); tipo=$t; mhz=[int]$_.ConfiguredClockSpeed; mhz_max=[int]$_.Speed;
    produttore="$($_.Manufacturer)".Trim(); codice="$($_.PartNumber)".Trim(); formato=@{8='DIMM';12='SODIMM'}[[int]$_.FormFactor]; tensione_mv=[int]$_.ConfiguredVoltage} })
$gpu=@(Get-CimInstance Win32_VideoController | ForEach-Object { $v=[math]::Round($_.AdapterRAM/1048576)
  @{nome="$($_.Name)"; vram_mb=$v; driver="$($_.DriverVersion)"; data_driver="$($_.DriverDate)"; risoluzione="$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution) @ $($_.CurrentRefreshRate) Hz"; processore="$($_.VideoProcessor)"; id="$($_.PNPDeviceID)"} })
$k='HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'
Get-ChildItem $k -ErrorAction SilentlyContinue | ForEach-Object { $p=Get-ItemProperty $_.PSPath; if ($p.'HardwareInformation.qwMemorySize') { foreach ($g in $gpu) { if ($p.DriverDesc -eq $g.nome) { $g.vram_mb=[math]::Round([double]$p.'HardwareInformation.qwMemorySize'/1048576) } } } }
$dis=@(); try { $dis=@(Get-PhysicalDisk | ForEach-Object { @{nome="$($_.FriendlyName)"; tipo="$($_.MediaType)"; bus="$($_.BusType)"; gb=[math]::Round($_.Size/1e9); firmware="$($_.FirmwareVersion)"; salute="$($_.HealthStatus)"; giri=[int]$_.SpindleSpeed} }) } catch {}
$slot=@(Get-CimInstance Win32_SystemSlot | ForEach-Object { @{nome="$($_.SlotDesignation)"; uso=[int]$_.CurrentUsage; tipo=[int]$_.ConnectorType} })
$porte=@(Get-CimInstance Win32_PortConnector | ForEach-Object { @{interna="$($_.InternalReferenceDesignator)"; esterna="$($_.ExternalReferenceDesignator)"; tipo=[int]$_.PortType} })
$rete=@(Get-CimInstance Win32_NetworkAdapter -Filter 'PhysicalAdapter=True' | ForEach-Object { @{nome="$($_.Name)"; tipo="$($_.AdapterType)"; velocita_mbps=[math]::Round($_.Speed/1000000)} })
$audio=@(Get-CimInstance Win32_SoundDevice | ForEach-Object { "$($_.Name)" })
$bat=$null; try { $s=Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData; $f=Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity; $cy=Get-CimInstance -Namespace root\wmi -ClassName BatteryCycleCount
  if ($s) { $bat=@{produttore="$($s.ManufactureName)"; nome="$($s.DeviceName)"; chimica="$($s.Chemistry)"; progetto_mwh=[int]$s.DesignedCapacity; piena_mwh=[int]$f.FullChargedCapacity; cicli=[int]$cy.CycleCount} } } catch {}
$r=@{
 cpu=@{nome="$($c.Name)".Trim(); produttore="$($c.Manufacturer)"; descrizione="$($c.Caption)"; core=$c.NumberOfCores; thread=$c.NumberOfLogicalProcessors; mhz_max=$c.MaxClockSpeed; mhz=$c.CurrentClockSpeed;
   socket="$($c.SocketDesignation)"; l2_kb=$c.L2CacheSize; l3_kb=$c.L3CacheSize; bit="$($c.AddressWidth)"; virtualizzazione=[bool]$c.VirtualizationFirmwareEnabled; id="$($c.ProcessorId)"; tensione=$c.CurrentVoltage}
 cache=$cache
 scheda=@{produttore="$($bb.Manufacturer)"; modello="$($bb.Product)"; versione="$($bb.Version)"; bios_produttore="$($bi.Manufacturer)"; bios="$($bi.SMBIOSBIOSVersion)"; bios_data="$($bi.ReleaseDate)"; sistema="$($cs.Manufacturer) $($cs.Model)"; telaio=@($en.ChassisTypes)[0]}
 memoria=@{slot=[int]$arr.MemoryDevices; max_gb=[math]::Round($arr.MaxCapacityEx/1048576); moduli=$mod}
 gpu=$gpu; dischi=$dis; slot=$slot; porte=$porte; rete=$rete; audio=$audio; batteria=$bat
}
$r | ConvertTo-Json -Depth 6 -Compress
"""


def dettagli_windows():
    out = powershell(PS_DETTAGLI, timeout=90).strip()
    try:
        d = json.loads(out[out.find("{"):]) if "{" in out else {}
    except ValueError:
        d = {}
    for k in ("cache", "gpu", "dischi", "slot", "porte", "rete", "audio"):
        d[k] = _lista(d.get(k))
    d.setdefault("memoria", {})
    d["memoria"]["moduli"] = _lista(d["memoria"].get("moduli"))
    for c in d["cache"]:   # Win32_CacheMemory: Level 3 = L1, 4 = L2, 5 = L3
        c["livello"] = {"L1": "L1", "L2": "L2", "L3": "L3"}.get(c.get("livello"), c.get("livello"))
    cpu = d.get("cpu") or {}
    if cpu and not d["cache"]:
        d["cache"] = [x for x in ({"livello": "L2", "kb": cpu.get("l2_kb")}, {"livello": "L3", "kb": cpu.get("l3_kb")}) if x["kb"]]
    TIPI_PORTA = {16: "USB", 18: "USB", 31: "Rete", 15: "Audio", 29: "Audio", 30: "SATA", 33: "SATA", 28: "Video"}
    for p in d["porte"]:
        p["descrizione"] = TIPI_PORTA.get(_num(p.get("tipo")), "")
    return d


def dettagli_mac():
    d = {"cpu": {}, "cache": [], "scheda": {}, "memoria": {"moduli": []}, "gpu": [], "dischi": [], "rete": [], "audio": []}
    sc = lambda k: esegui(["sysctl", "-n", k]).strip()
    d["cpu"] = {"nome": sc("machdep.cpu.brand_string"), "core": _num(sc("hw.physicalcpu")), "thread": _num(sc("hw.logicalcpu")),
                "core_prestazioni": _num(sc("hw.perflevel0.physicalcpu")), "core_efficienza": _num(sc("hw.perflevel1.physicalcpu")),
                "mhz_max": _num(sc("hw.cpufrequency_max")) // 1000000, "bit": "64",
                "istruzioni": [x.upper() for x in sc("machdep.cpu.features").split() + sc("machdep.cpu.leaf7_features").split() if x.lower() in ("sse4.2", "avx1.0", "avx2", "aes")]}
    for nome, k in (("L1 dati", "hw.l1dcachesize"), ("L1 istruzioni", "hw.l1icachesize"), ("L2", "hw.l2cachesize"), ("L3", "hw.l3cachesize")):
        v = _num(sc(k))
        if v:
            d["cache"].append({"livello": nome, "kb": v // 1024})
    try:
        sp = json.loads(esegui(["system_profiler", "-json", "SPHardwareDataType", "SPMemoryDataType", "SPDisplaysDataType", "SPStorageDataType", "SPAudioDataType"], timeout=60) or "{}")
    except ValueError:
        sp = {}
    hw = (sp.get("SPHardwareDataType") or [{}])[0]
    d["scheda"] = {"produttore": "Apple", "modello": hw.get("machine_model", ""), "sistema": hw.get("machine_name", ""), "bios": hw.get("boot_rom_version", "")}
    for m in sp.get("SPMemoryDataType") or []:
        for b in m.get("_items") or [m]:
            d["memoria"]["moduli"].append({"posizione": b.get("_name", ""), "gb": _num(str(b.get("dimm_size") or b.get("SPMemoryDataType", "")).split()[0] if (b.get("dimm_size") or b.get("SPMemoryDataType")) else 0),
                                           "tipo": b.get("dimm_type", ""), "mhz": _num(str(b.get("dimm_speed", "")).split()[0] if b.get("dimm_speed") else 0),
                                           "produttore": b.get("dimm_manufacturer", "")})
    d["memoria"]["nota"] = "Sui Mac con chip Apple la memoria è unificata e saldata insieme al processore."
    for g in sp.get("SPDisplaysDataType") or []:
        d["gpu"].append({"nome": g.get("sppci_model", ""), "core": g.get("sppci_cores", ""), "vram_mb": _num(str(g.get("spdisplays_vram", "0")).split()[0]) * 1024 if "GB" in str(g.get("spdisplays_vram", "")) else 0})
    for v in sp.get("SPStorageDataType") or []:
        dev = v.get("physical_drive") or {}
        d["dischi"].append({"nome": dev.get("device_name", v.get("_name", "")), "tipo": dev.get("medium_type", ""), "bus": dev.get("protocol", ""),
                            "gb": round(_num(v.get("size_in_bytes")) / 1e9), "salute": dev.get("smart_status", "")})
    d["audio"] = [a.get("_name", "") for x in sp.get("SPAudioDataType") or [] for a in x.get("_items") or []]
    return d


def dettagli(forza=False):
    if os.environ.get("CD_HARDWARE_PROVA") == "1":
        return _prova_dettagli()
    if not forza and _DET["d"] and time.time() - _DET["t"] < 600:
        return _DET["d"]
    t0 = time.time()
    try:
        d = dettagli_windows() if cd_sistema.WINDOWS else (dettagli_mac() if cd_sistema.MAC else dettagli_linux())
    except Exception as e:
        d = {"errore": str(e)}
    completo = os.path.join(os.environ.get("CD_DATI_HW", ""), "hardware-completo.json")
    if os.environ.get("CD_DATI_HW") and os.path.isfile(completo):
        try:
            with open(completo, "r", encoding="utf-8") as f:
                extra = json.load(f)
            for k in ("slot", "porte"):
                if extra.get(k) and not d.get(k):
                    d[k] = extra[k]
            if extra.get("moduli") and not (d.get("memoria") or {}).get("moduli"):
                d.setdefault("memoria", {}).update({"moduli": extra["moduli"], "slot": extra.get("slot_memoria", 0), "nota": ""})
        except (OSError, ValueError):
            pass
    d["sistema"] = FAM
    d["durata_s"] = round(time.time() - t0, 1)
    _DET.update(t=time.time(), d=d)
    return d


# ==============================================================================
#  Sensori
# ==============================================================================
_PREC = {"stat": None, "disco": None, "rete": None, "t": 0}


def _cpu_linux():
    righe = [r.split() for r in leggi("/proc/stat").splitlines() if r.startswith("cpu")]
    att = dict((r[0], [int(x) for x in r[1:]]) for r in righe)
    uso = {}
    if _PREC["stat"]:
        for k, v in att.items():
            p = _PREC["stat"].get(k)
            if not p:
                continue
            tot = sum(v) - sum(p)
            idle = (v[3] + v[4]) - (p[3] + p[4])
            uso[k] = round(100.0 * (tot - idle) / tot, 1) if tot > 0 else 0
    _PREC["stat"] = att
    return uso


def _hwmon_linux():
    """Tutti i sensori esposti dal kernel: temperature, ventole, tensioni, potenze, con il nome del chip."""
    out = []
    for h in sorted(glob.glob("/sys/class/hwmon/hwmon*")):
        chip = leggi(h + "/name").strip() or os.path.basename(h)
        disp = os.path.basename(os.path.realpath(h + "/device")) if os.path.exists(h + "/device") else ""
        for f in sorted(glob.glob(h + "/*_input")):
            base = f[:-6]
            tipo = re.match(r".*/(temp|fan|in|power|curr)\d+$", base)
            if not tipo:
                continue
            v = _num(leggi(f).strip(), None) if leggi(f).strip().lstrip("-").isdigit() else None
            if v is None:
                continue
            t = tipo.group(1)
            et = leggi(base + "_label").strip() or os.path.basename(base)
            val, un = {"temp": (v / 1000.0, "°C"), "fan": (v, "giri/min"), "in": (v / 1000.0, "V"), "power": (v / 1e6, "W"), "curr": (v / 1000.0, "A")}[t]
            s = {"chip": chip, "dispositivo": disp, "nome": et, "tipo": t, "valore": round(val, 2), "unita": un}
            crit = leggi(base + "_crit").strip()
            mx = leggi(base + "_max").strip()
            if t == "temp" and crit.lstrip("-").isdigit():
                s["critico"] = _num(crit) / 1000.0
            if t == "temp" and mx.lstrip("-").isdigit():
                s["massimo"] = _num(mx) / 1000.0
            out.append(s)
    for z in sorted(glob.glob("/sys/class/thermal/thermal_zone*")):
        v = leggi(z + "/temp").strip()
        if v.lstrip("-").isdigit():
            out.append({"chip": "acpi", "nome": leggi(z + "/type").strip() or os.path.basename(z), "tipo": "temp", "valore": round(_num(v) / 1000.0, 1), "unita": "°C"})
    return out


def sensori_linux():
    t = time.time()
    dt = max(0.2, t - _PREC["t"]) if _PREC["t"] else 1
    uso = _cpu_linux()
    freq = []
    for c in sorted(glob.glob("/sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_cur_freq"), key=lambda x: int(re.search(r"cpu(\d+)", x).group(1))):
        freq.append(_num(leggi(c).strip()) // 1000)
    if not freq:
        freq = [_num(m) for m in re.findall(r"cpu MHz\s*:\s*([\d.]+)", leggi("/proc/cpuinfo"))]
    mem = {}
    for r in leggi("/proc/meminfo").splitlines():
        p = r.split()
        if len(p) >= 2:
            mem[p[0].rstrip(":")] = _num(p[1])
    # dischi: attività
    dischi = {}
    for r in leggi("/proc/diskstats").splitlines():
        p = r.split()
        if len(p) > 13 and re.match(r"^(sd[a-z]+|nvme\d+n\d+|vd[a-z]+|mmcblk\d+|hd[a-z]+)$", p[2]):
            dischi[p[2]] = (int(p[5]), int(p[9]), int(p[12]))
    disco = []
    if _PREC["disco"]:
        for k, v in dischi.items():
            p = _PREC["disco"].get(k)
            if p:
                disco.append({"nome": k, "lettura_mbs": round((v[0] - p[0]) * 512 / dt / 1e6, 2), "scrittura_mbs": round((v[1] - p[1]) * 512 / dt / 1e6, 2),
                              "attivita": min(100, round((v[2] - p[2]) / (dt * 10.0), 1))})
    _PREC["disco"] = dischi
    rete = {}
    for r in leggi("/proc/net/dev").splitlines()[2:]:
        n, _, rest = r.partition(":")
        n = n.strip()
        p = rest.split()
        if n != "lo" and len(p) > 8:
            rete[n] = (int(p[0]), int(p[8]))
    net = []
    if _PREC["rete"]:
        for k, v in rete.items():
            p = _PREC["rete"].get(k)
            if p:
                net.append({"nome": k, "ricevuti_kbs": round((v[0] - p[0]) / dt / 1024, 1), "inviati_kbs": round((v[1] - p[1]) / dt / 1024, 1)})
    _PREC["rete"] = rete
    _PREC["t"] = t
    gpu = []
    for card in sorted(glob.glob("/sys/class/drm/card[0-9]/device")):
        b = leggi(card + "/gpu_busy_percent").strip()
        if b.isdigit():
            gpu.append({"nome": "GPU " + os.path.basename(os.path.dirname(card)), "uso": int(b),
                        "vram_usata_mb": _num(leggi(card + "/mem_info_vram_used").strip()) // 1048576})
    if shutil.which("nvidia-smi"):
        for r in esegui(["nvidia-smi", "--query-gpu=name,temperature.gpu,utilization.gpu,fan.speed,power.draw,clocks.gr,memory.used",
                         "--format=csv,noheader,nounits"], timeout=5).splitlines():
            p = [x.strip() for x in r.split(",")]
            if len(p) >= 7:
                gpu.append({"nome": p[0], "temp": _num(p[1], None), "uso": _num(p[2], None), "ventola": _num(p[3], None), "watt": _num(p[4], None),
                            "mhz": _num(p[5], None), "vram_usata_mb": _num(p[6], None)})
    bat = []
    for b in sorted(glob.glob("/sys/class/power_supply/BAT*")):
        v = _num(leggi(b + "/voltage_now").strip())
        pw = _num(leggi(b + "/power_now").strip()) or (_num(leggi(b + "/current_now").strip()) * v // 1000000)
        bat.append({"carica": _num(leggi(b + "/capacity").strip()), "stato": leggi(b + "/status").strip(), "volt": round(v / 1e6, 2), "watt": round(pw / 1e6, 1)})
    return {"cpu": {"uso": uso.get("cpu", 0), "core": [uso.get("cpu%d" % i, 0) for i in range(len(freq))] if uso else [], "mhz": freq,
                    "carico": leggi("/proc/loadavg").split()[:3]},
            "memoria": {"totale_mb": mem.get("MemTotal", 0) // 1024, "libera_mb": mem.get("MemAvailable", 0) // 1024,
                        "swap_mb": (mem.get("SwapTotal", 0) - mem.get("SwapFree", 0)) // 1024},
            "sensori": _hwmon_linux(), "dischi": disco, "rete": net, "gpu": gpu, "batteria": bat}


# --- sonda per Windows e macOS: un processo che stampa una riga JSON ogni 2 secondi ---------------
PS_SONDA = r"""
$ErrorActionPreference='SilentlyContinue'
try { [Console]::OutputEncoding=[Text.Encoding]::UTF8 } catch {}
$c=@(Get-CimInstance Win32_Processor)[0]; $max=[double]$c.MaxClockSpeed
$nv=(Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue).Source
if (-not $nv -and (Test-Path "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe")) { $nv="$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe" }
while ($true) {
 $core=@(Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Sort-Object { if ($_.Name -eq '_Total') { 999 } else { [int]$_.Name } } | ForEach-Object { [int]$_.PercentProcessorTime })
 $pi=@(Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'")[0]
 $mhz=0; if ($pi -and $pi.PercentProcessorPerformance) { $mhz=[int]($max*[double]$pi.PercentProcessorPerformance/100) } else { $mhz=[int](@(Get-CimInstance Win32_Processor)[0].CurrentClockSpeed) }
 $sens=@()
 foreach ($ns in @('root\LibreHardwareMonitor','root\OpenHardwareMonitor')) {
   $lh=@(Get-CimInstance -Namespace $ns -ClassName Sensor -ErrorAction SilentlyContinue)
   if ($lh.Count -gt 0) { $sens += @($lh | ForEach-Object { @{chip="$($_.Parent)"; nome="$($_.Name)"; tipo="$($_.SensorType)"; valore=[math]::Round([double]$_.Value,2); fonte=$ns} }); break }
 }
 $tz=@(Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation | ForEach-Object { @{chip='acpi'; nome="$($_.Name)"; tipo='Temperature'; valore=[math]::Round([double]$_.HighPrecisionTemperature/10-273.15,1)} })
 $os=Get-CimInstance Win32_OperatingSystem
 $dk=@(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Where-Object { $_.Name -ne '_Total' } | ForEach-Object { @{nome="$($_.Name)"; attivita=[math]::Min(100,[int]$_.PercentDiskTime); lettura_mbs=[math]::Round($_.DiskReadBytesPersec/1e6,2); scrittura_mbs=[math]::Round($_.DiskWriteBytesPersec/1e6,2)} })
 $nt=@(Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | ForEach-Object { @{nome="$($_.Name)"; ricevuti_kbs=[math]::Round($_.BytesReceivedPersec/1024,1); inviati_kbs=[math]::Round($_.BytesSentPersec/1024,1)} })
 $g3=@(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Where-Object { $_.Name -match 'engtype_3D' } | Measure-Object -Property UtilizationPercentage -Sum).Sum
 $gpu=@(); if ($g3 -ne $null) { $gpu += @{nome='GPU (3D)'; uso=[math]::Min(100,[int]$g3)} }
 if ($nv) { & $nv '--query-gpu=name,temperature.gpu,utilization.gpu,fan.speed,power.draw,clocks.gr,memory.used' '--format=csv,noheader,nounits' 2>$null | ForEach-Object { $p=$_ -split ',\s*'; if ($p.Count -ge 7) { $gpu += @{nome=$p[0]; temp=[double]$p[1]; uso=[double]$p[2]; ventola=$p[3]; watt=$p[4]; mhz=$p[5]; vram_usata_mb=$p[6]} } } }
 $bt=@(Get-CimInstance Win32_Battery | ForEach-Object { @{carica=[int]$_.EstimatedChargeRemaining; stato=[int]$_.BatteryStatus} })
 $bs=$null; try { $bs=Get-CimInstance -Namespace root\wmi -ClassName BatteryStatus -ErrorAction Stop | Select-Object -First 1 } catch {}
 if ($bs -and $bt.Count -gt 0) { $bt[0].volt=[math]::Round($bs.Voltage/1000,2); $bt[0].watt=[math]::Round(([double]$bs.ChargeRate - [double]$bs.DischargeRate)/1000,1) }
 $o=@{cpu=@{uso=$core[-1]; core=@($core[0..($core.Count-2)]); mhz=@($mhz)}; memoria=@{totale_mb=[math]::Round($os.TotalVisibleMemorySize/1024); libera_mb=[math]::Round($os.FreePhysicalMemory/1024)};
     sensori=@($sens + $tz); dischi=$dk; rete=$nt; gpu=$gpu; batteria=$bt; t=[int][double]::Parse((Get-Date -UFormat %s))}
 Write-Output ($o | ConvertTo-Json -Depth 5 -Compress)
 Start-Sleep -Milliseconds 1500
}
"""

SH_SONDA_MAC = r"""
while true; do
  cpu=$(ps -A -o %cpu= | awk '{s+=$1} END {print s}')
  n=$(sysctl -n hw.logicalcpu)
  pag=$(sysctl -n hw.pagesize); tot=$(sysctl -n hw.memsize)
  lib=$(vm_stat | awk -v p="$pag" '/Pages free|Pages inactive|Pages speculative/ {gsub("\\.","",$NF); s+=$NF} END {print int(s*p/1048576)}')
  bat=$(ioreg -rn AppleSmartBattery 2>/dev/null | awk -F'= ' '/"CurrentCapacity" =|"MaxCapacity" =|"Temperature" =|"Voltage" =|"InstantAmperage" =|"IsCharging" =/ {gsub(/[" ]/,"",$1); printf "%s=%s;", $1, $2}')
  therm=$(pmset -g therm 2>/dev/null | awk -F'= ' '/CPU_Speed_Limit/ {print $2}')
  echo "{\"cpu\":{\"uso\":$(awk -v c="$cpu" -v n="$n" 'BEGIN{printf "%.1f", c/n}')},\"memoria\":{\"totale_mb\":$((tot/1048576)),\"libera_mb\":${lib:-0}},\"mac_batteria\":\"$bat\",\"limite_cpu\":\"${therm:-100}\"}"
  sleep 2
done
"""


class Sonda(object):
    """Processo di misura sempre acceso finché qualcuno guarda la pagina dei sensori."""

    def __init__(self):
        self.proc = None
        self.ultima = None
        self.richiesta = 0
        self.lock = threading.Lock()

    def _leggi(self):
        for riga in iter(self.proc.stdout.readline, b""):
            riga = riga.decode("utf-8", "replace").strip()
            if riga.startswith("{"):
                try:
                    self.ultima = json.loads(riga)
                    self.ultima["_t"] = time.time()
                except ValueError:
                    pass
            if time.time() - self.richiesta > 60:
                break
        self.ferma()

    def avvia(self):
        if cd_sistema.WINDOWS:
            testa = "[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ProgressPreference='SilentlyContinue';"
            cmd = ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", testa + PS_SONDA]
        else:
            cmd = ["/bin/bash", "-c", SH_SONDA_MAC]
        self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, creationflags=cd_sistema.NO_WINDOW)
        threading.Thread(target=self._leggi, daemon=True).start()

    def ferma(self):
        with self.lock:
            if self.proc and self.proc.poll() is None:
                try:
                    self.proc.terminate()
                except OSError:
                    pass
            self.proc = None

    def leggi(self):
        with self.lock:
            self.richiesta = time.time()
            if not self.proc or self.proc.poll() is not None:
                self.avvia()
        fine = time.time() + (12 if self.ultima is None else 0)
        while self.ultima is None and time.time() < fine:
            time.sleep(0.2)
        return dict(self.ultima or {"in_avvio": True})


SONDA = Sonda()


def _mac_batteria(s):
    d = dict(x.split("=", 1) for x in str(s or "").split(";") if "=" in x)
    if not d:
        return []
    t = _num(d.get("Temperature"))
    amp = _num(d.get("InstantAmperage"))
    if amp > 2 ** 63:
        amp -= 2 ** 64
    v = _num(d.get("Voltage"))
    return [{"carica": round(100.0 * _num(d.get("CurrentCapacity")) / max(1, _num(d.get("MaxCapacity")))) if _num(d.get("MaxCapacity")) > 100 else _num(d.get("CurrentCapacity")),
             "stato": "in carica" if d.get("IsCharging") == "Yes" else "a batteria", "volt": round(v / 1000.0, 2), "watt": round(v * amp / 1e6, 1),
             "temp": round(t / 100.0, 1) if t else None}]


# --- dati di prova (solo con CD_HARDWARE_PROVA=1: collaudo automatico e foto del vademecum) -------------------
def _prova_dettagli():
    return {"sistema": "windows", "prova": True,
            "cpu": {"nome": "12th Gen Intel(R) Core(TM) i5-1235U", "produttore": "GenuineIntel", "core": 10, "thread": 12, "mhz_max": 4400, "socket": "BGA1744",
                    "bit": "64", "virtualizzazione": True, "istruzioni": ["SSE4_2", "AVX", "AVX2", "AES", "FMA", "SHA_NI", "VMX"]},
            "cache": [{"livello": "L1", "kb": 928}, {"livello": "L2", "kb": 6656}, {"livello": "L3", "kb": 12288}],
            "scheda": {"produttore": "LENOVO", "modello": "LNVNB161216", "versione": "SDK0T76530 WIN", "bios_produttore": "LENOVO", "bios": "J6CN45WW",
                       "bios_data": "2024-03-12", "sistema": "LENOVO IdeaPad 5 15IAL7", "telaio": 10},
            "memoria": {"slot": 2, "max_gb": 32, "moduli": [{"posizione": "DIMM 0", "banco": "BANK 0", "gb": 8, "tipo": "DDR4", "mhz": 3200, "produttore": "Samsung",
                                                             "codice": "M471A1K43EB1-CWE", "formato": "SODIMM", "tensione_mv": 1200},
                                                            {"posizione": "Onboard", "banco": "BANK 1", "gb": 8, "tipo": "DDR4", "mhz": 3200, "produttore": "Micron",
                                                             "codice": "MT40A1G16TB-062E", "formato": "saldata", "tensione_mv": 1200}]},
            "gpu": [{"nome": "Intel(R) Iris(R) Xe Graphics", "vram_mb": 128, "driver": "31.0.101.5186", "risoluzione": "1920x1080 @ 60 Hz"}],
            "dischi": [{"nome": "SAMSUNG MZALQ512HBLU-00BL2", "tipo": "SSD", "bus": "NVMe", "gb": 512, "firmware": "FXV7300Q", "salute": "Healthy"}],
            "slot": [{"nome": "M.2 2280 SSD", "uso": 4}, {"nome": "M.2 2230 WLAN", "uso": 4}],
            "porte": [{"esterna": "USB-C 1", "descrizione": "USB"}, {"esterna": "USB-A 1", "descrizione": "USB"}, {"esterna": "USB-A 2", "descrizione": "USB"},
                      {"esterna": "HDMI", "descrizione": "Video"}, {"esterna": "Jack audio", "descrizione": "Audio"}],
            "rete": [{"nome": "Intel(R) Wi-Fi 6 AX201 160MHz", "tipo": "Wi-Fi", "velocita_mbps": 1200}],
            "audio": ["Realtek(R) Audio"], "batteria": {"produttore": "SMP", "nome": "L19M4PF0", "chimica": "LiP", "progetto_mwh": 57000, "piena_mwh": 39100, "cicli": 612}}


def _prova_sensori():
    import math
    import random
    t = time.time()
    onda = (math.sin(t / 7) + 1) / 2
    core = [round(min(100, max(1, 18 + 60 * onda * random.random())), 1) for _ in range(12)]
    return {"prova": True, "cpu": {"uso": round(sum(core) / 12, 1), "core": core, "mhz": [int(1300 + 2900 * onda * random.random()) for _ in range(12)]},
            "memoria": {"totale_mb": 16000, "libera_mb": int(5200 - 1800 * onda)},
            "sensori": [{"chip": "CPU Package", "nome": "CPU Package", "tipo": "temp", "valore": round(71 + 22 * onda, 1), "unita": "°C", "critico": 100},
                        {"chip": "CPU", "nome": "Core #1", "tipo": "temp", "valore": round(68 + 22 * onda, 1), "unita": "°C"},
                        {"chip": "CPU", "nome": "Core #2", "tipo": "temp", "valore": round(70 + 21 * onda, 1), "unita": "°C"},
                        {"chip": "nvme", "nome": "SSD NVMe", "tipo": "temp", "valore": round(44 + 8 * onda, 1), "unita": "°C"},
                        {"chip": "acpi", "nome": "Scheda madre", "tipo": "temp", "valore": round(47 + 6 * onda, 1), "unita": "°C"},
                        {"chip": "ec", "nome": "Ventola CPU", "tipo": "fan", "valore": int(2600 + 2400 * onda), "unita": "giri/min"},
                        {"chip": "CPU", "nome": "CPU Core", "tipo": "in", "valore": round(0.75 + 0.35 * onda, 3), "unita": "V"},
                        {"chip": "CPU", "nome": "CPU Package", "tipo": "power", "valore": round(6 + 19 * onda, 1), "unita": "W"}],
            "dischi": [{"nome": "0 C:", "attivita": round(30 * onda, 1), "lettura_mbs": round(80 * onda, 1), "scrittura_mbs": round(12 * onda, 1)}],
            "rete": [{"nome": "Wi-Fi", "ricevuti_kbs": round(900 * onda, 1), "inviati_kbs": round(60 * onda, 1)}],
            "gpu": [{"nome": "Intel Iris Xe", "uso": int(40 * onda)}], "batteria": [{"carica": 76, "stato": "a batteria", "volt": 11.9, "watt": -round(9 + 14 * onda, 1)}]}


def sensori():
    if os.environ.get("CD_HARDWARE_PROVA") == "1":
        s = _prova_sensori()
        s["quando"] = time.time()
        return s
    if cd_sistema.LINUX:
        s = sensori_linux()
    else:
        s = SONDA.leggi()
        if cd_sistema.MAC and not s.get("in_avvio"):
            s["batteria"] = _mac_batteria(s.pop("mac_batteria", ""))
            if s.get("batteria") and s["batteria"][0].get("temp"):
                s["sensori"] = [{"chip": "batteria", "nome": "Batteria", "tipo": "temp", "valore": s["batteria"][0]["temp"], "unita": "°C"}]
            s["nota"] = "Su macOS le temperature del processore si leggono solo da amministratore (powermetrics)."
        if cd_sistema.WINDOWS and not s.get("in_avvio"):
            norm = []
            for x in _lista(s.get("sensori")):
                t = str(x.get("tipo", "")).lower()
                tipo = {"temperature": "temp", "fan": "fan", "voltage": "in", "power": "power", "clock": "clock", "load": "load", "data": "data",
                        "smalldata": "data", "throughput": "data", "level": "level", "control": "control", "current": "curr"}.get(t, t)
                un = {"temp": "°C", "fan": "giri/min", "in": "V", "power": "W", "clock": "MHz", "load": "%", "data": "GB", "level": "%", "control": "%", "curr": "A"}.get(tipo, "")
                norm.append({"chip": x.get("chip", ""), "nome": x.get("nome", ""), "tipo": tipo, "valore": x.get("valore"), "unita": un, "fonte": x.get("fonte", "")})
            s["sensori"] = norm
            if not any(x.get("fonte") for x in norm):
                s["nota"] = ("Windows mostra le temperature dei core solo a programmi con un driver dedicato: per vederle tutte avviate "
                             "LibreHardwareMonitor (si installa da Programmi consigliati) come amministratore e lasciatelo aperto.")
            for k in ("dischi", "rete", "gpu", "batteria"):
                s[k] = _lista(s.get(k))
            s["rete"] = [r for r in s["rete"] if (r.get("ricevuti_kbs") or 0) + (r.get("inviati_kbs") or 0) >= 0][:6]
    s["quando"] = time.time()
    return s


if __name__ == "__main__":
    print(json.dumps(dettagli(True), indent=1, ensure_ascii=False)[:3000])
    sensori()
    time.sleep(1)
    print(json.dumps(sensori(), indent=1, ensure_ascii=False)[:2000])
