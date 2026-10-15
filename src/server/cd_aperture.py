#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulente Digitale - aperture: Neura apre programmi, impostazioni e servizi del computer.

Sicurezza: si apre SOLO una voce di questo catalogo (mai testo libero), con il token della sessione e
dopo il consenso dell'utente (pulsante «Consenti» nel banner dell'interfaccia). I comandi sono liste di
argomenti senza shell; su Windows gli indirizzi ms-settings: e i .msc si aprono con os.startfile.
Le aperture non cambiano nulla: mostrano una finestra del sistema, poi decide l'utente.

Ideato e sviluppato da Danilo D'Auria - Codice MIT, testi CC BY-NC-SA 4.0
"""
import os
import shutil
import subprocess
import sys

WINDOWS = sys.platform.startswith("win")
MAC = sys.platform == "darwin"
LINUX = not WINDOWS and not MAC


def _mac_pannello(nome):
    return [["open", "x-apple.systempreferences:" + nome]]


# id: (icona, titolo, descrizione, parole chiave, {sistema: [candidati]})  - un candidato è una lista di argomenti;
# su Windows una stringa "uri:..." o "file:..." si apre con os.startfile. Su Linux vince il primo programma presente.
CATALOGO = [
    ("impostazioni", "⚙️", "Impostazioni", "Le impostazioni del sistema", "impostazioni settings preferenze di sistema pannello",
     {"windows": ["uri:ms-settings:"], "linux": [["gnome-control-center"], ["systemsettings"], ["cinnamon-settings"], ["xfce4-settings-manager"], ["mate-control-center"], ["budgie-control-center"]],
      "mac": [["open", "-b", "com.apple.systempreferences"]]}),
    ("aggiornamenti", "⬇️", "Aggiornamenti di sistema", "La pagina degli aggiornamenti del sistema operativo", "windows update aggiornamenti di sistema aggiornamento software",
     {"windows": ["uri:ms-settings:windowsupdate"], "linux": [["update-manager"], ["mintupdate"], ["gnome-software", "--mode=updates"], ["plasma-discover", "--mode", "Update"]],
      "mac": _mac_pannello("com.apple.Software-Update-Settings.extension")}),
    ("attivita", "📊", "Gestione attività", "Programmi aperti, uso di processore e memoria", "gestione attivita task manager monitor di sistema monitoraggio attivita processi",
     {"windows": [["taskmgr.exe"]], "linux": [["gnome-system-monitor"], ["plasma-systemmonitor"], ["ksysguard"], ["xfce4-taskmanager"], ["mate-system-monitor"], ["mission-center"]],
      "mac": [["open", "-a", "Activity Monitor"]]}),
    ("dispositivi", "🧩", "Gestione dispositivi", "I componenti e i loro driver", "gestione dispositivi device manager driver periferiche",
     {"windows": ["file:devmgmt.msc"], "linux": [["hardinfo2"], ["hardinfo"]], "mac": [["open", "-a", "System Information"]]}),
    ("info_sistema", "🧾", "Informazioni di sistema", "La scheda completa del computer", "informazioni di sistema msinfo resoconto di sistema system information",
     {"windows": [["msinfo32.exe"]], "linux": [["hardinfo2"], ["hardinfo"], ["cpu-x"]], "mac": [["open", "-a", "System Information"]]}),
    ("servizi", "🔧", "Servizi", "I servizi che girano in sottofondo", "servizi services",
     {"windows": ["file:services.msc"]}),
    ("dischi", "💽", "Gestione dischi", "Dischi, partizioni e chiavette", "gestione disco dischi partizioni utility disco",
     {"windows": ["file:diskmgmt.msc"], "linux": [["gnome-disks"], ["partitionmanager"]], "mac": [["open", "-a", "Disk Utility"]]}),
    ("spazio", "🧹", "Spazio su disco", "Cosa occupa il disco e la pulizia", "pulizia disco spazio occupato analizzatore",
     {"windows": ["uri:ms-settings:storagesense"], "linux": [["baobab"], ["filelight"], ["qdirstat"]], "mac": _mac_pannello("com.apple.settings.Storage")}),
    ("rete", "📶", "Rete e Wi-Fi", "Le impostazioni della connessione", "rete wifi wi-fi internet connessione",
     {"windows": ["uri:ms-settings:network"], "linux": [["gnome-control-center", "wifi"], ["nm-connection-editor"]], "mac": _mac_pannello("com.apple.Network-Settings.extension")}),
    ("bluetooth", "🔵", "Bluetooth", "Collegare cuffie, mouse e altri dispositivi", "bluetooth cuffie auricolari",
     {"windows": ["uri:ms-settings:bluetooth"], "linux": [["gnome-control-center", "bluetooth"], ["blueman-manager"]], "mac": _mac_pannello("com.apple.BluetoothSettings")}),
    ("stampanti", "🖨️", "Stampanti e scanner", "Aggiungere o controllare una stampante", "stampanti stampante scanner",
     {"windows": ["uri:ms-settings:printers"], "linux": [["gnome-control-center", "printers"], ["system-config-printer"]], "mac": _mac_pannello("com.apple.Print-Scan-Settings.extension")}),
    ("schermo", "🖥️", "Schermo", "Risoluzione, luminosità e dimensione del testo", "schermo display monitor risoluzione luminosita",
     {"windows": ["uri:ms-settings:display"], "linux": [["gnome-control-center", "display"]], "mac": _mac_pannello("com.apple.Displays-Settings.extension")}),
    ("audio", "🔊", "Audio", "Altoparlanti, cuffie e microfono", "audio suono volume altoparlanti microfono",
     {"windows": ["uri:ms-settings:sound"], "linux": [["gnome-control-center", "sound"], ["pavucontrol"]], "mac": _mac_pannello("com.apple.Sound-Settings.extension")}),
    ("accessibilita", "♿", "Accessibilità", "Testo grande, contrasto, lente, lettura dello schermo", "accessibilita ipovedenti contrasto lente assistente vocale",
     {"windows": ["uri:ms-settings:easeofaccess"], "linux": [["gnome-control-center", "universal-access"]], "mac": _mac_pannello("com.apple.Accessibility-Settings.extension")}),
    ("lente", "🔍", "Lente d'ingrandimento", "Ingrandisce una parte dello schermo", "lente ingrandimento zoom ingrandire",
     {"windows": [["magnify.exe"]], "linux": [["kmag"]]}),
    ("tastiera_schermo", "⌨️", "Tastiera su schermo", "Una tastiera da usare con il mouse", "tastiera su schermo tastiera virtuale",
     {"windows": [["osk.exe"]], "linux": [["onboard"]]}),
    ("sicurezza", "🛡️", "Sicurezza", "Antivirus, firewall e protezione", "sicurezza antivirus defender firewall protezione",
     {"windows": ["uri:windowsdefender:"], "linux": [["gufw"], ["firewall-config"]], "mac": _mac_pannello("com.apple.settings.PrivacySecurity.extension")}),
    ("app", "📦", "App installate", "I programmi installati, per toglierli o ripararli", "app installate programmi installati disinstalla software store",
     {"windows": ["uri:ms-settings:appsfeatures"], "linux": [["gnome-software"], ["plasma-discover"], ["mintinstall"], ["pamac-manager"]], "mac": [["open", "/Applications"]]}),
    ("file", "📁", "Esplora file", "Le cartelle e i documenti", "esplora file cartelle documenti finder gestore file",
     {"windows": [["explorer.exe"]], "linux": [["xdg-open", os.path.expanduser("~")]], "mac": [["open", os.path.expanduser("~")]]}),
    ("calcolatrice", "🧮", "Calcolatrice", "La calcolatrice del sistema", "calcolatrice conti",
     {"windows": [["calc.exe"]], "linux": [["gnome-calculator"], ["kcalc"], ["galculator"], ["mate-calc"]], "mac": [["open", "-a", "Calculator"]]}),
    ("blocco_note", "📝", "Blocco note", "Un semplice editor di testo", "blocco note notepad editor di testo textedit",
     {"windows": [["notepad.exe"]], "linux": [["gnome-text-editor"], ["gedit"], ["kate"], ["xed"], ["mousepad"], ["pluma"]], "mac": [["open", "-a", "TextEdit"]]}),
    ("registro_eventi", "📜", "Registro eventi", "I messaggi di errore del sistema", "registro eventi log errori visualizzatore eventi console",
     {"windows": ["file:eventvwr.msc"], "linux": [["gnome-logs"], ["ksystemlog"]], "mac": [["open", "-a", "Console"]]}),
    ("ripristino", "🛟", "Ripristino configurazione", "Tornare a un punto di ripristino precedente", "ripristino configurazione di sistema punto di ripristino",
     {"windows": [["rstrui.exe"]], "linux": [["timeshift-launcher"], ["timeshift-gtk"]], "mac": [["open", "-a", "Time Machine"]]}),
    ("pannello", "🗂️", "Pannello di controllo", "Il vecchio pannello di controllo di Windows", "pannello di controllo control panel",
     {"windows": [["control.exe"]]}),
    ("energia", "🔋", "Energia e batteria", "Risparmio energetico e durata della batteria", "energia batteria risparmio energetico alimentazione",
     {"windows": ["uri:ms-settings:powersleep"], "linux": [["gnome-control-center", "power"]], "mac": _mac_pannello("com.apple.Battery-Settings.extension")}),
    ("data_ora", "🕰️", "Data e ora", "Fuso orario e sincronizzazione dell'orologio", "data ora orologio fuso orario",
     {"windows": ["uri:ms-settings:dateandtime"], "linux": [["gnome-control-center", "datetime"]], "mac": _mac_pannello("com.apple.Date-Time-Settings.extension")}),
]


def _fam():
    return "windows" if WINDOWS else "mac" if MAC else "linux"


def _candidato(c):
    """Primo candidato utilizzabile su questo computer, o None."""
    if isinstance(c, str):
        return c if WINDOWS else None
    if not c:
        return None
    if WINDOWS or MAC:
        return c
    return c if shutil.which(c[0]) else None


def comando(id_):
    for v in CATALOGO:
        if v[0] == id_:
            for c in v[5].get(_fam(), []):
                ok = _candidato(c)
                if ok:
                    return ok
    return None


def elenco():
    out = []
    for v in CATALOGO:
        if comando(v[0]):
            out.append({"id": v[0], "icona": v[1], "titolo": v[2], "descrizione": v[3], "parole": v[4]})
    return out


def apri(id_):
    """Apre la voce del catalogo. Solleva ValueError se la voce non esiste o non è disponibile."""
    if not isinstance(id_, str) or not any(v[0] == id_ for v in CATALOGO):
        raise ValueError("apertura sconosciuta")
    c = comando(id_)
    if not c:
        raise ValueError("non disponibile su questo computer")
    if os.environ.get("CD_APERTURE_PROVA") == "1":      # prove automatiche: non apre nulla davvero
        return {"ok": True, "prova": True, "comando": c}
    if isinstance(c, str):
        os.startfile(c.split(":", 1)[1] if c.startswith("file:") else c[4:])  # pylint: disable=no-member
        return {"ok": True}
    kw = {"stdin": subprocess.DEVNULL, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "close_fds": True}
    if WINDOWS:
        kw["creationflags"] = 0x00000008 | 0x00000200      # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    subprocess.Popen(c, **kw)
    return {"ok": True}
