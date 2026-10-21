# -*- coding: utf-8 -*-
"""
Consulente Digitale - Azioni automatiche (lista bianca) e lavori in corso

Regola d'oro della sicurezza: il browser NON puo' mai far eseguire un comando qualsiasi.
Puo' solo chiedere di avviare una AZIONE di questo elenco, scritta in un file di
`src/azioni/<sistema>/` che si puo' leggere, stampare e salvare dalla pagina «Ottimizza».
L'unico parametro ammesso e' controllato con una lista bianca (programma, modello di IA, fonti).

Ogni azione gira come «lavoro»: righe di registro in diretta, stato, codice di uscita e un
risultato strutturato. Gli script scrivono righe speciali:
    @@VOCE|fonte|nome|versione attuale|versione nuova|id      -> elenco (aggiornamenti, driver, ...)
    @@INFO|chiave|valore                                    -> risultato["info"][chiave]
    @@PASSO|n|totale|testo                                  -> avanzamento
Le azioni che chiedono i permessi di amministratore usano gli strumenti del sistema:
    Windows: Controllo account utente (UAC)  -  Linux: pkexec (polkit)  -  macOS: richiesta della password di sistema

Solo libreria standard, compatibile Python 3.7+.
Ideato e sviluppato da Danilo D'Auria - Licenza MIT
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid

import cd_sistema

FAM = cd_sistema.famiglia()
ESTENSIONE = {"windows": ".ps1", "linux": ".sh", "mac": ".sh"}
MAX_RIGHE = 4000

# ------------------------------------------------------------------------------
#  Catalogo delle azioni. "s" = sistemi: file dello script e se servono i permessi di amministratore.
#  finestra=True: l'azione apre una finestra sua (programmi interattivi come WinUtil), non si segue il registro.
# ------------------------------------------------------------------------------
def _s(file, admin=False, finestra=False):
    return {"file": file, "admin": admin, "finestra": finestra}


AZIONI = [
    # --- Aggiornamenti ---------------------------------------------------------
    {"id": "aggiornamenti_cerca", "gruppo": "aggiornamenti", "icona": "🔎", "rischio": "nessuno",
     "titolo": "Cerca gli aggiornamenti", "descrizione": "Controlla sistema, programmi, driver e firmware. Non cambia nulla.",
     "s": {"windows": _s("aggiornamenti-cerca.ps1"), "linux": _s("aggiornamenti-cerca.sh"), "mac": _s("aggiornamenti-cerca.sh")}},
    {"id": "aggiornamenti_installa", "gruppo": "aggiornamenti", "icona": "⬇️", "rischio": "basso", "parametro": "fonti", "riavvio": True,
     "titolo": "Scarica e installa gli aggiornamenti", "descrizione": "Scarica dalle fonti ufficiali del sistema e installa. Può chiedere un riavvio.",
     "s": {"windows": _s("aggiornamenti-installa.ps1", True), "linux": _s("aggiornamenti-installa.sh", True), "mac": _s("aggiornamenti-installa.sh", True)}},
    {"id": "driver_cerca", "gruppo": "driver", "icona": "🧩", "rischio": "nessuno",
     "titolo": "Controlla driver e periferiche", "descrizione": "Dispositivi con problemi, driver mancanti o da aggiornare, firmware.",
     "s": {"windows": _s("driver-cerca.ps1"), "linux": _s("driver-cerca.sh"), "mac": _s("driver-cerca.sh")}},
    {"id": "driver_installa", "gruppo": "driver", "icona": "🛠️", "rischio": "medio", "riavvio": True,
     "titolo": "Installa driver e firmware consigliati", "descrizione": "Solo da Windows Update, dai repository della distribuzione (ubuntu-drivers, fwupd/LVFS) o da Apple.",
     "s": {"windows": _s("driver-installa.ps1", True), "linux": _s("driver-installa.sh", True), "mac": _s("aggiornamenti-installa.sh", True)}},
    # --- Ottimizzazione ----------------------------------------------------------
    {"id": "punto_ripristino", "gruppo": "ottimizza", "icona": "🛟", "rischio": "nessuno",
     "titolo": "Crea un punto di ripristino", "descrizione": "Una «fotografia» del sistema per tornare indietro se qualcosa va storto.",
     "s": {"windows": _s("punto-ripristino.ps1", True), "linux": _s("punto-ripristino.sh", True), "mac": _s("punto-ripristino.sh", True)}},
    {"id": "pulizia", "gruppo": "ottimizza", "icona": "🧹", "rischio": "basso",
     "titolo": "Pulizia sicura", "descrizione": "File temporanei, cache e pacchetti inutili. Non tocca documenti, foto e password.",
     "s": {"windows": _s("pulizia.ps1", True), "linux": _s("pulizia.sh", True), "mac": _s("pulizia.sh")}},
    {"id": "ottimizza", "gruppo": "ottimizza", "icona": "🚀", "rischio": "basso", "riavvio": True,
     "titolo": "Ottimizzazione completa consigliata", "descrizione": "Punto di ripristino, pulizia, disco (TRIM), memoria, avvio più leggero, impostazioni di risparmio.",
     "s": {"windows": _s("ottimizza.ps1", True), "linux": _s("ottimizza.sh", True), "mac": _s("ottimizza.sh", True)}},
    {"id": "privacy", "gruppo": "ottimizza", "icona": "🕶️", "rischio": "basso",
     "titolo": "Più privacy, meno pubblicità", "descrizione": "Spegne ID pubblicitario, suggerimenti e raccolta dati non necessaria. Reversibile.",
     "s": {"windows": _s("privacy.ps1", True), "linux": _s("privacy.sh"), "mac": _s("privacy.sh")}},
    {"id": "pc_vecchio", "gruppo": "ottimizza", "icona": "🐢", "rischio": "medio", "riavvio": True,
     "titolo": "Modalità PC vecchio", "descrizione": "Effetti grafici ridotti, memoria compressa, meno programmi all'avvio: per PC con poca RAM o disco meccanico.",
     "s": {"windows": _s("pc-vecchio.ps1", True), "linux": _s("pc-vecchio.sh", True), "mac": _s("pc-vecchio.sh")}},
    # --- Riparazione -----------------------------------------------------------
    {"id": "ripara", "gruppo": "ripara", "icona": "🩺", "rischio": "basso", "riavvio": True,
     "titolo": "Ripara i file di sistema", "descrizione": "Controlla e ripara il sistema (DISM e SFC su Windows, pacchetti su Linux, permessi e disco su Mac).",
     "s": {"windows": _s("ripara.ps1", True), "linux": _s("ripara.sh", True), "mac": _s("ripara.sh", True)}},
    {"id": "rete_ripara", "gruppo": "ripara", "icona": "📶", "rischio": "basso", "riavvio": True,
     "titolo": "Ripara la connessione a Internet", "descrizione": "Svuota la cache DNS e reimposta la rete. Le reti Wi-Fi salvate restano.",
     "s": {"windows": _s("rete-ripara.ps1", True), "linux": _s("rete-ripara.sh", True), "mac": _s("rete-ripara.sh", True)}},
    {"id": "disco_salute", "gruppo": "ripara", "icona": "💽", "rischio": "nessuno",
     "titolo": "Salute del disco", "descrizione": "Legge lo stato S.M.A.R.T. e lo spazio libero: avvisa prima che il disco si rompa.",
     "s": {"windows": _s("disco-salute.ps1", True), "linux": _s("disco-salute.sh", True), "mac": _s("disco-salute.sh")}},
    {"id": "batteria", "gruppo": "ripara", "icona": "🔋", "rischio": "nessuno",
     "titolo": "Rapporto della batteria", "descrizione": "Capacità reale rispetto a quella di fabbrica e cicli di carica.",
     "s": {"windows": _s("batteria.ps1"), "linux": _s("batteria.sh"), "mac": _s("batteria.sh")}},
    {"id": "sicurezza_controllo", "gruppo": "ripara", "icona": "🛡️", "rischio": "nessuno",
     "titolo": "Controllo sicurezza", "descrizione": "Antivirus, firewall, cifratura del disco, aggiornamenti automatici, account.",
     "s": {"windows": _s("sicurezza.ps1"), "linux": _s("sicurezza.sh"), "mac": _s("sicurezza.sh")}},
    {"id": "ora_sincronizza", "gruppo": "ripara", "icona": "🕰️", "rischio": "nessuno",
     "titolo": "Rimetti l'orologio all'ora esatta", "descrizione": "Sincronizza l'orologio del computer con i server dell'ora ufficiale (INRiM e del sistema).",
     "s": {"windows": _s("ora-sincronizza.ps1", True), "linux": _s("ora-sincronizza.sh", True), "mac": _s("ora-sincronizza.sh", True)}},
    {"id": "hardware_completo", "gruppo": "hardware", "icona": "🧬", "rischio": "nessuno",
     "titolo": "Lettura completa della scheda madre", "descrizione": "Banchi di memoria, slot di espansione e porte letti dalle tabelle del BIOS (dmidecode). Solo lettura.",
     "s": {"linux": _s("hardware-completo.sh", True)}},
    {"id": "sensori_avanzati", "gruppo": "hardware", "icona": "🌡️", "rischio": "basso",
     "titolo": "Sensori avanzati", "descrizione": "Temperature dei core, ventole e consumi: su Windows con LibreHardwareMonitor (libero), sul Mac con powermetrics di Apple.",
     "s": {"windows": _s("sensori-avanzati.ps1", True), "mac": _s("sensori-avanzati.sh", True)}},
    # --- Strumenti degli esperti -----------------------------------------------
    {"id": "winutil", "gruppo": "esperti", "icona": "🧰", "rischio": "medio",
     "titolo": "Chris Titus WinUtil", "descrizione": "Lo strumento di christitus.com: installa programmi, rimuove il superfluo, ripara Windows Update. Si apre in una finestra sua.",
     "s": {"windows": _s("winutil.ps1", True, True)}},
    {"id": "linutil", "gruppo": "esperti", "icona": "🧰", "rischio": "medio",
     "titolo": "Chris Titus LinUtil", "descrizione": "La versione per Linux dello strumento di christitus.com, nel terminale.",
     "s": {"linux": _s("linutil.sh", False, True)}},
    {"id": "homebrew", "gruppo": "esperti", "icona": "🍺", "rischio": "basso",
     "titolo": "Installa Homebrew", "descrizione": "Il gestore di programmi più usato sul Mac (brew.sh): serve per installare i programmi consigliati con un clic.",
     "s": {"mac": _s("homebrew.sh", False, True)}},
    {"id": "licenza_windows", "gruppo": "esperti", "icona": "📘", "rischio": "nessuno",
     "titolo": "Stato della licenza di Windows", "descrizione": "Mostra edizione e attivazione (slmgr). Solo lettura.",
     "s": {"windows": _s("licenza-windows.ps1")}},
    # --- Programmi e IA --------------------------------------------------------
    {"id": "programma_installa", "gruppo": "programmi", "icona": "📦", "rischio": "basso", "parametro": "programma",
     "titolo": "Installa un programma consigliato", "descrizione": "Da winget (Microsoft), Flathub/repository della distribuzione o Homebrew.",
     "s": {"windows": _s("programma-installa.ps1"), "linux": _s("programma-installa.sh", True), "mac": _s("programma-installa.sh")}},
    {"id": "ia_installa", "gruppo": "ia", "icona": "🧠", "rischio": "basso",
     "titolo": "Installa il motore di IA locale (Ollama)", "descrizione": "Da ollama.com o dal gestore del sistema. L'IA poi funziona senza Internet.",
     "s": {"windows": _s("ia-installa.ps1"), "linux": _s("ia-installa.sh", True), "mac": _s("ia-installa.sh")}},
    {"id": "ia_modello", "gruppo": "ia", "icona": "📥", "rischio": "nessuno", "parametro": "modello",
     "titolo": "Scarica il modello di IA", "descrizione": "Scarica il «cervello» adatto alla memoria di questo computer.",
     "s": {"windows": _s("ia-modello.ps1"), "linux": _s("ia-modello.sh"), "mac": _s("ia-modello.sh")}},
    # --- Salvadati: recupero dati (il disco da salvare si legge soltanto) -------------------------------------------
    {"id": "recupero_motore", "gruppo": "recupero", "icona": "🧰", "rischio": "nessuno",
     "titolo": "Installa il motore di recupero", "descrizione": "TestDisk e PhotoRec (CGSecurity, software libero GPL) dalle fonti ufficiali.",
     "s": {"windows": _s("recupero-motore.ps1", True), "linux": _s("recupero-motore.sh", True), "mac": _s("recupero-motore.sh")}},
    {"id": "recupero_avvia", "gruppo": "recupero", "icona": "🛟", "rischio": "nessuno", "parametro": "piano",
     "titolo": "Cerca e recupera i file", "descrizione": "Legge l'unità senza modificarla e salva i file trovati su un altro disco.",
     "s": {"windows": _s("recupero-avvia.ps1", True), "linux": _s("recupero-avvia.sh", True), "mac": _s("recupero-avvia.sh", True)}},
    {"id": "recupero_visibili", "gruppo": "recupero", "icona": "👁️", "rischio": "basso", "parametro": "piano",
     "titolo": "Rendi di nuovo visibili i file", "descrizione": "Toglie gli attributi «nascosto» e «di sistema» (per esempio messi da un virus delle chiavette). Non tocca il contenuto.",
     "s": {"windows": _s("recupero-visibili.ps1", True), "linux": _s("recupero-visibili.sh", True), "mac": _s("recupero-visibili.sh", True)}},
    {"id": "recupero_ripara", "gruppo": "recupero", "icona": "🔧", "rischio": "medio", "parametro": "piano",
     "titolo": "Ripara il file system dell'unità", "descrizione": "CHKDSK / fsck / Utility Disco. Da fare SOLO dopo aver salvato i dati: può cancellare file rovinati.",
     "s": {"windows": _s("recupero-ripara.ps1", True), "linux": _s("recupero-ripara.sh", True), "mac": _s("recupero-ripara.sh", True)}},
    # --- Antivirus: Microsoft Defender e MRT su Windows, ClamAV (Cisco Talos, GPL) su Linux e Mac ---------------
    {"id": "antivirus_aggiorna", "gruppo": "antivirus", "icona": "🔄", "rischio": "nessuno",
     "titolo": "Aggiorna l'antivirus", "descrizione": "Scarica le firme dei virus più recenti (Microsoft Defender / ClamAV).",
     "s": {"windows": _s("antivirus-aggiorna.ps1", True), "linux": _s("antivirus-aggiorna.sh", True), "mac": _s("antivirus-aggiorna.sh")}},
    {"id": "antivirus_scansione", "gruppo": "antivirus", "icona": "🛡️", "rischio": "basso", "parametro": "antivirus",
     "titolo": "Controllo antivirus", "descrizione": "Rapido, completo o delle chiavette. Su Windows le minacce vanno in quarantena (si possono ripristinare).",
     "s": {"windows": _s("antivirus-scansione.ps1", True), "linux": _s("antivirus-scansione.sh", True), "mac": _s("antivirus-scansione.sh")}},
    {"id": "antivirus_quarantena", "gruppo": "antivirus", "icona": "🔒", "rischio": "basso",
     "titolo": "Metti in quarantena i file infetti", "descrizione": "Sposta i file trovati dall'ultimo controllo in una cartella chiusa (si possono ripristinare).",
     "s": {"linux": _s("antivirus-quarantena.sh", True), "mac": _s("antivirus-quarantena.sh")}},
    {"id": "antivirus_mrt", "gruppo": "antivirus", "icona": "🧽", "rischio": "basso",
     "titolo": "Strumento di rimozione malware (MRT)", "descrizione": "Lo strumento Microsoft che cerca e rimuove i malware più diffusi. Controllo completo.",
     "s": {"windows": _s("antivirus-mrt.ps1", True)}},
    {"id": "antivirus_avvio", "gruppo": "antivirus", "icona": "🔁", "rischio": "medio", "riavvio": True,
     "titolo": "Controllo all'avvio (Microsoft Defender Offline)", "descrizione": "Il PC si riavvia SUBITO e controlla il disco prima che parta Windows (circa 15 minuti). Salvate il lavoro.",
     "s": {"windows": _s("antivirus-avvio.ps1", True)}},
    # --- Kit di emergenza su chiavetta -----------------------------------------------------------------------
    {"id": "kit_crea", "gruppo": "kit", "icona": "🚑", "rischio": "alto", "parametro": "piano",
     "titolo": "Crea la chiavetta di emergenza", "descrizione": "CANCELLA la chiavetta scelta e la prepara con SystemRescue e Neura Soccorso.",
     "s": {"windows": _s("kit-crea.ps1", True), "linux": _s("kit-crea.sh", True)}},
    {"id": "kit_ripristino_windows", "gruppo": "kit", "icona": "🪟", "rischio": "nessuno",
     "titolo": "Unità di ripristino di Windows", "descrizione": "Apre lo strumento ufficiale di Windows per creare una chiavetta di ripristino.",
     "s": {"windows": _s("kit-ripristino-windows.ps1", False, True)}},
]
PER_ID = dict((a["id"], a) for a in AZIONI)

# ------------------------------------------------------------------------------
#  Catalogo dei programmi (lista bianca per programma_installa): src/dati/programmi.json
# ------------------------------------------------------------------------------
_PROGRAMMI = {"t": 0, "d": {}}
RE_PACCHETTO = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+@/-]{0,120}$")
RE_MODELLO = re.compile(r"^[a-z0-9][a-z0-9._-]{0,60}(:[a-z0-9._-]{1,40})?$")
FONTI = ("sistema", "programmi", "driver", "firmware", "negozio")


def cartella_dati_condivisi():
    return os.environ.get("CD_SHARE_DIR") or os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def programmi():
    if _PROGRAMMI["d"] and time.time() - _PROGRAMMI["t"] < 300:
        return _PROGRAMMI["d"]
    path = os.path.join(cartella_dati_condivisi(), "web", "dati", "programmi.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, ValueError):
        d = {"programmi": []}
    _PROGRAMMI.update(t=time.time(), d=d)
    return d


def pacchetto_per(id_programma):
    """Restituisce la riga di installazione per questo sistema (es. 'winget:Mozilla.Firefox') o None."""
    for p in programmi().get("programmi", []):
        if p.get("id") == id_programma:
            v = (p.get("pacchetti") or {}).get(FAM)
            if v and ":" in v and all(RE_PACCHETTO.match(x) for x in v.split(":", 1)[1].split(" ")):
                return v
    return None


def cartella_script():
    return os.path.join(cartella_dati_condivisi(), "azioni", FAM)


def elenco(sistema=None):
    """Azioni disponibili per il sistema indicato (default: questo computer)."""
    fam = sistema or FAM
    out = []
    for a in AZIONI:
        s = a["s"].get(fam)
        if not s:
            continue
        out.append({"id": a["id"], "gruppo": a["gruppo"], "icona": a["icona"], "titolo": a["titolo"],
                    "descrizione": a["descrizione"], "rischio": a["rischio"], "admin": s["admin"], "finestra": s["finestra"],
                    "riavvio": bool(a.get("riavvio")), "parametro": a.get("parametro"), "file": s["file"]})
    return out


def componi(sistema, nome, corpo):
    """Script pronto all'uso: intestazione + funzioni comuni (_comune) + corpo dell'azione."""
    comune = ""
    try:
        with open(os.path.join(cartella_dati_condivisi(), "azioni", sistema, "_comune" + ESTENSIONE[sistema]), "r", encoding="utf-8") as f:
            comune = f.read()
    except OSError:
        pass
    if corpo.startswith("#!"):
        corpo = corpo.split("\n", 1)[1]
    if comune.startswith("#!"):
        comune = comune.split("\n", 1)[1]
    fine = "" if sistema == "windows" else "\nexit 0\n"   # bash: senza «exit 1» esplicito l'esito e' «fatto»
    return comune + "\n# ===================== " + nome + " =====================\n" + corpo.rstrip() + "\n" + fine


def testo_script(sistema, nome):
    """Legge uno script (per «Vedi lo script», stampa e salvataggio). Solo file del catalogo."""
    permessi = set()
    for a in AZIONI:
        s = a["s"].get(sistema)
        if s:
            permessi.add(s["file"])
    extra = os.path.join(cartella_dati_condivisi(), "azioni", sistema)
    for f in (os.listdir(extra) if os.path.isdir(extra) else []):
        if f.startswith("extra-"):
            permessi.add(f)
    if nome not in permessi:
        return None
    try:
        with open(os.path.join(cartella_dati_condivisi(), "azioni", sistema, nome), "r", encoding="utf-8") as f:
            corpo = f.read()
    except OSError:
        return None
    testa = ("# Consulente Digitale - script «%s» pronto all'uso\n# Ideato e sviluppato da Danilo D'Auria - Codice MIT\n" % nome)
    if sistema == "windows":
        return (testa + "# Uso: tasto destro > «Esegui con PowerShell» (come amministratore se richiesto)\n"
                "$CD_PARAM = ''\n$CD_DATI = \"$env:APPDATA\\ConsulenteDigitale\"\n$global:CD_CODICE = 0\n"
                "$ErrorActionPreference = 'Continue'\n" + componi(sistema, nome, corpo))
    return ("#!/bin/bash\n" + testa + "# Uso: bash %s   (con sudo se servono i permessi di amministratore)\n" % nome +
            "CD_PARAM=''\nCD_DATI=\"$HOME/.consulente-digitale\"\nCD_UTENTE=\"${SUDO_USER:-$USER}\"\n"
            "CD_UID=\"$(id -u \"$CD_UTENTE\")\"\n" + componi(sistema, nome, corpo))


# ------------------------------------------------------------------------------
#  Lavori
# ------------------------------------------------------------------------------
LAVORI = {}
LOCK = threading.Lock()


class Lavoro(object):
    def __init__(self, azione, titolo):
        self.id = uuid.uuid4().hex[:12]
        self.azione = azione
        self.titolo = titolo
        self.righe = []
        self.stato = "in_corso"
        self.codice = None
        self.inizio = time.time()
        self.fine = None
        self.voci = []
        self.info = {}
        self.passo = None
        self.proc = None
        self.annulla = False
        self.lock = threading.Lock()

    def scrivi(self, riga):
        riga = riga.rstrip("\r\n").replace("\x1b", "")
        riga = re.sub(r"\[[0-9;]*[A-Za-z]", "", riga)
        if riga.startswith("﻿"):
            riga = riga[1:]
        with self.lock:
            if riga.startswith("@@VOCE|"):
                p = (riga.split("|") + [""] * 7)[1:7]
                self.voci.append({"fonte": p[0], "nome": p[1], "attuale": p[2], "nuova": p[3], "id": p[4], "nota": p[5]})
                return
            if riga.startswith("@@INFO|"):
                p = riga.split("|", 2)
                if len(p) == 3:
                    self.info[p[1]] = p[2]
                return
            if riga.startswith("@@PASSO|"):
                p = riga.split("|", 3)
                if len(p) == 4:
                    self.passo = {"n": p[1], "di": p[2], "testo": p[3]}
                    self.righe.append("▶ " + p[3])
                return
            if riga.startswith("##FINE##"):
                return
            if len(self.righe) >= MAX_RIGHE:
                del self.righe[:500]
                self.righe.insert(0, "… (righe più vecchie tolte)")
            self.righe.append(riga)

    def termina(self, codice, stato=None):
        with self.lock:
            self.codice = codice
            self.stato = stato or ("fatto" if codice == 0 else "errore")
            if self.annulla:
                self.stato = "annullato"
            self.fine = time.time()

    def json(self, da=0):
        with self.lock:
            return {"id": self.id, "azione": self.azione, "titolo": self.titolo, "stato": self.stato, "codice": self.codice,
                    "righe": self.righe[da:], "totale": len(self.righe), "voci": list(self.voci), "info": dict(self.info),
                    "passo": self.passo, "secondi": round((self.fine or time.time()) - self.inizio)}


def lavoro(id_lavoro):
    with LOCK:
        return LAVORI.get(id_lavoro)


def lavori_recenti():
    with LOCK:
        return [{"id": l.id, "azione": l.azione, "titolo": l.titolo, "stato": l.stato} for l in
                sorted(LAVORI.values(), key=lambda x: -x.inizio)[:20]]


def _cartella_lavori(base):
    d = os.path.join(base, "lavori")
    os.makedirs(d, exist_ok=True)
    # pulizia dei file di lavori vecchi di oltre un giorno
    for f in os.listdir(d):
        p = os.path.join(d, f)
        try:
            if time.time() - os.path.getmtime(p) > 86400:
                os.remove(p)
        except OSError:
            pass
    return d


def _testata(fam, param, base):
    """Prime righe dello script: il parametro (gia' validato) e la cartella dei dati."""
    if fam == "windows":
        return ("$ErrorActionPreference = 'Continue'\n$ProgressPreference = 'SilentlyContinue'\n"
                "try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}\n"
                "$CD_PARAM = '%s'\n$CD_DATI = '%s'\n" % (param.replace("'", "''"), base.replace("'", "''")))
    import getpass
    try:
        utente = getpass.getuser()
    except Exception:
        utente = os.environ.get("USER", "")
    return ("#!/bin/bash\nCD_PARAM='%s'\nCD_DATI='%s'\nCD_UTENTE='%s'\nCD_UID='%s'\nCD_DESKTOP='%s'\n" % (
        param.replace("'", ""), base.replace("'", ""), re.sub(r"[^A-Za-z0-9._@-]", "", utente), os.getuid(),
        re.sub(r"[^A-Za-z0-9:_-]", "", os.environ.get("XDG_CURRENT_DESKTOP", ""))))


def valida_parametro(azione, valore):
    tipo = azione.get("parametro")
    valore = str(valore or "").strip()
    if not tipo:
        return ""
    if tipo == "programma":
        riga = pacchetto_per(valore)
        if not riga:
            raise ValueError("programma non presente nel catalogo per questo sistema")
        return riga
    if tipo == "modello":
        if not RE_MODELLO.match(valore):
            raise ValueError("nome del modello non valido")
        return valore
    if tipo == "piano":
        if not re.match(r"^[a-f0-9]{12}$", valore):
            raise ValueError("piano non valido")
        return valore
    if tipo == "antivirus":
        if valore not in ("rapida", "completa", "chiavette"):
            raise ValueError("tipo di controllo non valido")
        return valore
    if tipo == "fonti":
        scelte = [x for x in re.split(r"[ ,]+", valore) if x]
        if not scelte:
            return " ".join(FONTI)
        if any(x not in FONTI for x in scelte):
            raise ValueError("fonte di aggiornamento non valida")
        return " ".join(scelte)
    raise ValueError("parametro non previsto")


def avvia(id_azione, param, base_dati, ambiente_test=None):
    """Avvia un'azione del catalogo. Restituisce il Lavoro (gia' partito in un thread)."""
    a = PER_ID.get(id_azione)
    if not a or FAM not in a["s"]:
        raise ValueError("azione non disponibile su questo sistema")
    s = a["s"][FAM]
    valore = valida_parametro(a, param)
    origine = os.path.join(cartella_script(), s["file"])
    with open(origine, "r", encoding="utf-8") as f:
        corpo = componi(FAM, s["file"], f.read())
    cart = _cartella_lavori(base_dati)
    lav = Lavoro(id_azione, a["titolo"])
    script = os.path.join(cart, lav.id + ESTENSIONE[FAM])
    registro = os.path.join(cart, lav.id + ".log")
    testo = _testata(FAM, valore, base_dati) + corpo
    if FAM == "windows":
        # negli script PowerShell non si usa mai «exit»: l'esito va in $global:CD_CODICE (0 = tutto bene)
        testo = "$global:CD_CODICE = 0\n" + testo
        if not s["admin"]:
            testo += "\nexit [int]$global:CD_CODICE\n"
    if FAM == "windows":
        with open(script, "w", encoding="utf-8-sig", newline="\r\n") as f:   # BOM: PowerShell 5 legge bene le lettere accentate
            f.write(testo)
    else:
        with open(script, "w", encoding="utf-8", newline="\n") as f:
            f.write(testo)
        os.chmod(script, 0o700)
    with LOCK:
        LAVORI[lav.id] = lav
        for vecchio in sorted(LAVORI.values(), key=lambda x: x.inizio)[:-40]:
            LAVORI.pop(vecchio.id, None)
    t = threading.Thread(target=_esegui, args=(lav, s, script, registro, ambiente_test), daemon=True)
    t.start()
    return lav


def ferma(id_lavoro):
    l = lavoro(id_lavoro)
    if not l:
        return False
    l.annulla = True
    if l.proc and l.proc.poll() is None:
        try:
            l.proc.terminate()
        except OSError:
            pass
    return True


# ------------------------------------------------------------------------------
#  Esecuzione per sistema
# ------------------------------------------------------------------------------
def _segui_processo(lav, cmd, ambiente=None):
    """Esegue e legge l'output riga per riga."""
    try:
        lav.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                    creationflags=cd_sistema.NO_WINDOW, env=ambiente)
    except OSError as e:
        lav.scrivi("Impossibile avviare: %s" % e)
        lav.termina(127)
        return
    for raw in iter(lav.proc.stdout.readline, b""):
        lav.scrivi(raw.decode("utf-8", "replace"))
    lav.termina(lav.proc.wait())


def _segui_registro(lav, cmd, registro):
    """Per le azioni da amministratore su Windows e Mac: il processo elevato scrive in un file che seguiamo."""
    open(registro, "w").close()
    try:
        lav.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                    creationflags=cd_sistema.NO_WINDOW)
    except OSError as e:
        lav.scrivi("Impossibile avviare: %s" % e)
        lav.termina(127)
        return
    pos = 0
    resto = b""
    codice_script = None

    def leggi_nuovo():
        nonlocal pos, resto, codice_script
        try:
            with open(registro, "rb") as f:
                f.seek(pos)
                dati = f.read()
                pos += len(dati)
        except OSError:
            return
        dati = resto + dati
        righe = dati.split(b"\n")
        resto = righe.pop()
        for r in righe:
            testo = r.decode("utf-8", "replace")
            m = re.match(r"\s*##FINE##\s*(-?\d+)", testo.lstrip("﻿"))
            if m:
                codice_script = int(m.group(1))
            lav.scrivi(testo)

    while lav.proc.poll() is None:
        leggi_nuovo()
        time.sleep(0.5)
    time.sleep(0.4)
    leggi_nuovo()
    if resto:
        lav.scrivi(resto.decode("utf-8", "replace"))
    uscita = lav.proc.stdout.read().decode("utf-8", "replace").strip()
    if codice_script is None:
        if uscita:
            for r in uscita.splitlines()[-6:]:
                lav.scrivi(r)
        lav.scrivi("Permesso non concesso oppure finestra chiusa: nessuna modifica fatta.")
        lav.termina(1, "negato")
    else:
        lav.termina(codice_script)


def _terminale_linux(script):
    for t, args in (("x-terminal-emulator", ["-e"]), ("gnome-terminal", ["--"]), ("konsole", ["-e"]),
                    ("xfce4-terminal", ["-x"]), ("mate-terminal", ["-x"]), ("lxterminal", ["-e"]), ("tilix", ["-e"]),
                    ("kgx", ["--"]), ("ptyxis", ["--"]), ("alacritty", ["-e"]), ("kitty", []), ("xterm", ["-e"])):
        if shutil.which(t):
            return [t] + args + ["bash", script]
    return None


def _esegui(lav, s, script, registro, ambiente_test):
    try:
        lav.scrivi("Avvio: %s" % lav.titolo)
        if ambiente_test:   # solo nei test automatici: esecuzione diretta senza permessi
            _segui_processo(lav, ambiente_test + [script])
            return
        if FAM == "windows":
            ps = shutil.which("powershell") or "powershell"
            if s["finestra"]:
                lancio = "Start-Process -FilePath powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File \"%s\"'" % script
                _segui_processo(lav, [ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", lancio])
                if lav.stato == "fatto":
                    lav.scrivi("Finestra aperta: continua lì. Quando hai finito, chiudila.")
                return
            if s["admin"]:
                involucro = script[:-4] + "-avvio.ps1"
                with open(involucro, "w", encoding="utf-8-sig", newline="\r\n") as f:
                    f.write("$log = '%s'\n$global:CD_CODICE = 0\n"
                            "& { . '%s' } *>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value ($_ | Out-String).TrimEnd() -Encoding UTF8 }\n"
                            "Add-Content -LiteralPath $log -Value ('##FINE## ' + [int]$global:CD_CODICE) -Encoding UTF8\n"
                            % (registro.replace("'", "''"), script.replace("'", "''")))
                lancio = ("try { $p = Start-Process -FilePath powershell -Verb RunAs -WindowStyle Minimized -Wait -PassThru "
                          "-ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%s\"'; exit $p.ExitCode } catch { Write-Output $_.Exception.Message; exit 5 }"
                          % involucro)
                _segui_registro(lav, [ps, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", lancio], registro)
                return
            _segui_processo(lav, [ps, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script])
            return
        if FAM == "mac":
            if s["finestra"]:
                cmd = 'tell application "Terminal" to do script "bash \'%s\'"' % script
                _segui_processo(lav, ["osascript", "-e", cmd, "-e", 'tell application "Terminal" to activate'])
                return
            if s["admin"] and os.geteuid() != 0:
                interno = "/bin/bash '%s' >> '%s' 2>&1; echo \\\"##FINE## $?\\\" >> '%s'" % (script, registro, registro)
                cmd = 'do shell script "%s" with administrator privileges with prompt "Consulente Digitale chiede il permesso per: %s"' % (
                    interno, lav.titolo.replace('"', ""))
                _segui_registro(lav, ["osascript", "-e", cmd], registro)
                return
            _segui_processo(lav, ["/bin/bash", script])
            return
        # Linux
        if s["finestra"]:
            cmd = _terminale_linux(script)
            if not cmd:
                lav.scrivi("Nessun terminale trovato. Apri un terminale e scrivi: bash %s" % script)
                lav.termina(1)
                return
            subprocess.Popen(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
            lav.scrivi("Terminale aperto: continua lì.")
            lav.termina(0)
            return
        if s["admin"] and os.geteuid() != 0:
            if shutil.which("pkexec") and (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
                env = dict(os.environ)
                _segui_processo(lav, ["pkexec", "/bin/bash", script], env)
                if lav.codice in (126, 127):
                    lav.stato = "negato"
                    lav.scrivi("Permesso non concesso: nessuna modifica fatta.")
                return
            if shutil.which("sudo") and subprocess.call(["sudo", "-n", "true"], stdout=subprocess.DEVNULL,
                                                         stderr=subprocess.DEVNULL) == 0:
                _segui_processo(lav, ["sudo", "-n", "/bin/bash", script])
                return
            lav.scrivi("Serve la password di amministratore ma manca la finestra di richiesta (pkexec).")
            lav.scrivi("Apri un terminale e scrivi:  sudo bash %s" % script)
            lav.termina(1, "negato")
            return
        _segui_processo(lav, ["/bin/bash", script])
    except Exception as e:   # mai lasciare un lavoro «in corso» per sempre
        lav.scrivi("Errore inatteso: %s" % e)
        lav.termina(1)
